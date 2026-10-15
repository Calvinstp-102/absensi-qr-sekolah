import bcrypt from "bcryptjs";
import { z } from "zod";

const resetPasswordSchema = z
    .object({
        newPassword: newPasswordSchema("Password baru"),
        confirmPassword: z
            .string({ error: "Konfirmasi password wajib diisi." })
            .min(1, "Konfirmasi password wajib diisi."),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Konfirmasi password tidak sama dengan password baru.",
    });

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, SUPERADMIN_ONLY);
    const body = await parseBody(event, resetPasswordSchema);
    const teacher = await findTeacherOr404(event);

    if (teacher.id === user.id) {
        throw appError(
            400,
            "Untuk mengganti password akun sendiri, gunakan menu Akun Saya.",
        );
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);

    await prisma.$transaction(async (tx) => {
        // sessionVersion naik -> guru tersebut keluar dari semua perangkat
        await tx.teacher.update({
            where: { id: teacher.id },
            data: { passwordHash, sessionVersion: { increment: 1 } },
        });
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "reset_teacher_password",
                entityType: "teacher",
                entityId: teacher.id,
                reason: "Password guru direset oleh superadmin",
            },
        });
    });

    logger.info("guru", "Password guru direset, semua sesi guru tersebut dicabut", {
        ...requestContext(event),
        teacherId: teacher.id,
        email: teacher.email,
    });

    return {
        status: "ok",
        message: `Password ${teacher.nama} berhasil direset. Guru tersebut perlu login ulang dengan password baru.`,
    };
});
