// Siswa yang perlu perhatian: kehadiran rendah, sering alpa, atau sering terlambat
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const f = parseReportQuery(event, ambangShape);
    const scope = await resolveReportScope(user);
    assertScope(scope, f);

    const data = await loadReportData(scope, f);
    const ambang = { minPersen: f.minPersen, maxAlpa: f.maxAlpa, maxTerlambat: f.maxTerlambat };
    return {
        scope: scopeInfo(scope),
        periode: periodeInfo(f, data),
        ambang,
        totalSiswa: data.siswa.length,
        data: siswaPerhatian(data, ambang),
    };
});
