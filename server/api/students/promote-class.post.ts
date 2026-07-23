import { z } from "zod";

const promoteSchema = z.object({
    studentIds: z.array(z.number()).min(1),
    kelasTujuan: z.string().min(1),
    reason: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readValidatedBody(event, promoteSchema.parse);

    const tahunAjaran = await getSettingValue("tahun_ajaran_aktif");

    const results = [];

    for (const studentId of body.studentIds) {
        const before = await prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!before) continue;

        const updated = await prisma.student.update({
            where: { id: studentId },
            data: { kelasSekarang: body.kelasTujuan },
        });

        await prisma.studentClassHistory.create({
            data: {
                studentId,
                kelas: body.kelasTujuan,
                tahunAjaran,
                action: "naik_kelas",
                reason: body.reason,
                changedBy: session.user.id,
            },
        });

        await prisma.auditLog.create({
            data: {
                teacherId: session.user.id,
                actionType: "promote_class",
                entityType: "student",
                entityId: studentId,
                beforeValue: { kelas: before.kelasSekarang },
                afterValue: { kelas: updated.kelasSekarang },
                reason: body.reason,
            },
        });

        results.push(updated);
    }

    return { updated: results.length };
});
