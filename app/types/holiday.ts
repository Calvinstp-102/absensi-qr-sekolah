// Tipe data hari libur (respons /api/holidays)
import type { Jenjang } from "#shared/utils/kelas";

export type HolidayStatus = "akan_datang" | "berlangsung" | "selesai";

export interface HolidayRow {
    uuid: string;
    tanggalMulai: string; // "YYYY-MM-DD"
    tanggalSelesai: string;
    rentang: string;
    keterangan: string;
    /** null = semua jenjang */
    jenjang: Jenjang[] | null;
    jumlahHari: number;
    jumlahHariSekolah: number;
    status: HolidayStatus;
    dibuatOleh: string | null;
    diubahOleh: string | null;
    dateCreated: string;
    dateModified: string;
}

export const HOLIDAY_STATUS: Record<HolidayStatus, { label: string; badge: string }> = {
    akan_datang: { label: "Akan datang", badge: "bg-blue-50 text-blue-700" },
    berlangsung: { label: "Berlangsung", badge: "bg-amber-100 text-amber-700" },
    selesai: { label: "Selesai", badge: "bg-gray-100 text-gray-500" },
};
