import bcrypt from "bcryptjs";
import { z } from "zod";

const changePasswordSchema = z
    .object({
        currentPassword: z
            .string({ error: "Password saat ini wajib diisi." })
            .min(1, "Password saat ini wajib diisi."),
        newPassword: newPasswordSchema("Password baru"),
        confirmPassword: z
            .string({ error: "Konfirmasi password wajib diisi." })
            .min(1, "Konfirmasi password wajib diisi."),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Konfirmasi password tidak sama dengan password baru.",
    })
    .refine((d) => d.newPassword !== d.currentPassword, {
        path: ["newPassword"],
        message: "Password baru tidak boleh sama dengan password saat ini.",
    });

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const body = await parseBody(event, changePasswordSchema);
    const session = await getUserSession(event);

    const teacher = await prisma.teacher.findUniqueOrThrow({
        where: { id: user.id },
    });

    const valid = await bcrypt.compare(
        body.currentPassword,
        teacher.passwordHash,
    );
    if (!valid) {
        logger.warn(
            "auth",
            "Ganti password gagal: password saat ini salah",
            requestContext(event),
        );
        throw appError(422, "Password saat ini salah.", {
            fieldErrors: { currentPassword: "Password saat ini salah." },
        });
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);

    const updated = await prisma.$transaction(async (tx) => {
        const t = await tx.teacher.update({
            where: { id: teacher.id },
            data: { passwordHash, sessionVersion: { increment: 1 } },
        });
        await tx.auditLog.create({
            data: {
                teacherId: teacher.id,
                actionType: "change_password",
                entityType: "teacher",
                entityId: teacher.id,
                reason: "Guru mengganti password sendiri",
            },
        });
        return t;
    });

    // Perbarui sesi perangkat ini; sesi di perangkat lain otomatis tidak berlaku
    await startUserSession(event, updated, Boolean(session.remember));

    logger.info(
        "auth",
        "Ganti password berhasil, sesi di perangkat lain dicabut",
        requestContext(event),
    );

    return {
        status: "ok",
        message:
            "Password berhasil diganti. Sesi di perangkat lain telah dikeluarkan.",
    };
});
