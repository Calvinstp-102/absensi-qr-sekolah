// Format tanggal & jam untuk tampilan (Bahasa Indonesia, jam WIB)

const WIB = "Asia/Jakarta";

/** Kolom @db.Date ("2026-10-14T00:00:00.000Z") -> "Sel, 14 Okt 2026". Dibaca sebagai UTC agar tidak bergeser hari. */
export function formatTanggal(value: string | null | undefined, withDay = true) {
    if (!value) return "–";
    return new Date(value).toLocaleDateString("id-ID", {
        timeZone: "UTC",
        ...(withDay && { weekday: "short" }),
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Waktu (DateTime) -> "07:05" WIB. */
export function formatJam(value: string | null | undefined) {
    if (!value) return "–";
    return new Date(value).toLocaleTimeString("id-ID", { timeZone: WIB, hour: "2-digit", minute: "2-digit" });
}

/** Waktu (DateTime) -> "14 Okt 2026 07.05" WIB. */
export function formatTanggalWaktu(value: string | null | undefined) {
    if (!value) return "–";
    return new Date(value).toLocaleString("id-ID", { timeZone: WIB, dateStyle: "medium", timeStyle: "short" });
}

/** Umur dalam tahun dari tanggal lahir (@db.Date). */
export function hitungUmur(tanggalLahir: string | null | undefined) {
    if (!tanggalLahir) return null;
    const lahir = new Date(tanggalLahir);
    const now = new Date();
    let umur = now.getUTCFullYear() - lahir.getUTCFullYear();
    const belumUlangTahun =
        now.getUTCMonth() < lahir.getUTCMonth() ||
        (now.getUTCMonth() === lahir.getUTCMonth() && now.getUTCDate() < lahir.getUTCDate());
    if (belumUlangTahun) umur--;
    return umur;
}
