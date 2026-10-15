import type { H3Event } from "h3";
import { z } from "zod";
import type { Holiday, Prisma } from "../../generated/prisma/client";
import type { Jenjang } from "#shared/utils/kelas";

// Hari libur (Modul 3): validasi, cek bentrok, tampilan, dan efeknya ke absensi hari ini

type Db = Prisma.TransactionClient | typeof prisma;

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" yang benar-benar ada di kalender (bukan 2026-02-30). */
function isTanggalValid(v: string) {
    return TANGGAL_RE.test(v) && toDbDate(v).toISOString().slice(0, 10) === v;
}

function tanggalSchema(label: string) {
    return z
        .string({ error: `${label} wajib diisi.` })
        .trim()
        .min(1, `${label} wajib diisi.`)
        .refine(isTanggalValid, `${label} tidak valid.`);
}

export const holidaySchema = z
    .object({
        tanggalMulai: tanggalSchema("Tanggal mulai"),
        tanggalSelesai: tanggalSchema("Tanggal selesai"),
        keterangan: z
            .string({ error: "Keterangan wajib diisi." })
            .trim()
            .min(1, "Keterangan wajib diisi.")
            .min(3, "Keterangan minimal 3 karakter.")
            .max(150, "Keterangan maksimal 150 karakter."),
        // null / [] / semua jenjang = libur untuk semua jenjang
        jenjang: z
            .array(z.enum(["TK", "SD", "SMP"], { error: "Jenjang tidak dikenal." }), { error: "Jenjang tidak valid." })
            .nullish(),
    })
    .superRefine((v, ctx) => {
        if (!isTanggalValid(v.tanggalMulai) || !isTanggalValid(v.tanggalSelesai)) return;
        const selisih = selisihHari(v.tanggalMulai, v.tanggalSelesai);
        if (selisih < 0) {
            ctx.addIssue({ code: "custom", path: ["tanggalSelesai"], message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        } else if (selisih + 1 > LIBUR_MAKS_HARI) {
            ctx.addIssue({
                code: "custom",
                path: ["tanggalSelesai"],
                message: `Rentang libur maksimal ${LIBUR_MAKS_HARI} hari. Pecah menjadi beberapa libur bila perlu.`,
            });
        }
    });

export type HolidayInput = z.infer<typeof holidaySchema>;

/** Date @db.Date -> "YYYY-MM-DD". */
export function dbDateStr(date: Date) {
    return date.toISOString().slice(0, 10);
}

function tglPendek(tanggal: string, denganTahun: boolean) {
    return toDbDate(tanggal).toLocaleDateString("id-ID", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        ...(denganTahun ? { year: "numeric" } : {}),
    });
}

/** "15 Okt 2026" / "22 Des – 31 Des 2026" / "22 Des 2026 – 3 Jan 2027". */
export function formatRentangTanggal(mulai: string, selesai: string) {
    if (mulai === selesai) return tglPendek(mulai, true);
    const tahunSama = mulai.slice(0, 4) === selesai.slice(0, 4);
    return `${tglPendek(mulai, !tahunSama)} – ${tglPendek(selesai, true)}`;
}

export type HolidayStatus = "akan_datang" | "berlangsung" | "selesai";

export function holidayStatus(h: Pick<Holiday, "tanggalMulai" | "tanggalSelesai">, today: string): HolidayStatus {
    if (dbDateStr(h.tanggalMulai) > today) return "akan_datang";
    if (dbDateStr(h.tanggalSelesai) < today) return "selesai";
    return "berlangsung";
}

/** Libur aktif yang mencakup tanggal "YYYY-MM-DD". */
export function findHolidaysOn(tanggal: string, db: Db = prisma) {
    const date = toDbDate(tanggal);
    return db.holiday.findMany({
        where: { deleted: false, tanggalMulai: { lte: date }, tanggalSelesai: { gte: date } },
        orderBy: [{ tanggalMulai: "asc" }, { id: "asc" }],
    });
}

export async function findHolidayOr404(event: H3Event, db: Db = prisma) {
    const uuid = getRouterParam(event, "uuid");
    const holiday = uuid ? await db.holiday.findUnique({ where: { uuid } }) : null;
    if (!holiday || holiday.deleted) {
        throw appError(404, "Hari libur tidak ditemukan atau sudah dihapus.");
    }
    return holiday;
}

/** Tolak bila rentang & jenjangnya beririsan dengan libur lain yang masih aktif. */
export async function assertNoOverlap(
    db: Db,
    data: { tanggalMulai: string; tanggalSelesai: string; jenjang: string | null },
    excludeId?: number,
) {
    const candidates = await db.holiday.findMany({
        where: {
            deleted: false,
            id: excludeId ? { not: excludeId } : undefined,
            tanggalMulai: { lte: toDbDate(data.tanggalSelesai) },
            tanggalSelesai: { gte: toDbDate(data.tanggalMulai) },
        },
        orderBy: { tanggalMulai: "asc" },
    });
    const mine = parseJenjangLibur(data.jenjang);
    const bentrok = candidates.find((h) => {
        const other = parseJenjangLibur(h.jenjang);
        return !mine || !other || mine.some((j) => other.includes(j));
    });
    if (bentrok) {
        const rentang = formatRentangTanggal(dbDateStr(bentrok.tanggalMulai), dbDateStr(bentrok.tanggalSelesai));
        const jenjang = labelJenjangLibur(parseJenjangLibur(bentrok.jenjang));
        throw appError(
            409,
            `Tanggal bentrok dengan libur "${bentrok.keterangan}" (${rentang}, ${jenjang}). Ubah tanggal/jenjang, atau edit libur tersebut.`,
            { fieldErrors: { tanggalMulai: `Bentrok dengan libur "${bentrok.keterangan}" (${rentang}, ${jenjang}).` } },
        );
    }
}

export const holidayInclude = {
    createdTeacher: { select: { nama: true } },
    updatedTeacher: { select: { nama: true } },
} satisfies Prisma.HolidayInclude;

type HolidayWithTeachers = Prisma.HolidayGetPayload<{ include: typeof holidayInclude }>;

export function holidayView(h: HolidayWithTeachers, hariSekolah: number[], today: string) {
    const mulai = dbDateStr(h.tanggalMulai);
    const selesai = dbDateStr(h.tanggalSelesai);
    return {
        uuid: h.uuid,
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        rentang: formatRentangTanggal(mulai, selesai),
        keterangan: h.keterangan,
        jenjang: parseJenjangLibur(h.jenjang),
        jumlahHari: selisihHari(mulai, selesai) + 1,
        jumlahHariSekolah: hitungHariSekolah(mulai, selesai, hariSekolah),
        status: holidayStatus(h, today),
        dibuatOleh: h.createdTeacher?.nama ?? null,
        diubahOleh: h.updatedTeacher?.nama ?? null,
        dateCreated: h.dateCreated,
        dateModified: h.dateModified,
    };
}

/**
 * Hari ini menjadi libur (untuk jenjang tertentu / semua): absensi otomatis buatan cron yang belum pernah
 * di-scan dan belum dikoreksi dijadikan "belum absen" (deleted). Absensi yang sudah di-scan tidak disentuh.
 * Kalau liburnya dibatalkan di hari yang sama, cron berikutnya menghidupkannya lagi.
 */
export async function bersihkanAbsensiOtomatisHariIni(db: Db, jenjang: readonly Jenjang[] | null) {
    const { count } = await db.attendance.updateMany({
        where: {
            tanggal: todayDbDate(),
            deleted: false,
            jamMasukAsli: null,
            jamPulangAsli: null,
            statusKoreksi: null,
            ...(jenjang ? { student: { jenjang: { in: [...jenjang] } } } : {}),
        },
        data: { deleted: true },
    });
    return count;
}
