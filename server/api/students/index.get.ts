export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const jenjang = query.jenjang as string | undefined;
    const kelas = query.kelas as string | undefined;
    const status = query.status as string | undefined;
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 5;

    const where = {
        deleted: false,
        ...(jenjang && { jenjang: jenjang as any }),
        ...(kelas && { kelasSekarang: kelas }),
        ...(status && { status: status as any }),
    };

    const total = await prisma.student.count({ where });
    const students = await prisma.student.findMany({
        where,
        orderBy: [{ kelasSekarang: "asc" }, { nama: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    return {
        students,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
});
