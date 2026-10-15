import type { H3Event } from "h3";
import { z } from "zod";
import type { AuditLog, Prisma } from "../../generated/prisma/client";
import type { KategoriAudit } from "#shared/utils/audit-labels";
import type { SettingSection } from "#shared/utils/setting-rules";

// Log Aktivitas (Modul 7): pencatatan aktivitas akun, filter, dan tampilan audit log.

// --- Aktivitas akun (login/logout/gagal/dikunci/ditolak)

/** "Chrome · Windows" dari User-Agent (cukup untuk dikenali, bukan untuk deteksi presisi). */
export function ringkasPerangkat(ua: string | undefined | null) {
    if (!ua) return "Tidak diketahui";
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /OPR\/|Opera/.test(ua)
          ? "Opera"
          : /SamsungBrowser/.test(ua)
            ? "Samsung Internet"
            : /Firefox\//.test(ua)
              ? "Firefox"
              : /Chrome\//.test(ua)
                ? "Chrome"
                : /Safari\//.test(ua)
                  ? "Safari"
                  : /curl\//i.test(ua)
                    ? "curl"
                    : "Browser lain";
    const os = /Windows/.test(ua)
        ? "Windows"
        : /Android/.test(ua)
          ? "Android"
          : /iPhone|iPad|iOS/.test(ua)
            ? "iOS"
            : /Mac OS X|Macintosh/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : "";
    return os ? `${browser} · ${os}` : browser;
}

/**
 * Catat aktivitas akun ke Log Aktivitas. Tidak pernah melempar error (login/logout tetap jalan
 * walau pencatatan gagal). Hanya untuk akun yang terdaftar.
 */
export async function catatAktivitasAkun(
    event: H3Event,
    teacherId: number,
    actionType: "login" | "logout" | "login_gagal" | "login_dikunci" | "login_ditolak",
    detail: Record<string, string | number | boolean | null> = {},
    reason?: string,
) {
    try {
        await prisma.auditLog.create({
            data: {
                teacherId,
                actionType,
                entityType: "teacher",
                entityId: teacherId,
                afterValue: {
                    ...detail,
                    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
                    perangkat: ringkasPerangkat(getRequestHeader(event, "user-agent")),
                },
                reason: reason ?? null,
            },
        });
    } catch (e) {
        logger.error("audit", "Gagal mencatat aktivitas akun", { teacherId, actionType }, e);
    }
}

// --- Filter Log Aktivitas

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;
const kosong = (v: unknown) => (v === "" || v === null ? undefined : v);
const tanggal = (label: string) =>
    z.preprocess(
        kosong,
        z
            .string({ error: `${label} tidak valid.` })
            .refine((v) => TANGGAL_RE.test(v) && toDbDate(v).toISOString().slice(0, 10) === v, `${label} tidak valid.`)
            .optional(),
    );

const KATEGORI = ["siswa", "qr", "absensi", "pengaturan", "guru", "akun"] as const;

export const auditFilterShape = {
    from: tanggal("Tanggal awal"),
    to: tanggal("Tanggal akhir"),
    kategori: z.preprocess(kosong, z.enum(KATEGORI, { error: "Kategori tidak dikenal." }).optional()),
    aksi: z.preprocess(
        kosong,
        z
            .string({ error: "Aktivitas tidak dikenal." })
            .refine((v) => v in AKSI_AUDIT, "Aktivitas tidak dikenal.")
            .optional(),
    ),
    guru: z.preprocess(kosong, z.string({ error: "Guru tidak valid." }).max(50, "Guru tidak valid.").optional()),
    q: z.preprocess(kosong, z.string({ error: "Kata kunci tidak valid." }).trim().max(100, "Kata kunci maksimal 100 karakter.").optional()),
};

export type AuditFilter = {
    from: string;
    to: string;
    kategori?: KategoriAudit;
    aksi?: string;
    guru?: string;
    q?: string;
};

/** Baca filter (default 30 hari terakhir, maks 366 hari). */
export function parseAuditQuery<S extends z.ZodRawShape>(event: H3Event, extra: S) {
    const q = parseQuery(event, z.object({ ...auditFilterShape, ...extra })) as Record<string, unknown> & Partial<AuditFilter>;
    const today = todayWibStr();
    const to = q.to && q.to < today ? q.to : today;
    const from = q.from ?? new Date(toDbDate(today).getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
    const tolak = (field: string, msg: string): never => {
        throw appError(422, msg, { code: "VALIDATION_ERROR", fieldErrors: { [field]: msg } });
    };
    if (from > to) tolak("from", "Tanggal awal tidak boleh setelah tanggal akhir.");
    if (selisihHari(from, to) + 1 > 366) tolak("to", "Periode log maksimal 366 hari.");
    if (q.aksi && q.kategori && AKSI_AUDIT[q.aksi]?.kategori !== q.kategori) tolak("aksi", "Aktivitas tidak termasuk kategori yang dipilih.");
    return { ...q, from, to } as typeof q & AuditFilter;
}

/** Where audit log sesuai filter. `tanpaJenis` = abaikan kategori/aksi (untuk ringkasan per kategori). */
export async function auditWhere(f: AuditFilter, opts: { tanpaJenis?: boolean } = {}): Promise<Prisma.AuditLogWhereInput> {
    const and: Prisma.AuditLogWhereInput[] = [{ deleted: false, dateCreated: rentangWaktuWib(f.from, f.to) }];
    if (!opts.tanpaJenis) {
        if (f.aksi) and.push({ actionType: f.aksi });
        else if (f.kategori) and.push({ actionType: { in: Object.keys(AKSI_AUDIT).filter((k) => AKSI_AUDIT[k]!.kategori === f.kategori) } });
    }
    if (f.guru) and.push({ teacher: { uuid: f.guru } });
    if (f.q) {
        // Cari di alasan, nama guru pelaku, atau nama siswa/guru yang diubah
        const [siswa, guru] = await Promise.all([
            prisma.student.findMany({ where: { nama: { contains: f.q } }, select: { id: true }, take: 500 }),
            prisma.teacher.findMany({ where: { nama: { contains: f.q } }, select: { id: true }, take: 200 }),
        ]);
        const siswaIds = siswa.map((s) => s.id);
        const absensi = siswaIds.length
            ? await prisma.attendance.findMany({
                  where: { studentId: { in: siswaIds }, tanggal: { gte: toDbDate(f.from), lte: toDbDate(f.to) } },
                  select: { id: true },
                  take: 20_000,
              })
            : [];
        and.push({
            OR: [
                { reason: { contains: f.q } },
                { teacher: { nama: { contains: f.q } } },
                ...(siswaIds.length ? [{ entityType: "student", entityId: { in: siswaIds } }] : []),
                ...(guru.length ? [{ entityType: "teacher", entityId: { in: guru.map((g) => g.id) } }] : []),
                ...(absensi.length ? [{ entityType: "attendance", entityId: { in: absensi.map((a) => a.id) } }] : []),
            ],
        });
    }
    return { AND: and };
}

export const auditInclude = {
    teacher: { select: { uuid: true, nama: true, role: true, fotoPath: true, deleted: true } },
} satisfies Prisma.AuditLogInclude;

type AuditRow = AuditLog & Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>;

export type TargetAudit = { jenis: string; label: string; sub: string | null; link: string | null };

/** Tampilan audit log + target yang diubah (di-resolve sekaligus per jenis entitas). */
export async function auditView(rows: AuditRow[]) {
    const ids = (type: string) => [...new Set(rows.filter((r) => r.entityType === type).map((r) => r.entityId))];
    const [students, teachers, attendances, holidays] = await Promise.all([
        ids("student").length
            ? prisma.student.findMany({
                  where: { id: { in: ids("student") } },
                  select: { id: true, uuid: true, nama: true, jenjang: true, kelasSekarang: true, deleted: true },
              })
            : [],
        ids("teacher").length
            ? prisma.teacher.findMany({ where: { id: { in: ids("teacher") } }, select: { id: true, nama: true, email: true, deleted: true } })
            : [],
        ids("attendance").length
            ? prisma.attendance.findMany({
                  where: { id: { in: ids("attendance") } },
                  select: { id: true, tanggal: true, student: { select: { uuid: true, nama: true, jenjang: true, kelasSekarang: true, deleted: true } } },
              })
            : [],
        ids("holiday").length
            ? prisma.holiday.findMany({ where: { id: { in: ids("holiday") } }, select: { id: true, keterangan: true, tanggalMulai: true, tanggalSelesai: true } })
            : [],
    ]);
    const sMap = new Map(students.map((s) => [s.id, s]));
    const tMap = new Map(teachers.map((t) => [t.id, t]));
    const aMap = new Map(attendances.map((a) => [a.id, a]));
    const hMap = new Map(holidays.map((h) => [h.id, h]));
    const dihapus = (nama: string, deleted: boolean) => (deleted ? `${nama} (dihapus)` : nama);

    function target(r: AuditRow): TargetAudit | null {
        switch (r.entityType) {
            case "student": {
                const s = sMap.get(r.entityId);
                if (!s) return null;
                return {
                    jenis: "Siswa",
                    label: dihapus(s.nama, s.deleted),
                    sub: formatKelas(s.jenjang, s.kelasSekarang),
                    link: s.deleted ? null : `/siswa/${s.uuid}`,
                };
            }
            case "teacher": {
                const t = tMap.get(r.entityId);
                if (!t) return null;
                return { jenis: "Guru", label: dihapus(t.nama, t.deleted), sub: t.email, link: t.deleted ? null : `/guru?q=${encodeURIComponent(t.email)}` };
            }
            case "attendance": {
                const a = aMap.get(r.entityId);
                if (!a) return null;
                return {
                    jenis: "Absensi",
                    label: dihapus(a.student.nama, a.student.deleted),
                    sub: `${formatKelas(a.student.jenjang, a.student.kelasSekarang)} · ${formatTanggalPanjang(dbDateStr(a.tanggal))}`,
                    link: a.student.deleted ? null : `/siswa/${a.student.uuid}`,
                };
            }
            case "holiday": {
                const h = hMap.get(r.entityId);
                if (!h) return null;
                return {
                    jenis: "Hari libur",
                    label: h.keterangan,
                    sub: formatRentangTanggal(dbDateStr(h.tanggalMulai), dbDateStr(h.tanggalSelesai)),
                    link: "/pengaturan",
                };
            }
            case "settings": {
                const keys = Object.keys((r.afterValue ?? r.beforeValue ?? {}) as object);
                const seksi = [...new Set(keys.map((k) => SETTING_DEFS[k]?.section).filter(Boolean))] as SettingSection[];
                return {
                    jenis: "Pengaturan",
                    label: seksi.length ? seksi.map((s) => SETTING_SECTION_LABELS[s]).join(", ") : "Pengaturan",
                    sub: null,
                    link: "/pengaturan",
                };
            }
            default:
                return null;
        }
    }

    return rows.map((r) => {
        const info = infoAksi(r.actionType);
        const after = (r.afterValue ?? {}) as Record<string, unknown>;
        const perubahan = daftarPerubahan(r.beforeValue, r.afterValue);
        return {
            id: r.id,
            uuid: r.uuid,
            waktu: r.dateCreated,
            aksi: r.actionType,
            label: info.label,
            kategori: info.kategori,
            tone: info.tone ?? "normal",
            guru: {
                uuid: r.teacher.uuid,
                nama: r.teacher.deleted ? `${r.teacher.nama} (dihapus)` : r.teacher.nama,
                role: r.teacher.role,
                fotoPath: r.teacher.fotoPath,
            },
            // Aktivitas akun: datanya = akun pelaku sendiri, sudah tampil di "Oleh"
            target: info.kategori === "akun" ? null : target(r),
            perubahan,
            ringkasan: ringkasPerubahan(perubahan),
            alasan: r.reason,
            akun:
                info.kategori === "akun"
                    ? { ip: (after.ip as string | null) ?? null, perangkat: (after.perangkat as string | null) ?? null }
                    : null,
        };
    });
}

export type AuditViewRow = Awaited<ReturnType<typeof auditView>>[number];

/** Ringkasan untuk kartu: total, per kategori, 5 guru paling aktif (mengikuti filter kecuali kategori/aksi). */
export async function auditRingkasan(f: AuditFilter) {
    const where = await auditWhere(f, { tanpaJenis: true });
    const [perAksi, perGuru] = await Promise.all([
        prisma.auditLog.groupBy({ by: ["actionType"], where, _count: { _all: true } }),
        prisma.auditLog.groupBy({ by: ["teacherId"], where, _count: { _all: true }, orderBy: { _count: { teacherId: "desc" } }, take: 5 }),
    ]);
    const perKategori: Record<string, number> = {};
    let total = 0;
    for (const a of perAksi) {
        const k = infoAksi(a.actionType).kategori;
        perKategori[k] = (perKategori[k] ?? 0) + a._count._all;
        total += a._count._all;
    }
    const guru = perGuru.length
        ? await prisma.teacher.findMany({ where: { id: { in: perGuru.map((g) => g.teacherId) } }, select: { id: true, uuid: true, nama: true } })
        : [];
    const gMap = new Map(guru.map((g) => [g.id, g]));
    return {
        total,
        perKategori,
        guruTeraktif: perGuru.map((g) => ({ ...gMap.get(g.teacherId)!, jumlah: g._count._all })).filter((g) => g.uuid),
    };
}
