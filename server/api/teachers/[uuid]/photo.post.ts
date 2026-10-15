export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const teacher = await findTeacherOr404(event);
    assertCanEditTeacherPhoto(event, user, teacher);

    const { data, ext } = await readPhotoUpload(event);

    // Nama file unik per upload -> URL foto berubah, browser tidak menampilkan foto lama.
    // Simpan file baru dulu, baru hapus file lama.
    const filename = await savePhoto(
        "teachers",
        teacher.uuid,
        data,
        ext,
        Date.now().toString(36),
    );
    const updated = await prisma.teacher.update({
        where: { id: teacher.id },
        data: { fotoPath: filename },
        select: teacherPublicSelect,
    });
    if (teacher.fotoPath && teacher.fotoPath !== filename) {
        await deletePhoto("teachers", teacher.fotoPath).catch((e) =>
            logger.error("guru", "Gagal menghapus file foto lama", { teacherId: teacher.id }, e),
        );
    }

    if (teacher.id === user.id) {
        await refreshOwnSessionUser(event, { fotoPath: filename });
    }

    logger.info("guru", "Foto guru diperbarui", {
        ...requestContext(event),
        teacherId: teacher.id,
        ukuranKb: Math.round(data.length / 1024),
        format: ext,
    });

    return { teacher: updated, message: "Foto profil berhasil diperbarui." };
});
