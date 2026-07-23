import { z } from "zod";

const correctSchema = z.object({
    reason: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const id = Number(getRouterParam(event, "id"));
    const body = await readValidatedBody(event, correctSchema.parse);

    const before = await prisma.attendance.findUnique({ where: { id } });
    if (!before) {
        throw createError({
            statusCode: 404,
            statusMessage: "Data absensi tidak ditemukan",
        });
    }

    const updated = await prisma.attendance.update({
        where: { id },
        data: {
            statusKoreksi: "dimaklumi",
            alasanKoreksi: body.reason,
            dikoreksiOleh: session.user.id,
            dikoreksiAt: new Date(),
        },
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "correct_attendance",
            entityType: "attendance",
            entityId: id,
            beforeValue: {
                statusKoreksi: before.statusKoreksi,
                alasanKoreksi: before.alasanKoreksi,
            },
            afterValue: {
                statusKoreksi: "dimaklumi",
                alasanKoreksi: body.reason,
            },
            reason: body.reason,
        },
    });

    return updated;
});
