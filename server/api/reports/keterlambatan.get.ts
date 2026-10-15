// Analisis keterlambatan: ranking siswa, distribusi per hari & per lama terlambat
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const f = parseReportQuery(event, {});
    const scope = await resolveReportScope(user);
    assertScope(scope, f);

    const data = await loadReportData(scope, f);
    const rekap = rekapKeterlambatan(data);
    const kejadian = rekap.siswa.reduce((n, s) => n + s.jumlah, 0);
    const totalMenit = rekap.siswa.reduce((n, s) => n + s.totalMenit, 0);
    return {
        scope: scopeInfo(scope),
        periode: periodeInfo(f, data),
        ringkasan: {
            kejadian,
            siswaTerlambat: rekap.siswa.length,
            totalSiswa: data.siswa.length,
            rataMenit: kejadian ? Math.round(totalMenit / kejadian) : 0,
            dimaklumi: rekap.siswa.reduce((n, s) => n + s.dimaklumi, 0),
        },
        ...rekap,
    };
});
