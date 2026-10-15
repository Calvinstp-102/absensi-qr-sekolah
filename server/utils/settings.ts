// Nilai default untuk setting yang ditambahkan belakangan (dipakai bila baris di DB belum ada)
export const SETTING_DEFAULTS: Record<string, string> = {
    hari_sekolah: "1,2,3,4,5",
    buka_absen_pulang_menit: "30",
    batas_batal_scan_menit: "10",
};

function missingSetting(key: string) {
    return createError({
        statusCode: 500,
        statusMessage: `Setting "${key}" belum diisi di database`,
    });
}

export async function getSettingValue(key: string): Promise<string> {
    const setting = await prisma.settings.findUnique({ where: { key } });
    const value = setting?.value ?? SETTING_DEFAULTS[key];
    if (value === undefined) throw missingSetting(key);
    return value;
}

/** Beberapa setting sekaligus dalam 1 query. */
export async function getSettings<K extends string>(keys: readonly K[]): Promise<Record<K, string>> {
    const rows = await prisma.settings.findMany({
        where: { key: { in: [...keys] } },
        select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const result = {} as Record<K, string>;
    for (const key of keys) {
        const value = byKey.get(key) ?? SETTING_DEFAULTS[key];
        if (value === undefined) throw missingSetting(key);
        result[key] = value;
    }
    return result;
}

export type SettingMeta = { updatedBy: string | null; dateModified: Date | null };

/** Semua setting yang dikenal (SETTING_DEFS) + siapa & kapan terakhir diubah. Key tanpa baris diisi default. */
export async function getAllSettings() {
    const rows = await prisma.settings.findMany({
        where: { key: { in: Object.keys(SETTING_DEFS) } },
        select: { key: true, value: true, updatedBy: true, dateModified: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const values: Record<string, string> = {};
    const meta: Record<string, SettingMeta> = {};
    for (const key of Object.keys(SETTING_DEFS)) {
        const row = byKey.get(key);
        values[key] = row?.value ?? SETTING_DEFAULTS[key] ?? "";
        meta[key] = { updatedBy: row?.updatedBy ?? null, dateModified: row?.dateModified ?? null };
    }
    return { values, meta };
}
