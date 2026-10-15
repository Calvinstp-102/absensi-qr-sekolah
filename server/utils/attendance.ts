import type { Attendance, Prisma } from "../../generated/prisma/client";
import { ADMIN_ROLES } from "./auth";

// Aturan absensi harian (scan, absen manual, batal, panel hari ini, cron) di satu tempat.

type Tx = Prisma.TransactionClient;
type JenjangKey = "TK" | "SD" | "SMP";

/** Kartu yang sama di-scan lagi dalam N menit dianggap scan ganda (bukan absen pulang). */
export const SCAN_GANDA_MENIT = 5;

const RULE_KEYS = [
    "jam_masuk_global",
    "toleransi_telat_menit",
    "tidak_hadir_delay_menit",
    "jam_pulang_tk",
    "jam_pulang_sd",
    "jam_pulang_smp",
    "buka_absen_pulang_menit",
    "batas_batal_scan_menit",
    "hari_sekolah",
] as const;

export type ScanRules = {
    tanggal: string; // "YYYY-MM-DD" WIB
    namaHari: string;
    isSchoolDay: boolean;
    alasanLibur: string | null;
    /** Libur khusus jenjang tertentu hari ini: { SMP: "Hari ini SMP libur: …" } (Modul 3). */
    liburJenjang: Partial<Record<JenjangKey, string>>;
    jamMasuk: string;
    toleransiMenit: number;
    tidakHadirDelayMenit: number;
    jamPulang: Record<JenjangKey, string>;
    bukaPulangMenit: number;
    batasBatalMenit: number;
    masukAt: Date;
    batasTelatAt: Date; // lewat dari ini = Terlambat (cron A)
    tidakHadirAt: Date; // lewat dari ini & belum scan = Tidak Hadir (cron B)
};

function invalidSetting(key: string, value: string) {
    logger.error("pengaturan", `Setting "${key}" tidak valid`, { key, value }, new Error(`Setting ${key} tidak valid`));
    return appError(500, `Pengaturan "${key}" tidak valid. Hubungi admin untuk memperbaikinya di menu Pengaturan.`);
}

function settingJam(key: string, value: string) {
    if (!parseJam(value)) throw invalidSetting(key, value);
    return value.trim();
}

function settingMenit(key: string, value: string) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) throw invalidSetting(key, value);
    return n;
}

/** Muat semua setting absensi (1 query) dan hitung batas waktu hari ini. */
export async function loadScanRules(now: Date = new Date()): Promise<ScanRules> {
    const s = await getSettings(RULE_KEYS);
    const tanggal = todayWibStr(now);
    const jamMasuk = settingJam("jam_masuk_global", s.jam_masuk_global);
    const toleransiMenit = settingMenit("toleransi_telat_menit", s.toleransi_telat_menit);
    const tidakHadirDelayMenit = settingMenit("tidak_hadir_delay_menit", s.tidak_hadir_delay_menit);
    const day = await isSchoolDay(tanggal, parseHariSekolah(s.hari_sekolah));

    return {
        tanggal,
        namaHari: day.namaHari,
        isSchoolDay: day.ok,
        alasanLibur: day.alasan,
        liburJenjang: day.liburJenjang,
        jamMasuk,
        toleransiMenit,
        tidakHadirDelayMenit,
        jamPulang: {
            TK: settingJam("jam_pulang_tk", s.jam_pulang_tk),
            SD: settingJam("jam_pulang_sd", s.jam_pulang_sd),
            SMP: settingJam("jam_pulang_smp", s.jam_pulang_smp),
        },
        bukaPulangMenit: settingMenit("buka_absen_pulang_menit", s.buka_absen_pulang_menit),
        batasBatalMenit: settingMenit("batas_batal_scan_menit", s.batas_batal_scan_menit),
        masukAt: wibAt(tanggal, jamMasuk),
        batasTelatAt: wibAt(tanggal, jamMasuk, toleransiMenit),
        tidakHadirAt: wibAt(tanggal, jamMasuk, toleransiMenit + tidakHadirDelayMenit),
    };
}

export function jamPulangAt(jenjang: JenjangKey, rules: ScanRules) {
    return wibAt(rules.tanggal, rules.jamPulang[jenjang]);
}

/** Mulai jam berapa absen pulang jenjang ini dibuka. */
export function bukaPulangAt(jenjang: JenjangKey, rules: ScanRules) {
    return wibAt(rules.tanggal, rules.jamPulang[jenjang], -rules.bukaPulangMenit);
}

/** Status absen masuk berdasarkan waktu scan. Terlambat dihitung dari jam masuk. */
export function hitungStatusMasuk(waktu: Date, rules: ScanRules) {
    const terlambat = waktu.getTime() > rules.batasTelatAt.getTime();
    return {
        status: (terlambat ? "terlambat" : "hadir") as "hadir" | "terlambat",
        menitTerlambat: terlambat ? Math.floor((waktu.getTime() - rules.masukAt.getTime()) / 60_000) : 0,
    };
}

/** Menit terlambat absensi hari ini (0 kalau tepat waktu / belum masuk). */
export function menitTerlambat(att: Pick<Attendance, "jamMasukAsli" | "statusUtama">, rules: ScanRules) {
    if (!att.jamMasukAsli || att.statusUtama !== "terlambat") return 0;
    return Math.max(0, Math.floor((att.jamMasukAsli.getTime() - rules.masukAt.getTime()) / 60_000));
}

// --- Tampilan siswa & absensi

export const scanStudentSelect = {
    id: true,
    uuid: true,
    nama: true,
    nis: true,
    nisn: true,
    gender: true,
    jenjang: true,
    kelasSekarang: true,
    fotoPath: true,
    status: true,
    statusReason: true,
    statusChangedAt: true,
    deleted: true,
} as const satisfies Prisma.StudentSelect;

export type ScanStudent = Prisma.StudentGetPayload<{ select: typeof scanStudentSelect }>;

export function studentView(s: ScanStudent) {
    return {
        id: s.id,
        uuid: s.uuid,
        nama: s.nama,
        nis: s.nis,
        nisn: s.nisn,
        jenjang: s.jenjang,
        kelas: s.kelasSekarang,
        kelasLabel: formatKelas(s.jenjang, s.kelasSekarang),
        fotoPath: s.fotoPath,
    };
}

export const attendanceViewInclude = {
    masukTeacher: { select: { nama: true } },
    pulangTeacher: { select: { nama: true } },
} as const satisfies Prisma.AttendanceInclude;

export type AttendanceWithTeachers = Prisma.AttendanceGetPayload<{ include: typeof attendanceViewInclude }>;

type Viewer = { id: number; role: string };
export type CancelCheck = { boleh: boolean; sampai: Date | null; alasan: string | null };

const tolak = (alasan: string): CancelCheck => ({ boleh: false, sampai: null, alasan });

/** Boleh tidaknya `user` membatalkan absen masuk/pulang ini sekarang. */
export function cekBatal(
    att: Attendance,
    jenis: "masuk" | "pulang",
    user: Viewer,
    rules: ScanRules,
    now: Date = new Date(),
): CancelCheck {
    if (att.deleted) return tolak("Data absensi tidak ditemukan.");
    if (att.tanggal.toISOString().slice(0, 10) !== rules.tanggal) {
        return tolak("Hanya absensi hari ini yang dapat dibatalkan.");
    }
    const waktu = jenis === "masuk" ? att.jamMasukAsli : att.jamPulangAsli;
    const oleh = jenis === "masuk" ? att.masukOleh : att.pulangOleh;
    if (!waktu) return tolak(jenis === "masuk" ? "Belum ada absen masuk." : "Belum ada absen pulang.");
    if (jenis === "masuk") {
        if (att.jamPulangAsli) return tolak("Batalkan absen pulang terlebih dahulu.");
        if (att.statusKoreksi) return tolak("Absensi sudah dikoreksi, tidak dapat dibatalkan.");
    }
    if ((ADMIN_ROLES as string[]).includes(user.role)) return { boleh: true, sampai: null, alasan: null };
    if (oleh !== user.id) {
        return tolak("Hanya guru yang mencatat atau Admin yang dapat membatalkan.");
    }
    const sampai = new Date(waktu.getTime() + rules.batasBatalMenit * 60_000);
    if (now.getTime() > sampai.getTime()) {
        return tolak(`Batas ${rules.batasBatalMenit} menit sudah lewat. Minta Admin untuk membatalkan.`);
    }
    return { boleh: true, sampai, alasan: null };
}

/** Bentuk standar absensi untuk respons API (scan, manual, batal, panel hari ini). */
export function attendanceView(att: AttendanceWithTeachers, user: Viewer, rules: ScanRules, now: Date = new Date()) {
    return {
        id: att.id,
        uuid: att.uuid,
        tanggal: att.tanggal,
        statusUtama: att.statusUtama,
        statusKoreksi: att.statusKoreksi,
        menitTerlambat: menitTerlambat(att, rules),
        masuk: att.jamMasukAsli
            ? {
                  waktu: att.jamMasukAsli,
                  metode: att.masukMetode,
                  oleh: att.masukTeacher?.nama ?? null,
                  catatan: att.catatanMasuk,
              }
            : null,
        pulang: att.jamPulangAsli
            ? {
                  waktu: att.jamPulangAsli,
                  metode: att.pulangMetode,
                  oleh: att.pulangTeacher?.nama ?? null,
                  catatan: att.catatanPulang,
                  awal: att.pulangAwal,
              }
            : null,
        batal: {
            masuk: cekBatal(att, "masuk", user, rules, now),
            pulang: cekBatal(att, "pulang", user, rules, now),
        },
    };
}

// --- Keputusan scan

export type ScanMode = "otomatis" | "pulang_awal";

export type ScanDecision =
    | { aksi: "masuk" }
    | { aksi: "pulang"; pulangAwal: boolean; info: string | null }
    | { aksi: "sudah_tercatat"; jenis: "masuk" | "pulang" };

const JENJANG_LABEL: Record<JenjangKey, string> = { TK: "TK", SD: "SD", SMP: "SMP" };

/**
 * Tentukan apa yang terjadi saat siswa scan. `existing` = absensi hari ini (boleh null / deleted).
 * Penolakan dilempar sebagai appError dengan `extra` (mis. data siswa untuk kartu hasil).
 */
export function tentukanAksiScan(
    existing: Attendance | null,
    student: { nama: string; jenjang: JenjangKey },
    mode: ScanMode,
    rules: ScanRules,
    now: Date,
    extra: Record<string, unknown> = {},
): ScanDecision {
    const att = existing && !existing.deleted ? existing : null;
    const masuk = att?.jamMasukAsli ?? null;
    const pulang = att?.jamPulangAsli ?? null;
    const bukaPulang = bukaPulangAt(student.jenjang, rules);
    const baruSaja = (waktu: Date) => now.getTime() - waktu.getTime() < SCAN_GANDA_MENIT * 60_000;

    if (masuk && pulang) {
        if (mode === "otomatis" && baruSaja(pulang)) return { aksi: "sudah_tercatat", jenis: "pulang" };
        throw appError(
            409,
            `${student.nama} sudah absen lengkap hari ini (masuk ${formatJamWib(masuk)}, pulang ${formatJamWib(pulang)}).`,
            { code: "ALREADY_COMPLETE", ...extra },
        );
    }

    if (mode === "pulang_awal") {
        if (!masuk) {
            throw appError(
                409,
                `${student.nama} belum absen masuk hari ini. Izin pulang awal hanya untuk siswa yang sudah masuk.`,
                { code: "BELUM_MASUK", ...extra },
            );
        }
        const sudahDibuka = now.getTime() >= bukaPulang.getTime();
        return {
            aksi: "pulang",
            pulangAwal: !sudahDibuka,
            info: sudahDibuka ? "Absen pulang sudah dibuka, dicatat sebagai pulang biasa." : null,
        };
    }

    if (!masuk) return { aksi: "masuk" };
    if (baruSaja(masuk)) return { aksi: "sudah_tercatat", jenis: "masuk" };
    if (now.getTime() < bukaPulang.getTime()) {
        throw appError(
            409,
            `${student.nama} sudah absen masuk pukul ${formatJamWib(masuk)}. Absen pulang ${JENJANG_LABEL[student.jenjang]} dibuka mulai ${formatJamWib(bukaPulang)}. Untuk pulang lebih awal gunakan mode Izin Pulang Awal.`,
            { code: "PULANG_BELUM_DIBUKA", bukaPulang, ...extra },
        );
    }
    return { aksi: "pulang", pulangAwal: false, info: null };
}

// --- Penulisan absensi (dipanggil di dalam transaksi)

/** Dilempar bila data berubah oleh request lain di saat yang sama -> seluruh proses diulang. */
export class ScanConflict extends Error {}

/** Jalankan ulang `fn` (maks 3x) bila bentrok dengan scan lain di saat yang sama. */
export async function withScanRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fn();
        } catch (e) {
            const bentrok = e instanceof ScanConflict || (e as { code?: string })?.code === "P2002";
            if (!bentrok || attempt >= 3) throw e;
        }
    }
}

export type Pencatat = {
    olehId: number;
    metode: "qr" | "manual";
    catatan: string | null;
    deviceInfo?: string | null;
};

export async function catatMasuk(
    tx: Tx,
    existing: Attendance | null,
    studentId: number,
    now: Date,
    rules: ScanRules,
    p: Pencatat,
) {
    const data = {
        jamMasukAsli: now,
        statusUtama: hitungStatusMasuk(now, rules).status,
        masukMetode: p.metode,
        masukOleh: p.olehId,
        catatanMasuk: p.catatan,
        deviceInfo: p.deviceInfo?.slice(0, 190) ?? null,
    };

    if (!existing) {
        // P2002 (scan lain lebih dulu membuat baris) -> diulang oleh withScanRetry
        return tx.attendance.create({
            data: { studentId, tanggal: toDbDate(rules.tanggal), ...data },
            include: attendanceViewInclude,
        });
    }

    const res = existing.deleted
        ? // Baris yang dibatalkan dihidupkan lagi dari awal
          await tx.attendance.updateMany({
              where: { id: existing.id, deleted: true },
              data: {
                  ...data,
                  deleted: false,
                  jamPulangAsli: null,
                  pulangMetode: null,
                  pulangOleh: null,
                  catatanPulang: null,
                  pulangAwal: false,
                  statusKoreksi: null,
                  alasanKoreksi: null,
                  dikoreksiOleh: null,
                  dikoreksiAt: null,
              },
          })
        : // Baris dari cron (Terlambat / Tidak Hadir tanpa jam masuk) -> isi jam masuk aslinya.
          // Keterangan Sakit/Izin gugur karena siswa ternyata hadir (Modul 5).
          await tx.attendance.updateMany({
              where: { id: existing.id, deleted: false, jamMasukAsli: null },
              data:
                  existing.statusKoreksi === "sakit" || existing.statusKoreksi === "izin"
                      ? { ...data, statusKoreksi: null, alasanKoreksi: null, dikoreksiOleh: null, dikoreksiAt: null }
                      : data,
          });
    if (!res.count) throw new ScanConflict();
    return tx.attendance.findUniqueOrThrow({ where: { id: existing.id }, include: attendanceViewInclude });
}

export async function catatPulang(tx: Tx, existing: Attendance, now: Date, pulangAwal: boolean, p: Pencatat) {
    const res = await tx.attendance.updateMany({
        where: { id: existing.id, deleted: false, jamMasukAsli: { not: null }, jamPulangAsli: null },
        data: {
            jamPulangAsli: now,
            pulangMetode: p.metode,
            pulangOleh: p.olehId,
            catatanPulang: p.catatan,
            pulangAwal,
        },
    });
    if (!res.count) throw new ScanConflict();
    return tx.attendance.findUniqueOrThrow({ where: { id: existing.id }, include: attendanceViewInclude });
}

/** Absensi hari ini milik siswa (termasuk yang deleted, karena unique per siswa per tanggal). */
export function findTodayAttendance(tx: Tx, studentId: number, rules: ScanRules) {
    return tx.attendance.findUnique({
        where: { studentId_tanggal: { studentId, tanggal: toDbDate(rules.tanggal) } },
    });
}

const PENOLAKAN: Record<string, string> = {
    ALREADY_COMPLETE: "sudah absen lengkap",
    ALREADY_RECORDED: "sudah tercatat",
    PULANG_BELUM_DIBUKA: "absen pulang belum dibuka",
    BELUM_MASUK: "belum absen masuk",
};

/** Catat penolakan aturan bisnis (warn) lalu lempar ulang error-nya. */
export function logPenolakan(scope: string, label: string, ctx: Record<string, unknown>) {
    return (e: unknown): never => {
        const code = (e as { data?: { code?: string } })?.data?.code;
        if (code && PENOLAKAN[code]) logger.warn(scope, `${label} ditolak: ${PENOLAKAN[code]}`, ctx);
        throw e;
    };
}

/** Tolak bila hari ini bukan hari sekolah. */
export function assertSchoolDay(rules: ScanRules, ctx: Record<string, unknown>) {
    if (rules.isSchoolDay) return;
    logger.warn("scan", "Absensi ditolak: bukan hari sekolah", { ...ctx, tanggal: rules.tanggal });
    throw appError(409, rules.alasanLibur ?? "Hari ini bukan hari sekolah.", { code: "NOT_SCHOOL_DAY" });
}

/** Daftar jenjang yang libur hari ini (untuk filter cron & panel). */
export function jenjangLibur(rules: ScanRules) {
    return Object.keys(rules.liburJenjang) as JenjangKey[];
}

/** Tolak bila jenjang siswa sedang libur hari ini (libur khusus jenjang). */
export function assertJenjangMasuk(
    rules: ScanRules,
    jenjang: JenjangKey,
    ctx: Record<string, unknown>,
    extra: Record<string, unknown> = {},
) {
    const alasan = rules.liburJenjang[jenjang];
    if (!alasan) return;
    logger.warn("scan", "Absensi ditolak: jenjang sedang libur", { ...ctx, jenjang, tanggal: rules.tanggal });
    throw appError(409, alasan, { ...extra, code: "NOT_SCHOOL_DAY" });
}
