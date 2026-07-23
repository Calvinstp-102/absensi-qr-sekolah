import { z } from "zod";

const regenerateSchema = z.object({
    reason: z.string().optional(),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");
    const body = await readValidatedBody(event, regenerateSchema.parse);

    const student = await prisma.student.findUnique({ where: { uuid } });
    if (!student) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    const graceDays = Number(await getSettingValue("qr_grace_period_hari"));
    const gracePeriodUntil = new Date();
    gracePeriodUntil.setDate(gracePeriodUntil.getDate() + graceDays);

    // QR aktif yang sekarang (kalau ada) -> masuk masa tenggang
    const existingActive = await prisma.qrCode.findFirst({
        where: {
            relatedTo: "students",
            studentId: student.id,
            status: "active",
            deleted: false,
        },
    });

    if (existingActive) {
        await prisma.qrCode.update({
            where: { id: existingActive.id },
            data: { status: "grace_period", gracePeriodUntil },
        });
    }

    const newToken = generateQrToken();
    const newQr = await prisma.qrCode.create({
        data: {
            relatedTo: "students",
            studentId: student.id,
            token: newToken,
            status: "active",
            generatedBy: session.user.id,
            reason:
                body.reason ||
                (existingActive ? "Regenerate QR" : "Generate QR pertama kali"),
        },
    });

    await saveQrImage(newQr.uuid, newToken);

    await prisma.student.update({
        where: { id: student.id },
        data: { hasQr: true },
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "regenerate_qr",
            entityType: "student",
            entityId: student.id,
            beforeValue: { qrCodeId: existingActive?.id ?? null },
            afterValue: { qrCodeId: newQr.id },
            reason:
                body.reason ||
                (existingActive ? "Regenerate QR" : "Generate QR pertama kali"),
        },
    });

    return { qrUuid: newQr.uuid };
});
