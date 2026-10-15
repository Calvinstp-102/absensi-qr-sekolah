import { z } from "zod";

const deleteSchema = z.object({
    reason: z
        .string({ error: "Alasan harus berupa teks." })
        .trim()
        .max(255, "Alasan maksimal 255 karakter.")
        .nullish()
        .transform((v) => v || "Dihapus oleh admin"),
});

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, deleteSchema);
    const student = await findStudentOr404(event);

    // Hapus siswa -> semua QR-nya ikut tidak berlaku (tidak bisa dipakai absen lagi)
    const expiredQrs = await prisma.$transaction(async (tx) => {
        await tx.student.update({
            where: { id: student.id },
            data: { deleted: true },
        });
        const qrs = await expireStudentQrs(tx, student.id);
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "delete_student",
                entityType: "student",
                entityId: student.id,
                beforeValue: { deleted: false, qrAktif: qrs.length },
                afterValue: { deleted: true, qrAktif: 0 },
                reason: body.reason,
            },
        });
        return qrs;
    });

    for (const qr of expiredQrs) {
        await deleteQrImage(qr.uuid).catch((e) =>
            logger.error("qr", "Gagal menghapus gambar QR", { qrId: qr.id }, e),
        );
    }

    logger.info("siswa", "Siswa dihapus", {
        ...requestContext(event),
        studentId: student.id,
        qrDinonaktifkan: expiredQrs.length,
    });

    return { message: `Data siswa ${student.nama} berhasil dihapus.` };
});
