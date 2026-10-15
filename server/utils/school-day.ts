import type { Jenjang } from "#shared/utils/kelas";

// Hari sekolah: setting hari_sekolah + tabel hari libur (Modul 3).

export type SchoolDay = {
    /** false = bukan hari sekolah atau libur untuk semua jenjang. */
    ok: boolean;
    namaHari: string;
    alasan: string | null;
    /** Libur yang hanya berlaku untuk jenjang tertentu: { SMP: "Hari ini SMP libur: …" }. */
    liburJenjang: Partial<Record<Jenjang, string>>;
};

/** "1,2,3,4,5" -> [1, 2, 3, 4, 5] (1 = Senin ... 7 = Minggu). Nilai ngawur diabaikan. */
export function parseHariSekolah(value: string): number[] {
    const days = value
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
    return [...new Set(days)].sort((a, b) => a - b);
}

/** Cek tanggal WIB "YYYY-MM-DD". `hariSekolah` boleh diisi kalau setting sudah dimuat. */
export async function isSchoolDay(tanggal: string, hariSekolah?: number[]): Promise<SchoolDay> {
    const days = hariSekolah ?? parseHariSekolah(await getSettingValue("hari_sekolah"));
    const weekday = toDbDate(tanggal).getUTCDay() || 7;
    const namaHari = NAMA_HARI[weekday]!;
    if (!days.includes(weekday)) {
        return { ok: false, namaHari, alasan: `Hari ini (${namaHari}) bukan hari sekolah.`, liburJenjang: {} };
    }

    const holidays = await findHolidaysOn(tanggal);
    const keterangan = (h: (typeof holidays)[number]) =>
        `${h.keterangan} (${formatRentangTanggal(dbDateStr(h.tanggalMulai), dbDateStr(h.tanggalSelesai))})`;

    const semua = holidays.find((h) => !parseJenjangLibur(h.jenjang));
    if (semua) {
        return { ok: false, namaHari, alasan: `Hari ini libur: ${keterangan(semua)}.`, liburJenjang: {} };
    }

    const liburJenjang: SchoolDay["liburJenjang"] = {};
    for (const h of holidays) {
        for (const j of parseJenjangLibur(h.jenjang) ?? []) {
            liburJenjang[j] ??= `Hari ini ${j} libur: ${keterangan(h)}.`;
        }
    }
    return { ok: true, namaHari, alasan: null, liburJenjang };
}
