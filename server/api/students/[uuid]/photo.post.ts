export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const student = await findStudentOr404(event);
    const { data, ext } = await readPhotoUpload(event);

    // Nama file unik per upload -> URL foto berubah, browser tidak menampilkan foto lama.
    // Simpan file baru dulu, baru hapus file lama.
    const filename = await savePhoto("students", student.uuid, data, ext, Date.now().toString(36));
    await prisma.$transaction([
        prisma.student.update({ where: { id: student.id }, data: { fotoPath: filename } }),
        prisma.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "update_student_photo",
                entityType: "student",
                entityId: student.id,
                beforeValue: { adaFoto: !!student.fotoPath },
                afterValue: { adaFoto: true },
                reason: student.fotoPath ? "Ganti foto siswa" : "Unggah foto siswa",
            },
        }),
    ]);
    if (student.fotoPath && student.fotoPath !== filename) {
        await deletePhoto("students", student.fotoPath).catch((e) =>
            logger.error("siswa", "Gagal menghapus file foto lama", { studentId: student.id }, e),
        );
    }

    logger.info("siswa", "Foto siswa diperbarui", {
        ...requestContext(event),
        studentId: student.id,
        ukuranKb: Math.round(data.length / 1024),
        format: ext,
    });

    return { fotoPath: filename, message: "Foto siswa berhasil diperbarui." };
});
