import { z } from "zod";

const updateSchema = z.object({
    items: z.array(z.object({ key: z.string(), value: z.string() })),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (session.user.role !== "admin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Hanya admin yang bisa mengakses ini",
        });
    }

    const body = await readValidatedBody(event, updateSchema.parse);

    for (const item of body.items) {
        const before = await prisma.settings.findUnique({
            where: { key: item.key },
        });
        await prisma.settings.update({
            where: { key: item.key },
            data: { value: item.value, updatedBy: session.user.nama },
        });
        if (before && before.value !== item.value) {
            await prisma.auditLog.create({
                data: {
                    teacherId: session.user.id,
                    actionType: "update_setting",
                    entityType: "settings",
                    entityId: 0,
                    beforeValue: { key: item.key, value: before.value },
                    afterValue: { key: item.key, value: item.value },
                    reason: `Ubah setting ${item.key}`,
                },
            });
        }
    }

    return { status: "ok" };
});
