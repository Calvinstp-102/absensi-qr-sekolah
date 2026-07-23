import bcrypt from "bcryptjs";
import { z } from "zod";

const updateTeacherSchema = z.object({
    nama: z.string().min(1),
    email: z.string().email(),
    noHp: z.string().optional(),
    role: z.enum(['superadmin', 'admin', 'guru_piket', 'wali_kelas']),
    isActive: z.boolean(),
    password: z.string().min(6).optional().or(z.literal("")),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (session.user.role !== "superadmin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Hanya superadmin yang bisa mengedit guru",
        });
    }

    const uuid = getRouterParam(event, "uuid");
    const body = await readValidatedBody(event, updateTeacherSchema.parse);

    const before = await prisma.teacher.findUnique({ where: { uuid } });
    if (!before || before.deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: "Guru tidak ditemukan",
        });
    }

    const kehilanganSuperadmin =
        before.role === "superadmin" &&
        (body.role !== "superadmin" || !body.isActive);
    if (kehilanganSuperadmin) {
        const activeSuperadminCount = await prisma.teacher.count({
            where: { role: "superadmin", isActive: true, deleted: false },
        });
        if (activeSuperadminCount <= 1) {
            throw createError({
                statusCode: 400,
                statusMessage:
                    "Tidak bisa mengubah role/menonaktifkan superadmin terakhir yang aktif",
            });
        }
    }

    const updateData: any = {
        nama: body.nama,
        email: body.email,
        noHp: body.noHp,
        role: body.role,
        isActive: body.isActive,
    };
    if (body.password) {
        updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const updated = await prisma.teacher.update({
        where: { id: before.id },
        data: updateData,
    });

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "update_teacher",
            entityType: "teacher",
            entityId: before.id,
            beforeValue: {
                nama: before.nama,
                email: before.email,
                role: before.role,
                isActive: before.isActive,
            },
            afterValue: {
                nama: updated.nama,
                email: updated.email,
                role: updated.role,
                isActive: updated.isActive,
            },
            reason: "Update data guru",
        },
    });

    return updated;
});
