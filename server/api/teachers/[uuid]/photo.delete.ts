export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const teacher = await findTeacherOr404(event);
    assertCanEditTeacherPhoto(event, user, teacher);

    if (!teacher.fotoPath) {
        throw appError(400, "Guru ini belum memiliki foto profil.");
    }

    const updated = await prisma.teacher.update({
        where: { id: teacher.id },
        data: { fotoPath: null },
        select: teacherPublicSelect,
    });
    await deletePhoto("teachers", teacher.fotoPath).catch((e) =>
        logger.error("guru", "Gagal menghapus file foto", { teacherId: teacher.id }, e),
    );

    if (teacher.id === user.id) {
        await refreshOwnSessionUser(event, { fotoPath: null });
    }

    logger.info("guru", "Foto guru dihapus", {
        ...requestContext(event),
        teacherId: teacher.id,
    });

    return { teacher: updated, message: "Foto profil berhasil dihapus." };
});
