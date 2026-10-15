// Matriks absensi bulanan (buku absen): siswa x tanggal, per kelas
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const q = parseReportQuery(event, bulanShape);
    const scope = await resolveReportScope(user);
    assertScope(scope, q);

    const periode = periodeBulan(q.bulan);
    const f = { ...q, from: periode.from, to: periode.to };
    const data = await loadReportData(scope, f);
    return {
        scope: scopeInfo(scope),
        periode: { ...periodeInfo(f, data), bulan: periode.bulan, label: namaBulan(periode.bulan) },
        kelas: matriksBulanan(data, periode.bulan),
    };
});
