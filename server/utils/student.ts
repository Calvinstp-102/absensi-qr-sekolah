import type { H3Event } from "h3";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Label field unik untuk handlePrismaError. */
export const STUDENT_UNIQUE_LABELS = { nis: "NIS", nisn: "NISN" };

/** Field siswa untuk daftar (tanpa relasi). */
export const studentListSelect = {
    id: true,
    uuid: true,
    nis: true,
    nisn: true,
    nama: true,
    gender: true,
    jenjang: true,
    kelasSekarang: true,
    fotoPath: true,
    hasQr: true,
    status: true,
    statusReason: true,
} as const;

/** Ambil siswa (belum dihapus) dari parameter :uuid, atau 404. */
export async function findStudentOr404(event: H3Event) {
    const uuid = getRouterParam(event, "uuid");
    const student = uuid
        ? await prisma.student.findUnique({ where: { uuid } })
        : null;
    if (!student || student.deleted) {
        throw appError(404, "Siswa tidak ditemukan atau sudah dihapus.");
    }
    return student;
}

// --- Validasi input siswa (tambah & edit)

/** Teks opsional: di-trim, kosong -> null. */
function optionalText(label: string, max: number) {
    return z
        .string({ error: `${label} harus berupa teks.` })
        .trim()
        .max(max, `${label} maksimal ${max} karakter.`)
        .nullish()
        .transform((v) => v || null);
}

/** "YYYY-MM-DD" yang benar-benar ada di kalender -> Date (UTC, aman untuk kolom @db.Date). */
function parseTanggal(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    const valid =
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d;
    return valid ? date : null;
}

const tanggalLahirSchema = z
    .string({ error: "Tanggal lahir tidak valid." })
    .trim()
    .nullish()
    .transform((v, ctx) => {
        if (!v) return null;
        const date = parseTanggal(v);
        if (!date) {
            ctx.addIssue({ code: "custom", message: "Tanggal lahir tidak valid." });
            return z.NEVER;
        }
        if (date.getTime() > Date.now()) {
            ctx.addIssue({ code: "custom", message: "Tanggal lahir tidak boleh di masa depan." });
            return z.NEVER;
        }
        if (date.getUTCFullYear() < 1950) {
            ctx.addIssue({ code: "custom", message: "Tahun lahir minimal 1950." });
            return z.NEVER;
        }
        return date;
    });

/** Field siswa yang diisi lewat form (tambah & edit). */
export const studentFields = {
    nama: namaSchema,
    nis: z
        .string({ error: "NIS harus berupa teks." })
        .trim()
        .max(20, "NIS maksimal 20 digit.")
        .regex(/^\d*$/, "NIS hanya boleh berisi angka.")
        .nullish()
        .transform((v) => v || null),
    nisn: z
        .string({ error: "NISN wajib diisi." })
        .trim()
        .min(1, "NISN wajib diisi.")
        .regex(/^\d{10}$/, "NISN harus tepat 10 digit angka."),
    gender: z.enum(["L", "P"], { error: "Pilih jenis kelamin." }),
    tanggalLahir: tanggalLahirSchema,
    alamat: optionalText("Alamat", 255),
    jenjang: z.enum(["TK", "SD", "SMP"], { error: "Pilih jenjang." }),
    kelasSekarang: z
        .string({ error: "Pilih kelas." })
        .trim()
        .min(1, "Pilih kelas."),
    namaOrtu: optionalText("Nama orang tua/wali", 100),
    noHpOrtu: phoneSchema,
};

/** Tambahkan cek "kelas harus sesuai jenjang" ke schema objek siswa. */
export function withKelasCheck<T extends z.ZodType<{ jenjang: string; kelasSekarang: string }>>(
    schema: T,
) {
    return schema.superRefine((v, ctx) => {
        if (v.kelasSekarang && !isValidKelas(v.jenjang, v.kelasSekarang)) {
            ctx.addIssue({
                code: "custom",
                path: ["kelasSekarang"],
                message: `Kelas "${v.kelasSekarang}" tidak tersedia untuk jenjang ${v.jenjang}.`,
            });
        }
    });
}

/**
 * Pastikan NIS/NISN belum dipakai siswa lain. Siswa yang dihapus tetap menyimpan NIS/NISN-nya
 * (soft delete), jadi beri pesan khusus agar admin tidak bingung.
 */
export async function assertNisNisnAvailable(
    values: { nis: string | null; nisn: string },
    exceptId?: number,
) {
    const conditions: Prisma.StudentWhereInput[] = [{ nisn: values.nisn }];
    if (values.nis) conditions.push({ nis: values.nis });

    const existing = await prisma.student.findMany({
        where: { OR: conditions, ...(exceptId && { id: { not: exceptId } }) },
        select: { id: true, nama: true, nis: true, nisn: true, deleted: true },
    });
    if (!existing.length) return;

    const fieldErrors: Record<string, string> = {};
    for (const s of existing) {
        for (const field of ["nis", "nisn"] as const) {
            const value = values[field];
            if (!value || s[field] !== value || fieldErrors[field]) continue;
            const label = STUDENT_UNIQUE_LABELS[field];
            fieldErrors[field] = s.deleted
                ? `${label} "${value}" pernah dipakai siswa yang sudah dihapus (${s.nama}), jadi tidak bisa dipakai lagi.`
                : `${label} "${value}" sudah dipakai siswa lain (${s.nama}).`;
        }
    }
    const messages = Object.values(fieldErrors);
    logger.warn("siswa", "NIS/NISN ditolak: sudah dipakai", {
        field: Object.keys(fieldErrors),
        siswaLain: existing.map((s) => s.id),
    });
    throw appError(409, messages.length === 1 ? messages[0]! : "NIS dan NISN sudah dipakai siswa lain.", {
        fieldErrors,
    });
}

// --- QR siswa

/** Tanggal akhir masa tenggang QR lama (dari setting qr_grace_period_hari). */
export async function qrGraceUntil() {
    const days = Number(await getSettingValue("qr_grace_period_hari")) || 0;
    const until = new Date();
    until.setDate(until.getDate() + days);
    return { days, until };
}

/** QR aktif siswa (kalau ada) dipindah ke masa tenggang. Mengembalikan QR tersebut. */
export async function moveActiveQrToGrace(tx: Tx, studentId: number, until: Date) {
    const active = await tx.qrCode.findFirst({
        where: { relatedTo: "students", studentId, status: "active", deleted: false },
        select: { id: true, uuid: true },
    });
    if (active) {
        await tx.qrCode.update({
            where: { id: active.id },
            data: { status: "grace_period", gracePeriodUntil: until },
        });
    }
    return active;
}

/** Buat QR aktif baru untuk siswa dan tandai siswa punya QR. Gambar ditulis setelah commit. */
export async function issueStudentQr(
    tx: Tx,
    data: { studentId: number; token: string; generatedBy: number; reason: string },
) {
    const qr = await tx.qrCode.create({
        data: { relatedTo: "students", status: "active", ...data },
        select: { id: true, uuid: true, token: true },
    });
    await tx.student.update({ where: { id: data.studentId }, data: { hasQr: true } });
    return qr;
}

/** Semua QR aktif & masa tenggang siswa langsung kedaluwarsa (dipakai saat siswa dihapus). */
export async function expireStudentQrs(tx: Tx, studentId: number) {
    const qrs = await tx.qrCode.findMany({
        where: {
            relatedTo: "students",
            studentId,
            deleted: false,
            status: { in: ["active", "grace_period"] },
        },
        select: { id: true, uuid: true },
    });
    if (qrs.length) {
        await tx.qrCode.updateMany({
            where: { id: { in: qrs.map((q) => q.id) } },
            data: { status: "expired" },
        });
    }
    await tx.student.update({ where: { id: studentId }, data: { hasQr: false } });
    return qrs;
}

/** Tulis gambar QR; kegagalan hanya dicatat (gambar dibuat ulang otomatis saat dibuka). */
export async function saveQrImageSafe(qrUuid: string, token: string) {
    await saveQrImage(qrUuid, token).catch((e) =>
        logger.error("qr", "Gagal menyimpan gambar QR", { qrUuid }, e),
    );
}

// --- Filter daftar siswa (dipakai daftar, export QR, dan generate QR massal)

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const studentFilterShape = {
    q: z
        .string({ error: "Kata kunci tidak valid." })
        .trim()
        .max(100, "Kata kunci maksimal 100 karakter.")
        .optional(),
    jenjang: z.preprocess(
        emptyToUndefined,
        z.enum(["TK", "SD", "SMP"], { error: "Jenjang tidak dikenal." }).optional(),
    ),
    kelas: z.preprocess(
        emptyToUndefined,
        z.string({ error: "Kelas tidak valid." }).trim().max(10, "Kelas tidak valid.").optional(),
    ),
    status: z.preprocess(
        emptyToUndefined,
        z.enum(["active", "inactive"], { error: "Status harus aktif atau nonaktif." }).optional(),
    ),
    qr: z.preprocess(
        emptyToUndefined,
        z.enum(["ada", "belum"], { error: "Filter QR harus ada atau belum." }).optional(),
    ),
};

export type StudentFilter = {
    q?: string;
    jenjang?: "TK" | "SD" | "SMP";
    kelas?: string;
    status?: "active" | "inactive";
    qr?: "ada" | "belum";
};

/** Kelas hanya bisa difilter bersama jenjangnya. */
export function withFilterKelasCheck<T extends z.ZodType<StudentFilter>>(schema: T) {
    return schema.superRefine((v, ctx) => {
        if (!v.kelas) return;
        if (!v.jenjang || !isValidKelas(v.jenjang, v.kelas)) {
            ctx.addIssue({
                code: "custom",
                path: ["kelas"],
                message: "Kelas tidak sesuai jenjang yang dipilih.",
            });
        }
    });
}

export function buildStudentWhere(f: StudentFilter): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = { deleted: false };
    if (f.q) {
        where.OR = [
            { nama: { contains: f.q } },
            { nis: { contains: f.q } },
            { nisn: { contains: f.q } },
        ];
    }
    if (f.jenjang) where.jenjang = f.jenjang;
    if (f.kelas) where.kelasSekarang = f.kelas;
    if (f.status) where.status = f.status;
    if (f.qr) where.hasQr = f.qr === "ada";
    return where;
}

/** Urutan standar daftar siswa: jenjang, kelas, nama. */
export const studentOrderBy: Prisma.StudentOrderByWithRelationInput[] = [
    { jenjang: "asc" },
    { kelasSekarang: "asc" },
    { nama: "asc" },
    { id: "asc" },
];

// --- Pilihan siswa untuk aksi massal: daftar id ATAU filter daftar

export const BULK_MAX_STUDENTS = 500;

export const studentIdsSchema = z
    .array(z.number({ error: "Id siswa tidak valid." }).int().positive("Id siswa tidak valid."), {
        error: "Daftar siswa tidak valid.",
    })
    .min(1, "Pilih minimal 1 siswa.")
    .max(BULK_MAX_STUDENTS, `Maksimal ${BULK_MAX_STUDENTS} siswa sekali proses.`);

/** Where untuk aksi massal + pastikan jumlahnya tidak melebihi batas. */
export async function resolveBulkWhere(selection: { studentIds?: number[]; filter?: StudentFilter }) {
    const where = selection.studentIds
        ? { deleted: false, id: { in: [...new Set(selection.studentIds)] } }
        : buildStudentWhere(selection.filter ?? {});
    const count = await prisma.student.count({ where });
    if (count > BULK_MAX_STUDENTS) {
        throw appError(
            422,
            `Terpilih ${count} siswa. Maksimal ${BULK_MAX_STUDENTS} siswa sekali proses, persempit filter terlebih dahulu.`,
        );
    }
    return { where, count };
}
