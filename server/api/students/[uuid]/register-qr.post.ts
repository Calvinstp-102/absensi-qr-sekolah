import { z } from "zod";

const registerSchema = z.object({
    token: z.string().min(1),
    reason: z.string().optional(),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");
    const body = await readValidatedBody(event, registerSchema.parse);

    const student = await prisma.student.findUnique({ where: { uuid } });
    if (!student) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    const existingToken = await prisma.qrCode.findFirst({
        where: { token: body.token, deleted: false },
    });
    if (existingToken) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "QR ini sudah terdaftar sebelumnya (untuk siswa lain atau siswa ini sendiri)",
        });
    }

    const graceDays = Number(await getSettingValue("qr_grace_period_hari"));
    const gracePeriodUntil = new Date();
    gracePeriodUntil.setDate(gracePeriodUntil.getDate() + graceDays);

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

    const reasonText =
        body.reason || "Daftarkan QR yang sudah ada (kartu fisik eksisting)";

    const newQr = await prisma.qrCode.create({
        data: {
            relatedTo: "students",
            studentId: student.id,
            token: body.token,
            status: "active",
            generatedBy: session.user.id,
            reason: reasonText,
        },
    });

    await saveQrImage(newQr.uuid, body.token);

    await prisma.student.update({
        where: { id: student.id },
        data: { hasQr: true },
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "register_qr",
            entityType: "student",
            entityId: student.id,
            beforeValue: { qrCodeId: existingActive?.id ?? null },
            afterValue: { qrCodeId: newQr.id },
            reason: reasonText,
        },
    });

    return { qrUuid: newQr.uuid };
});
