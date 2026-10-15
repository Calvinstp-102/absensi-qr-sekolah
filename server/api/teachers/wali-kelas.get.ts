// Penugasan wali kelas saat ini (form Guru: menandai kelas yang sudah dipegang guru lain)
export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const rows = await prisma.waliKelas.findMany({
        where: { teacher: { deleted: false } },
        select: { jenjang: true, kelas: true, teacher: { select: { uuid: true, nama: true, isActive: true } } },
    });
    return urutkanKelas(rows).map((r) => ({
        jenjang: r.jenjang,
        kelas: r.kelas,
        kelasLabel: formatKelas(r.jenjang, r.kelas),
        teacher: r.teacher,
    }));
});
