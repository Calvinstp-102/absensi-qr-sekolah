// Rekap kehadiran per siswa dalam periode
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const f = parseReportQuery(event, { sort: sortSiswaEnum });
    const scope = await resolveReportScope(user);
    assertScope(scope, f);

    const data = await loadReportData(scope, f);
    return {
        scope: scopeInfo(scope),
        periode: periodeInfo(f, data),
        ringkasan: jumlahkan(data.siswa),
        data: urutkanRekapSiswa(data.siswa.map(rekapSiswaView), f.sort),
    };
});
