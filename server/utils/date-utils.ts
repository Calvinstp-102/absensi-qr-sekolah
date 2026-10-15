// Tanggal & jam sekolah selalu WIB, tidak tergantung timezone server (Railway = UTC).
// WIB = UTC+7 tetap (Indonesia tidak memakai daylight saving), jadi cukup offset tetap.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const JAM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const NAMA_HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Konversi string 'YYYY-MM-DD' jadi Date yang representasi UTC-nya PERSIS
// tanggal itu juga — biar gak ada pergeseran hari akibat local timezone (WIB, UTC+7)
// waktu disimpan/dibaca dari kolom @db.Date.
export function toDbDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d));
}

/** Tanggal ("2026-10-15"), jam ("07:05") & hari ISO (1 = Senin ... 7 = Minggu) versi WIB. */
export function wibInfo(date: Date = new Date()) {
    const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
    const iso = shifted.toISOString();
    return {
        tanggal: iso.slice(0, 10),
        jam: iso.slice(11, 16),
        isoWeekday: shifted.getUTCDay() || 7,
    };
}

/** Tanggal hari ini (WIB), "YYYY-MM-DD". */
export function todayWibStr(now: Date = new Date()) {
    return wibInfo(now).tanggal;
}

/** Tanggal hari ini (WIB) untuk kolom @db.Date. */
export function todayDbDate(now: Date = new Date()) {
    return toDbDate(todayWibStr(now));
}

/** "HH:mm" -> { h, m }, atau null kalau formatnya salah. */
export function parseJam(value: string): { h: number; m: number } | null {
    const match = JAM_PATTERN.exec(value.trim());
    if (!match) return null;
    return { h: Number(match[1]), m: Number(match[2]) };
}

/** Waktu (Date) untuk jam "HH:mm" WIB pada tanggal "YYYY-MM-DD", ditambah N menit. */
export function wibAt(tanggal: string, jam: string, plusMenit = 0): Date {
    const parsed = parseJam(jam);
    if (!parsed) throw new Error(`Format jam tidak valid: "${jam}"`);
    const menit = parsed.h * 60 + parsed.m + plusMenit;
    return new Date(toDbDate(tanggal).getTime() + menit * 60_000 - WIB_OFFSET_MS);
}

/** Date -> "07:05" WIB. */
export function formatJamWib(date: Date) {
    return wibInfo(date).jam;
}

/** "2026-10-15" / Date @db.Date -> "Kamis, 15 Oktober 2026". */
export function formatTanggalPanjang(value: string | Date) {
    const date = typeof value === "string" ? toDbDate(value) : value;
    return date.toLocaleDateString("id-ID", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
