// Preset periode laporan (Modul 5). Semua tanggal "YYYY-MM-DD" dihitung dari "hari ini" WIB milik server.

const geser = (t: string, hari: number) => new Date(Date.parse(`${t}T00:00:00Z`) + hari * 86_400_000).toISOString().slice(0, 10);
const minTgl = (a: string, b: string) => (a < b ? a : b);

export type PresetPeriode = { key: string; label: string; from: string; to: string };

export function buatPresetPeriode(today: string, tahunAjaran: { label: string; awal: number; akhir: number } | null): PresetPeriode[] {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7;
    const awalBulan = `${today.slice(0, 8)}01`;
    const akhirBulanLalu = geser(awalBulan, -1);
    const list: PresetPeriode[] = [
        { key: "hari_ini", label: "Hari ini", from: today, to: today },
        { key: "minggu_ini", label: "Minggu ini", from: geser(today, 1 - weekday), to: today },
        { key: "bulan_ini", label: "Bulan ini", from: awalBulan, to: today },
        { key: "bulan_lalu", label: "Bulan lalu", from: `${akhirBulanLalu.slice(0, 8)}01`, to: akhirBulanLalu },
        { key: "30_hari", label: "30 hari terakhir", from: geser(today, -29), to: today },
    ];
    if (tahunAjaran) {
        const ganjil = { from: `${tahunAjaran.awal}-07-01`, to: `${tahunAjaran.awal}-12-31` };
        const genap = { from: `${tahunAjaran.akhir}-01-01`, to: `${tahunAjaran.akhir}-06-30` };
        const sem = today >= genap.from ? { ...genap, nama: "Genap" } : { ...ganjil, nama: "Ganjil" };
        if (sem.from <= today) {
            list.push({ key: "semester", label: `Semester ${sem.nama} ${tahunAjaran.label}`, from: sem.from, to: minTgl(sem.to, today) });
        }
        const awalTa = `${tahunAjaran.awal}-07-01`;
        if (awalTa <= today) {
            list.push({ key: "tahun_ajaran", label: `Tahun ajaran ${tahunAjaran.label}`, from: awalTa, to: minTgl(`${tahunAjaran.akhir}-06-30`, today) });
        }
    }
    return list;
}

/** "2026-10-15" -> "15/10/2026" */
export function tanggalSingkat(t: string) {
    return `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}`;
}
