// Laporan harian: setiap baris absensi (tanggal x siswa) dengan filter & paginasi
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const f = parseReportQuery(event, { ...harianExtraShape, ...paginasiShape });
    const scope = await resolveReportScope(user);
    assertScope(scope, f);

    const [kalender, jam] = await Promise.all([loadKalender(f.from, f.to), getSettings(["jam_masuk_global"] as const)]);
    const { where, orderBy } = harianQuery(scope, f, kalender.today);
    const [total, rows] = await Promise.all([
        prisma.attendance.count({ where }),
        prisma.attendance.findMany({
            where,
            include: harianInclude,
            orderBy,
            skip: (f.page - 1) * f.pageSize,
            take: f.pageSize,
        }),
    ]);

    return {
        scope: scopeInfo(scope),
        periode: periodeInfo(f),
        data: rows.map((a) => harianView(a, kalender, jam.jam_masuk_global)),
        pagination: {
            page: f.page,
            pageSize: f.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / f.pageSize)),
        },
    };
});
