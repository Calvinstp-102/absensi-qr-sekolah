export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 15;

    const total = await prisma.auditLog.count();
    const logs = await prisma.auditLog.findMany({
        include: { teacher: { select: { nama: true } } },
        orderBy: { dateCreated: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    return {
        logs,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
});
