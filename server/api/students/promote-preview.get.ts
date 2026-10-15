import { z } from "zod";

const querySchema = withPromoteKelasCheck(z.object(promoteSourceShape));

/** Daftar siswa aktif di kelas asal + tujuan naik kelas, untuk langkah 2 wizard. */
export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const query = parseQuery(event, querySchema);
    const target = promoteTarget(query.jenjang, query.kelas);
    const tahunAjaran = await getSettingValue("tahun_ajaran_aktif");

    const students = await prisma.student.findMany({
        where: {
            deleted: false,
            status: "active",
            jenjang: query.jenjang,
            kelasSekarang: query.kelas,
        },
        select: { id: true, uuid: true, nama: true, nisn: true, gender: true, fotoPath: true },
        orderBy: [{ nama: "asc" }, { id: "asc" }],
    });
    const promoted = await alreadyPromotedIds(students.map((s) => s.id), tahunAjaran);

    return {
        tahunAjaran,
        asal: formatKelas(query.jenjang, query.kelas),
        target,
        students: students.map((s) => ({ ...s, sudahNaik: promoted.has(s.id) })),
    };
});
