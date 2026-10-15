// Tipe data siswa dari API (tanggal sudah berupa string JSON)
import type { Jenjang } from "#shared/utils/kelas";

export type { Jenjang };

export type StudentStatus = "active" | "inactive";
export type Gender = "L" | "P";

/** Baris dari GET /api/students. */
export interface StudentRow {
    id: number;
    uuid: string;
    nis: string | null;
    nisn: string | null;
    nama: string;
    gender: Gender;
    jenjang: Jenjang;
    kelasSekarang: string;
    fotoPath: string | null;
    hasQr: boolean;
    status: StudentStatus;
    statusReason: string | null;
}

export interface StudentListResponse {
    students: StudentRow[];
    summary: { total: number; aktif: number; nonaktif: number; belumQr: number };
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export type AttendanceStatus = "hadir" | "terlambat" | "tidak_hadir";

export interface AttendanceRow {
    id: number;
    tanggal: string;
    jamMasukAsli: string | null;
    jamPulangAsli: string | null;
    statusUtama: AttendanceStatus;
    statusKoreksi: "dimaklumi" | "sakit" | "izin" | null;
    alasanKoreksi: string | null;
    dikoreksiAt: string | null;
    teacher: { nama: string } | null;
    // Modul 2: cara & catatan absen masuk/pulang
    masukMetode: "qr" | "manual" | null;
    catatanMasuk: string | null;
    pulangMetode: "qr" | "manual" | null;
    catatanPulang: string | null;
    pulangAwal: boolean;
}

export type ClassHistoryAction = "masuk_baru" | "naik_kelas" | "pindah_kelas" | "lulus";

export interface ClassHistoryRow {
    id: number;
    kelas: string;
    tahunAjaran: string;
    action: ClassHistoryAction;
    reason: string | null;
    dateCreated: string;
    teacher: { nama: string };
}

export interface StudentDetail extends StudentRow {
    tanggalLahir: string | null;
    alamat: string | null;
    namaOrtu: string | null;
    noHpOrtu: string | null;
    statusChangedAt: string | null;
    dateCreated: string;
    classHistories: ClassHistoryRow[];
    attendances: AttendanceRow[];
}

/** Respons GET /api/students/:uuid. */
export interface StudentDetailResponse {
    student: StudentDetail;
    /** tidakHadir = alpa (tanpa keterangan); sakit/izin terpisah (Modul 5) */
    summary: { hadir: number; terlambat: number; dimaklumi: number; tidakHadir: number; sakit: number; izin: number };
    qr: { uuid: string; generatedAt: string; reason: string | null } | null;
    qrGraceCount: number;
    qrGracePeriodDays: number;
    attendanceLimit: number;
}

/** Siswa yang dilewati pada aksi massal (naik kelas / generate QR). */
export interface SkippedStudent {
    id: number;
    nama: string;
    alasan: string;
}

/** Aksi di menu titik tiga daftar siswa. */
export type StudentAction = "detail" | "edit" | "qr" | "delete";

export const CLASS_ACTION_LABELS: Record<ClassHistoryAction, string> = {
    masuk_baru: "Siswa baru masuk",
    naik_kelas: "Naik kelas",
    pindah_kelas: "Pindah kelas",
    lulus: "Lulus",
};

export const GENDER_LABELS: Record<Gender, string> = { L: "Laki-laki", P: "Perempuan" };
