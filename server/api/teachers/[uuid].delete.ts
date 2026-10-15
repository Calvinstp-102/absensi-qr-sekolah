export default defineEventHandler(async (event) => {
    const user = await requireRole(event, SUPERADMIN_ONLY);
    const teacher = await findTeacherOr404(event);

    if (teacher.id === user.id) {
        throw appError(400, "Anda tidak dapat menghapus akun sendiri.");
    }

    if (teacher.role === "superadmin" && teacher.isActive) {
        const activeSuperadmins = await prisma.teacher.count({
            where: { role: "superadmin", isActive: true, deleted: false },
        });
        if (activeSuperadmins <= 1) {
            throw appError(400, "Superadmin terakhir yang aktif tidak dapat dihapus.");
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.teacher.update({
            where: { id: teacher.id },
            data: { deleted: true, sessionVersion: { increment: 1 } },
        });
        // Kelas yang dipegang dilepas agar bisa diberikan ke wali lain (Modul 5)
        await tx.waliKelas.deleteMany({ where: { teacherId: teacher.id } });
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "delete_teacher",
                entityType: "teacher",
                entityId: teacher.id,
                beforeValue: {
                    nama: teacher.nama,
                    email: teacher.email,
                    role: teacher.role,
                    deleted: false,
                },
                afterValue: { deleted: true },
                reason: "Guru dihapus oleh superadmin",
            },
        });
    });

    logger.info("guru", "Guru dihapus", {
        ...requestContext(event),
        teacherId: teacher.id,
        email: teacher.email,
        role: teacher.role,
    });

    return { status: "ok", message: `Akun ${teacher.nama} berhasil dihapus.` };
});
