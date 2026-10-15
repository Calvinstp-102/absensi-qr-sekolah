import { z } from "zod";

// Aktivitas absensi: absen manual, izin pulang awal, dimaklumi, keterangan S/I, pembatalan
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const f = parseReportQuery(event, {
        jenis: z.preprocess(
            (v) => (v === "" ? undefined : v),
            z.enum(Object.keys(AKSI_AKTIVITAS) as [string, ...string[]], { error: "Jenis aktivitas tidak dikenal." }).optional(),
        ),
        ...paginasiShape,
    });
    const scope = await resolveReportScope(user);
    assertScope(scope, f);

    const rows = await loadAktivitas(scope, f, f.jenis);
    const perJenis: Record<string, number> = {};
    for (const r of rows) perJenis[r.jenis] = (perJenis[r.jenis] ?? 0) + 1;

    return {
        scope: scopeInfo(scope),
        periode: periodeInfo(f),
        jenisList: Object.entries(AKSI_AKTIVITAS).map(([value, label]) => ({ value, label })),
        perJenis,
        data: rows.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
        pagination: {
            page: f.page,
            pageSize: f.pageSize,
            total: rows.length,
            totalPages: Math.max(1, Math.ceil(rows.length / f.pageSize)),
        },
    };
});
