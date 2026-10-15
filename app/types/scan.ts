// Tipe data Modul Scan dari API (tanggal sudah berupa string JSON)
import type { Jenjang } from "#shared/utils/kelas";
import type { AttendanceStatus } from "./student";

export interface ScanStudent {
    id: number;
    uuid: string;
    nama: string;
    nis: string | null;
    nisn: string | null;
    jenjang: Jenjang;
    kelas: string;
    kelasLabel: string;
    fotoPath: string | null;
}

export interface CancelCheck {
    boleh: boolean;
    sampai: string | null;
    alasan: string | null;
}

export type AttendanceMethod = "qr" | "manual";

export interface TodayAttendance {
    id: number;
    uuid: string;
    tanggal: string;
    statusUtama: AttendanceStatus;
    statusKoreksi: "dimaklumi" | "sakit" | "izin" | null;
    menitTerlambat: number;
    masuk: { waktu: string; metode: AttendanceMethod | null; oleh: string | null; catatan: string | null } | null;
    pulang: {
        waktu: string;
        metode: AttendanceMethod | null;
        oleh: string | null;
        catatan: string | null;
        awal: boolean;
    } | null;
    batal: { masuk: CancelCheck; pulang: CancelCheck };
}

export type ScanJenis = "masuk" | "pulang";

/** Respons POST /api/attendance/scan & /api/attendance/manual. */
export interface ScanResponse {
    result: "masuk" | "pulang" | "sudah_tercatat";
    jenis: ScanJenis;
    message: string;
    student: ScanStudent;
    waktu: string;
    today: TodayAttendance;
    info: string | null;
}

export interface ScanPreviewResponse {
    student: ScanStudent;
    today: TodayAttendance;
    jamPulang: string;
    bukaPulang: string;
    pulangAwal: boolean;
    info: string | null;
}

export interface TodaySummary {
    totalSiswa: number;
    sudahMasuk: number;
    tepatWaktu: number;
    terlambat: number;
    belumMasuk: number;
    tidakHadir: number;
    sudahPulang: number;
    pulangAwal: number;
    dimaklumi: number;
    /** Alasan bila jenjang ini libur hari ini (Modul 3) */
    libur: string | null;
}

export interface FeedItem {
    key: string;
    jenis: ScanJenis;
    waktu: string;
    metode: AttendanceMethod | null;
    oleh: string | null;
    catatan: string | null;
    pulangAwal: boolean;
    status: AttendanceStatus;
    menitTerlambat: number;
    attendanceId: number;
    batal: CancelCheck;
    student: ScanStudent;
}

export interface TodayResponse {
    serverTime: string;
    hari: {
        tanggal: string;
        label: string;
        namaHari: string;
        isSchoolDay: boolean;
        alasan: string | null;
        /** Libur khusus jenjang hari ini (Modul 3) */
        liburJenjang: Partial<Record<Jenjang, string>>;
    };
    jadwal: {
        jamMasuk: string;
        batasTelat: string;
        tidakHadir: string;
        jamPulang: Record<Jenjang, { jamPulang: string; bukaPulang: string }>;
        batasBatalMenit: number;
        scanGandaMenit: number;
    };
    summary: Record<"total" | Jenjang, TodaySummary>;
    feed: FeedItem[];
}

export interface TodayStudentRow {
    student: ScanStudent;
    today: TodayAttendance | null;
    bukaPulang: string;
    /** Alasan bila jenjang siswa libur hari ini */
    libur: string | null;
}

export interface TodayStudentsResponse {
    data: TodayStudentRow[];
    total: number;
    page: number;
    pageSize: number;
}

/** Warna/nada kartu hasil. */
export type ScanTone = "hadir" | "terlambat" | "pulang" | "pulang_awal" | "peringatan" | "gagal";

/** Isi kartu hasil (dari respons sukses maupun error). */
export interface ScanOutcome {
    id: number;
    tone: ScanTone;
    judul: string;
    pesan: string;
    student: ScanStudent | null;
    waktu: string | null;
    jenis: ScanJenis | null;
    today: TodayAttendance | null;
    info: string | null;
}

/** Target pembatalan (dari kartu hasil / daftar aktivitas). */
export interface CancelTarget {
    attendanceId: number;
    jenis: ScanJenis;
    student: ScanStudent;
    waktu: string;
}
