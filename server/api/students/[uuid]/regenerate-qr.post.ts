import { z } from "zod";

const regenerateSchema = z.object({
    reason: z
        .string({ error: "Alasan harus berupa teks." })
        .trim()
        .max(255, "Alasan maksimal 255 karakter.")
        .nullish()
        .transform((v) => v || ""),
});

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, regenerateSchema);
    const student = await findStudentOr404(event);

    if (student.status !== "active") {
        logger.warn("qr", "Generate QR ditolak: siswa nonaktif", {
            ...requestContext(event),
            studentId: student.id,
        });
        throw appError(409, "Siswa nonaktif tidak dapat dibuatkan QR. Aktifkan siswa terlebih dahulu.");
    }

    const grace = await qrGraceUntil();
    const result = await prisma.$transaction(async (tx) => {
        const previous = await moveActiveQrToGrace(tx, student.id, grace.until);
        const reason = body.reason || (previous ? "Generate QR baru" : "Generate QR pertama kali");
        const qr = await issueStudentQr(tx, {
            studentId: student.id,
            token: generateQrToken(),
            generatedBy: user.id,
            reason,
        });
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "regenerate_qr",
                entityType: "student",
                entityId: student.id,
                beforeValue: { qrCodeId: previous?.id ?? null },
                afterValue: { qrCodeId: qr.id },
                reason,
            },
        });
        return { qr, previous };
    });

    await saveQrImageSafe(result.qr.uuid, result.qr.token);

    logger.info("qr", "QR siswa dibuat", {
        ...requestContext(event),
        studentId: student.id,
        qrId: result.qr.id,
        qrLamaMasaTenggang: result.previous?.id ?? null,
    });

    return {
        qrUuid: result.qr.uuid,
        message: result.previous
            ? `QR baru dibuat. QR lama masih bisa dipakai selama ${grace.days} hari.`
            : "QR berhasil dibuat.",
    };
});
