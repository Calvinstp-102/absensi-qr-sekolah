// Info untuk filter halaman Laporan: kelas yang boleh dilihat, hari ini (WIB), tahun ajaran (preset semester)
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const [scope, tahunAjaran] = await Promise.all([resolveReportScope(user), getSettingValue("tahun_ajaran_aktif")]);
    const m = /^(\d{4})\/(\d{4})$/.exec(tahunAjaran.trim());
    return {
        ...scopeInfo(scope),
        today: todayWibStr(),
        tahunAjaran: m ? { label: tahunAjaran.trim(), awal: Number(m[1]), akhir: Number(m[2]) } : null,
    };
});
