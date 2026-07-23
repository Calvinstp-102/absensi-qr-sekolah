export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");
    const body = await readBody(event).catch(() => ({}));

    const student = await prisma.student.findUnique({ where: { uuid } });
    if (!student || student.deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    await prisma.student.update({
        where: { id: student.id },
        data: { deleted: true },
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "delete_student",
            entityType: "student",
            entityId: student.id,
            beforeValue: { deleted: false },
            afterValue: { deleted: true },
            reason: body?.reason || "Dihapus oleh guru",
        },
    });

    return { status: "ok" };
});
