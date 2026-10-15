export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const student = await findStudentOr404(event);

    if (!student.fotoPath) {
        throw appError(409, "Siswa ini belum memiliki foto.");
    }

    await prisma.$transaction([
        prisma.student.update({ where: { id: student.id }, data: { fotoPath: null } }),
        prisma.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "remove_student_photo",
                entityType: "student",
                entityId: student.id,
                beforeValue: { adaFoto: true },
                afterValue: { adaFoto: false },
                reason: "Hapus foto siswa",
            },
        }),
    ]);
    await deletePhoto("students", student.fotoPath).catch((e) =>
        logger.error("siswa", "Gagal menghapus file foto", { studentId: student.id }, e),
    );

    logger.info("siswa", "Foto siswa dihapus", {
        ...requestContext(event),
        studentId: student.id,
    });

    return { message: "Foto siswa berhasil dihapus." };
});
