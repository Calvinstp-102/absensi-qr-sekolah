// Tipe bersama halaman Dashboard & Laporan (Modul 5)
import type { KodeStatus } from "#shared/utils/attendance-status";

/** Siswa + tanggal yang akan diberi keterangan Sakit/Izin (KeteranganModal). */
export type KeteranganTarget = {
    studentUuid: string;
    nama: string;
    kelasLabel: string;
    /** "YYYY-MM-DD" */
    tanggal: string;
    kode?: KodeStatus | null;
};

/** State filter halaman Laporan (tersimpan di URL). */
export interface LaporanState {
    preset: string;
    from: string;
    to: string;
    /** "YYYY-MM" untuk tab Bulanan */
    bulan: string;
    jenjang: string;
    kelas: string;
    q: string;
    statusSiswa: "aktif" | "semua";
}

/** Periode laporan: preset (bulan_ini, …, kustom) + rentang "YYYY-MM-DD". */
export type Periode = { preset: string; from: string; to: string };
