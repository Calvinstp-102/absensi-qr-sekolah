export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");

    const student = await prisma.student.findUnique({ where: { uuid } });
    if (!student) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    const activeQr = await prisma.qrCode.findFirst({
        where: {
            relatedTo: "students",
            studentId: student.id,
            status: "active",
            deleted: false,
        },
    });
    if (!activeQr) {
        throw createError({
            statusCode: 400,
            statusMessage: "Siswa ini tidak memiliki QR aktif",
        });
    }

    await prisma.qrCode.update({
        where: { id: activeQr.id },
        data: { status: "expired", deleted: true },
    });
    await deleteQrImage(activeQr.uuid);

    await prisma.student.update({
        where: { id: student.id },
        data: { hasQr: false },
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "delete_qr",
            entityType: "student",
            entityId: student.id,
            beforeValue: { qrCodeId: activeQr.id },
            afterValue: { qrCodeId: null },
            reason: "QR dihapus manual oleh guru",
        },
    });

    return { status: "ok" };
});
