export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (session.user.role !== "superadmin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Hanya superadmin yang bisa menghapus guru",
        });
    }

    const uuid = getRouterParam(event, "uuid");
    const teacher = await prisma.teacher.findUnique({ where: { uuid } });
    if (!teacher || teacher.deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: "Guru tidak ditemukan",
        });
    }

    if (teacher.id === session.user.id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Tidak bisa menghapus akun sendiri",
        });
    }

    if (teacher.role === "superadmin") {
        const activeSuperadminCount = await prisma.teacher.count({
            where: { role: "superadmin", isActive: true, deleted: false },
        });
        if (activeSuperadminCount <= 1) {
            throw createError({
                statusCode: 400,
                statusMessage: "Tidak bisa menghapus superadmin terakhir",
            });
        }
    }

    await prisma.teacher.update({
        where: { id: teacher.id },
        data: { deleted: true },
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "delete_teacher",
            entityType: "teacher",
            entityId: teacher.id,
            beforeValue: { deleted: false },
            afterValue: { deleted: true },
            reason: "Guru dihapus oleh admin",
        },
    });

    return { status: "ok" };
});
