// Rekap kehadiran per kelas + tren harian dalam periode
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const f = parseReportQuery(event, {});
    const scope = await resolveReportScope(user);
    assertScope(scope, f);

    const data = await loadReportData(scope, f);
    return {
        scope: scopeInfo(scope),
        periode: periodeInfo(f, data),
        ringkasan: jumlahkan(data.siswa),
        data: rekapKelas(data),
        tren: trenHarian(data),
    };
});
