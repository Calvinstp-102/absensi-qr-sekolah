// Kode status kehadiran harian (laporan Modul 5) — dipakai bersama oleh layar (app/), grafik, Excel & PDF (server/)

/**
 * H hadir · T terlambat · D terlambat dimaklumi · S sakit · I izin · A alpa
 * B belum hadir (hari ini) · L libur/bukan hari sekolah · "-" tidak dihitung · "?" tidak tercatat
 */
export type KodeStatus = "H" | "T" | "D" | "S" | "I" | "A" | "B" | "L" | "-" | "?";

export const KODE_STATUS_LIST: KodeStatus[] = ["H", "T", "D", "S", "I", "A", "B", "L", "-", "?"];

/** Kode yang dihitung hadir. */
export const KODE_HADIR: KodeStatus[] = ["H", "T", "D"];

/** Kode yang bisa dipakai sebagai filter laporan harian. */
export const KODE_FILTER: KodeStatus[] = ["H", "T", "D", "S", "I", "A", "B"];

export type KodeStatusInfo = {
    label: string;
    /** Kelas Tailwind badge (layar) */
    badge: string;
    /** Warna latar & teks untuk Excel/PDF/grafik (hex tanpa #) */
    bg: string;
    fg: string;
    /** Warna utama grafik */
    chart: string;
    keterangan: string;
};

export const KODE_STATUS: Record<KodeStatus, KodeStatusInfo> = {
    H: { label: "Hadir", badge: "bg-green-100 text-green-700", bg: "DCFCE7", fg: "15803D", chart: "#16a34a", keterangan: "Hadir tepat waktu" },
    T: { label: "Terlambat", badge: "bg-amber-100 text-amber-700", bg: "FEF3C7", fg: "B45309", chart: "#f59e0b", keterangan: "Hadir, terlambat" },
    D: { label: "Dimaklumi", badge: "bg-teal-100 text-teal-700", bg: "CCFBF1", fg: "0F766E", chart: "#14b8a6", keterangan: "Terlambat, dimaklumi" },
    S: { label: "Sakit", badge: "bg-sky-100 text-sky-700", bg: "E0F2FE", fg: "0369A1", chart: "#0ea5e9", keterangan: "Tidak hadir, sakit" },
    I: { label: "Izin", badge: "bg-violet-100 text-violet-700", bg: "EDE9FE", fg: "6D28D9", chart: "#8b5cf6", keterangan: "Tidak hadir, izin" },
    A: { label: "Alpa", badge: "bg-red-100 text-red-700", bg: "FEE2E2", fg: "B91C1C", chart: "#dc2626", keterangan: "Tidak hadir tanpa keterangan" },
    B: { label: "Belum hadir", badge: "bg-gray-100 text-gray-600", bg: "F3F4F6", fg: "4B5563", chart: "#9ca3af", keterangan: "Belum scan (hari ini)" },
    L: { label: "Libur", badge: "bg-slate-100 text-slate-500", bg: "E5E7EB", fg: "6B7280", chart: "#cbd5e1", keterangan: "Libur / bukan hari sekolah" },
    "-": { label: "Tidak dihitung", badge: "bg-white text-gray-300", bg: "FFFFFF", fg: "9CA3AF", chart: "#e5e7eb", keterangan: "Belum terdaftar, nonaktif, atau sistem belum dipakai" },
    "?": { label: "Tidak tercatat", badge: "bg-orange-50 text-orange-600", bg: "FFEDD5", fg: "C2410C", chart: "#fb923c", keterangan: "Hari efektif tanpa data absensi" },
};

type AbsensiStatusInput = {
    statusUtama: "hadir" | "terlambat" | "tidak_hadir";
    statusKoreksi: "dimaklumi" | "sakit" | "izin" | null;
    jamMasukAsli: Date | string | null;
};

/** Kode status dari satu baris absensi (yang tidak deleted). `hariIni` = tanggal baris = hari ini (WIB). */
export function kodeDariAbsensi(att: AbsensiStatusInput, hariIni: boolean): KodeStatus {
    if (att.statusKoreksi === "sakit") return "S";
    if (att.statusKoreksi === "izin") return "I";
    if (att.statusUtama === "hadir") return "H";
    if (att.statusUtama === "terlambat") {
        if (att.statusKoreksi === "dimaklumi") return "D";
        if (att.jamMasukAsli) return "T";
        // Ditandai Terlambat oleh cron tapi belum scan: hari ini = belum hadir, hari lalu = alpa
        return hariIni ? "B" : "A";
    }
    return "A";
}

/** Persen kehadiran 0–100 (1 desimal), null bila tidak ada hari yang dihitung. */
export function persenHadir(hadir: number, pembagi: number) {
    return pembagi > 0 ? Math.round((hadir / pembagi) * 1000) / 10 : null;
}
