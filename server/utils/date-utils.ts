// Konversi string 'YYYY-MM-DD' jadi Date yang representasi UTC-nya PERSIS
// tanggal itu juga — biar gak ada pergeseran hari akibat local timezone (WIB, UTC+7)
// waktu disimpan/dibaca dari kolom @db.Date.
export function toDbDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}
