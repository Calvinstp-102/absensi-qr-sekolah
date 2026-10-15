import { z } from "zod";

const deleteQrSchema = z.object({
    reason: z
        .string({ error: "Alasan harus berupa teks." })
        .trim()
        .max(255, "Alasan maksimal 255 karakter.")
        .nullish()
        .transform((v) => v || "QR dihapus manual"),
});

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, deleteQrSchema);
    const student = await findStudentOr404(event);

    const activeQr = await prisma.qrCode.findFirst({
        where: { relatedTo: "students", studentId: student.id, status: "active", deleted: false },
        select: { id: true, uuid: true },
    });
    if (!activeQr) {
        throw appError(409, "Siswa ini tidak memiliki QR aktif.");
    }

    // Langsung tidak berlaku (tanpa masa tenggang)
    await prisma.$transaction([
        prisma.qrCode.update({
            where: { id: activeQr.id },
            data: { status: "expired", deleted: true },
        }),
        prisma.student.update({ where: { id: student.id }, data: { hasQr: false } }),
        prisma.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "delete_qr",
                entityType: "student",
                entityId: student.id,
                beforeValue: { qrCodeId: activeQr.id },
                afterValue: { qrCodeId: null },
                reason: body.reason,
            },
        }),
    ]);
    await deleteQrImage(activeQr.uuid).catch((e) =>
        logger.error("qr", "Gagal menghapus gambar QR", { qrId: activeQr.id }, e),
    );

    logger.info("qr", "QR siswa dihapus", {
        ...requestContext(event),
        studentId: student.id,
        qrId: activeQr.id,
    });

    return { message: "QR dihapus dan tidak bisa dipakai absen lagi." };
});
