export default defineEventHandler(async (event) => {
    await requireUserSession(event);

    const query = getQuery(event);
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;

    const where = { deleted: false };
    const total = await prisma.teacher.count({ where });
    const teachers = await prisma.teacher.findMany({
        where,
        select: {
            id: true,
            uuid: true,
            nama: true,
            email: true,
            role: true,
            isActive: true,
            fotoPath: true,
            noHp: true,
        },
        orderBy: { nama: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    return {
        teachers,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
});
