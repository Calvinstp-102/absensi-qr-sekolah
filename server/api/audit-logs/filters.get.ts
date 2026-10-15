// Pilihan filter Log Aktivitas: guru yang pernah beraktivitas + aktivitas per kategori
export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const pelaku = await prisma.auditLog.groupBy({ by: ["teacherId"], where: { deleted: false } });
    const guru = pelaku.length
        ? await prisma.teacher.findMany({
              where: { id: { in: pelaku.map((p) => p.teacherId) } },
              select: { uuid: true, nama: true, role: true, deleted: true },
              orderBy: { nama: "asc" },
          })
        : [];
    return {
        today: todayWibStr(),
        guru,
        kategori: (Object.keys(KATEGORI_AUDIT) as KategoriAudit[]).map((k) => ({
            value: k,
            label: KATEGORI_AUDIT[k].label,
            aksi: aksiPerKategori(k),
        })),
    };
});
