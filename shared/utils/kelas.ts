// Jenjang & kelas sekolah — dipakai bersama oleh form (app/) dan validasi API (server/)

export type Jenjang = "TK" | "SD" | "SMP";

export const JENJANG_LIST: Jenjang[] = ["TK", "SD", "SMP"];

export const KELAS_BY_JENJANG: Record<Jenjang, string[]> = {
    TK: ["TK A", "TK B"],
    SD: ["1", "2", "3", "4", "5", "6"],
    SMP: ["7", "8", "9"],
};

/** Urutan kelas dari paling awal sampai kelas terakhir sebelum lulus. */
const KELAS_ORDER: { jenjang: Jenjang; kelas: string }[] = JENJANG_LIST.flatMap(
    (jenjang) => KELAS_BY_JENJANG[jenjang].map((kelas) => ({ jenjang, kelas })),
);

export function isJenjang(value: unknown): value is Jenjang {
    return typeof value === "string" && (JENJANG_LIST as string[]).includes(value);
}

export function isValidKelas(jenjang: string, kelas: string) {
    return isJenjang(jenjang) && KELAS_BY_JENJANG[jenjang].includes(kelas);
}

/** Kelas berikutnya saat naik kelas: SD 6 -> SMP 7, SMP 9 -> "lulus". null = kelas tidak dikenal. */
export function nextKelas(
    jenjang: string,
    kelas: string,
): { jenjang: Jenjang; kelas: string } | "lulus" | null {
    const i = KELAS_ORDER.findIndex((k) => k.jenjang === jenjang && k.kelas === kelas);
    if (i === -1) return null;
    return KELAS_ORDER[i + 1] ?? "lulus";
}

/** "SD · Kelas 3", "SMP · Kelas 7", "TK B". */
export function formatKelas(jenjang: string, kelas: string) {
    return jenjang === "TK" ? kelas : `${jenjang} · Kelas ${kelas}`;
}

/** Semua kelas terurut, untuk pilihan kelas asal naik kelas. */
export function allKelas() {
    return KELAS_ORDER.map((k) => ({ ...k, label: formatKelas(k.jenjang, k.kelas) }));
}
