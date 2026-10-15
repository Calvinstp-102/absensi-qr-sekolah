// Aturan nilai Pengaturan & hari libur — dipakai bersama oleh halaman Pengaturan (app/) dan validasi API (server/)
import { JENJANG_LIST, type Jenjang } from "./kelas";

export type SettingSection = "identitas" | "jam" | "hari" | "scan" | "tahun_ajaran" | "qr";

export const SETTING_SECTION_LABELS: Record<SettingSection, string> = {
    identitas: "Identitas Sekolah",
    jam: "Jam & Aturan Kehadiran",
    hari: "Hari Sekolah",
    scan: "Scan",
    tahun_ajaran: "Tahun Ajaran",
    qr: "QR Code",
};

type SettingDef = {
    label: string;
    section: SettingSection;
    /** Rapikan nilai sebelum divalidasi/disimpan (trim, angka tanpa nol di depan, dll). */
    normalize: (value: string) => string;
    /** Pesan error, atau null bila valid. Nilai yang diterima sudah dinormalisasi. */
    validate: (value: string) => string | null;
};

const JAM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const trim = (v: string) => v.trim();

function teks(label: string, opts: { wajib: boolean; min?: number; max: number }): SettingDef["validate"] {
    return (v) => {
        if (!v) return opts.wajib ? `${label} wajib diisi.` : null;
        if (opts.min && v.length < opts.min) return `${label} minimal ${opts.min} karakter.`;
        if (v.length > opts.max) return `${label} maksimal ${opts.max} karakter.`;
        return null;
    };
}

function jam(label: string): Pick<SettingDef, "normalize" | "validate"> {
    return {
        normalize: trim,
        validate: (v) => (JAM_RE.test(v) ? null : `${label} harus berformat jam HH:mm, contoh 07:00.`),
    };
}

function angka(label: string, min: number, max: number, satuan: string): Pick<SettingDef, "normalize" | "validate"> {
    return {
        normalize: (v) => (/^\d+$/.test(v.trim()) ? String(Number(v.trim())) : v.trim()),
        validate: (v) => {
            if (!v) return `${label} wajib diisi.`;
            if (/^-\d+$/.test(v)) return `${label} tidak boleh negatif.`;
            if (!/^\d+$/.test(v)) return `${label} harus berupa angka bulat tanpa koma.`;
            const n = Number(v);
            if (n < min || n > max) return `${label} harus antara ${min} dan ${max} ${satuan}.`;
            return null;
        },
    };
}

export const SETTING_DEFS: Record<string, SettingDef> = {
    nama_sekolah: {
        label: "Nama sekolah",
        section: "identitas",
        normalize: trim,
        validate: teks("Nama sekolah", { wajib: true, min: 3, max: 150 }),
    },
    alamat_sekolah: {
        label: "Alamat sekolah",
        section: "identitas",
        normalize: trim,
        validate: teks("Alamat sekolah", { wajib: false, max: 255 }),
    },
    npsn: {
        label: "NPSN",
        section: "identitas",
        normalize: trim,
        validate: (v) => (v === "" || /^\d{8}$/.test(v) ? null : "NPSN harus 8 digit angka (boleh dikosongkan)."),
    },
    jam_masuk_global: { label: "Jam masuk", section: "jam", ...jam("Jam masuk") },
    toleransi_telat_menit: {
        label: "Toleransi keterlambatan",
        section: "jam",
        ...angka("Toleransi keterlambatan", 0, 180, "menit"),
    },
    tidak_hadir_delay_menit: {
        label: "Batas waktu tidak hadir",
        section: "jam",
        ...angka("Batas waktu tidak hadir", 1, 600, "menit"),
    },
    jam_pulang_tk: { label: "Jam pulang TK", section: "jam", ...jam("Jam pulang TK") },
    jam_pulang_sd: { label: "Jam pulang SD", section: "jam", ...jam("Jam pulang SD") },
    jam_pulang_smp: { label: "Jam pulang SMP", section: "jam", ...jam("Jam pulang SMP") },
    buka_absen_pulang_menit: {
        label: "Buka absen pulang",
        section: "jam",
        ...angka("Buka absen pulang", 0, 240, "menit"),
    },
    hari_sekolah: {
        label: "Hari sekolah",
        section: "hari",
        normalize: (v) => normalizeHariSekolah(v),
        validate: (v) => {
            if (!v) return "Pilih minimal 1 hari sekolah.";
            return /^[1-7](,[1-7])*$/.test(v) ? null : "Hari sekolah tidak valid.";
        },
    },
    batas_batal_scan_menit: {
        label: "Batas batal scan",
        section: "scan",
        ...angka("Batas batal scan", 0, 120, "menit"),
    },
    tahun_ajaran_aktif: {
        label: "Tahun ajaran aktif",
        section: "tahun_ajaran",
        normalize: (v) => v.replace(/\s+/g, ""),
        validate: (v) => {
            const m = /^(\d{4})\/(\d{4})$/.exec(v);
            if (!m) return "Tahun ajaran harus berformat YYYY/YYYY, contoh 2026/2027.";
            const awal = Number(m[1]);
            if (awal < 2000 || awal > 2100) return "Tahun ajaran tidak masuk akal.";
            if (Number(m[2]) !== awal + 1) return `Tahun kedua harus ${awal + 1} (satu tahun setelah ${awal}).`;
            return null;
        },
    },
    qr_grace_period_hari: {
        label: "Masa tenggang QR lama",
        section: "qr",
        ...angka("Masa tenggang QR lama", 0, 30, "hari"),
    },
};

export function isSettingKey(key: string) {
    return Object.prototype.hasOwnProperty.call(SETTING_DEFS, key);
}

export function settingKeysOf(section: SettingSection) {
    return Object.keys(SETTING_DEFS).filter((k) => SETTING_DEFS[k]!.section === section);
}

/** Hari dalam seminggu (1 = Senin ... 7 = Minggu). */
export const HARI_OPTIONS = [
    { value: 1, label: "Senin", short: "Sen" },
    { value: 2, label: "Selasa", short: "Sel" },
    { value: 3, label: "Rabu", short: "Rab" },
    { value: 4, label: "Kamis", short: "Kam" },
    { value: 5, label: "Jumat", short: "Jum" },
    { value: 6, label: "Sabtu", short: "Sab" },
    { value: 7, label: "Minggu", short: "Min" },
];

/** "5, 1,3,3" -> "1,3,5". Nilai di luar 1–7 dibuang. */
export function normalizeHariSekolah(value: string) {
    const days = value
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
    return [...new Set(days)].sort((a, b) => a - b).join(",");
}

// --- Jadwal harian (pratinjau di halaman Pengaturan & aturan antar-kolom)

function keMenit(value: string | undefined) {
    const m = value ? JAM_RE.exec(value.trim()) : null;
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function keAngka(value: string | undefined) {
    return value !== undefined && /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/** 435 -> "07:15". Di luar 00:00–23:59 tetap ditampilkan apa adanya agar kesalahan terlihat. */
export function menitKeJam(menit: number) {
    const sign = menit < 0 ? "-" : "";
    const abs = Math.abs(menit);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const PULANG_KEY: Record<Jenjang, string> = { TK: "jam_pulang_tk", SD: "jam_pulang_sd", SMP: "jam_pulang_smp" };

export type JadwalHarian = {
    masuk: number;
    batasTelat: number;
    tidakHadir: number;
    pulang: Record<Jenjang, { jam: number; buka: number } | null>;
};

/** Hitung jadwal dalam menit sejak 00:00. null bila jam masuk/toleransi/batas tidak hadir belum valid. */
export function hitungJadwal(values: Record<string, string | undefined>): JadwalHarian | null {
    const masuk = keMenit(values.jam_masuk_global);
    const toleransi = keAngka(values.toleransi_telat_menit);
    const delay = keAngka(values.tidak_hadir_delay_menit);
    if (masuk === null || toleransi === null || delay === null) return null;
    const bukaMenit = keAngka(values.buka_absen_pulang_menit);
    const pulang = {} as JadwalHarian["pulang"];
    for (const j of JENJANG_LIST) {
        const jamPulang = keMenit(values[PULANG_KEY[j]]);
        pulang[j] = jamPulang === null || bukaMenit === null ? null : { jam: jamPulang, buka: jamPulang - bukaMenit };
    }
    return { masuk, batasTelat: masuk + toleransi, tidakHadir: masuk + toleransi + delay, pulang };
}

/**
 * Aturan antar-kolom jam (nilai lengkap = nilai tersimpan + perubahan).
 * Mengembalikan { key: pesan } untuk kolom yang perlu diperbaiki.
 */
export function validateSettingRules(values: Record<string, string | undefined>): Record<string, string> {
    const errors: Record<string, string> = {};
    const jadwal = hitungJadwal(values);
    if (!jadwal) return errors;
    const batasTelat = menitKeJam(jadwal.batasTelat);

    if (jadwal.tidakHadir >= 24 * 60) {
        errors.tidak_hadir_delay_menit = "Batas Tidak Hadir melewati tengah malam. Kurangi toleransi atau batas waktu tidak hadir.";
    }

    let pulangTerawal: { jenjang: Jenjang; jam: number } | null = null;
    for (const j of JENJANG_LIST) {
        const p = jadwal.pulang[j];
        if (!p) continue;
        if (!pulangTerawal || p.jam < pulangTerawal.jam) pulangTerawal = { jenjang: j, jam: p.jam };
        if (p.buka <= jadwal.batasTelat) {
            errors[PULANG_KEY[j]] =
                `Absen pulang ${j} akan dibuka pukul ${menitKeJam(p.buka)}, padahal batas terlambat ${batasTelat}. ` +
                `Jam pulang ${j} dikurangi "Buka absen pulang" harus setelah ${batasTelat}.`;
        }
    }

    if (pulangTerawal && jadwal.tidakHadir >= pulangTerawal.jam && !errors.tidak_hadir_delay_menit) {
        errors.tidak_hadir_delay_menit =
            `Batas Tidak Hadir (${menitKeJam(jadwal.tidakHadir)}) harus sebelum jam pulang paling awal ` +
            `(${pulangTerawal.jenjang} ${menitKeJam(pulangTerawal.jam)}).`;
    }
    return errors;
}

// --- Hari libur

export const LIBUR_MAKS_HARI = 90;

/** Kolom `jenjang` libur: null/"" = semua jenjang, "SD,SMP" = jenjang tertentu (urut TK, SD, SMP). */
export function parseJenjangLibur(value: string | null | undefined): Jenjang[] | null {
    if (!value) return null;
    const list = JENJANG_LIST.filter((j) => value.split(",").map((v) => v.trim()).includes(j));
    return list.length === 0 || list.length === JENJANG_LIST.length ? null : list;
}

/** Kebalikan parseJenjangLibur: semua jenjang dipilih -> null. */
export function formatJenjangLibur(list: readonly string[] | null | undefined): string | null {
    if (!list) return null;
    const sorted = JENJANG_LIST.filter((j) => list.includes(j));
    return sorted.length === 0 || sorted.length === JENJANG_LIST.length ? null : sorted.join(",");
}

/** "Semua jenjang" / "SD & SMP". */
export function labelJenjangLibur(list: readonly string[] | null) {
    if (!list || list.length === 0) return "Semua jenjang";
    return list.length === 1 ? list[0]! : `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
}

/** Selisih hari kalender "YYYY-MM-DD" (selesai - mulai), memakai UTC agar tidak bergeser. */
export function selisihHari(mulai: string, selesai: string) {
    return Math.round((Date.parse(`${selesai}T00:00:00Z`) - Date.parse(`${mulai}T00:00:00Z`)) / 86_400_000);
}

/** Jumlah hari sekolah (menurut daftar hari 1–7) dalam rentang tanggal, termasuk ujungnya. */
export function hitungHariSekolah(mulai: string, selesai: string, hariSekolah: readonly number[]) {
    const total = selisihHari(mulai, selesai);
    if (!(total >= 0)) return 0;
    const start = Date.parse(`${mulai}T00:00:00Z`);
    let count = 0;
    for (let i = 0; i <= total; i++) {
        const weekday = new Date(start + i * 86_400_000).getUTCDay() || 7;
        if (hariSekolah.includes(weekday)) count++;
    }
    return count;
}
