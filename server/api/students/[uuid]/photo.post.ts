export default defineEventHandler(async (event) => {
    await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");

    const student = await prisma.student.findUnique({ where: { uuid } });
    if (!student) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    const formData = await readMultipartFormData(event);
    const file = formData?.find((f) => f.name === "photo");
    if (!file) {
        throw createError({
            statusCode: 400,
            statusMessage: "File foto tidak ditemukan",
        });
    }

    const ext = extFromMimeType(file.type || "");
    if (!ext) {
        throw createError({
            statusCode: 400,
            statusMessage: "Format file harus JPG, PNG, atau WEBP",
        });
    }

    if (file.data.length > 2 * 1024 * 1024) {
        throw createError({
            statusCode: 400,
            statusMessage: "Ukuran file maksimal 2MB",
        });
    }

    if (student.fotoPath) {
        await deletePhoto("students", student.fotoPath);
    }

    const filename = await savePhoto("students", student.uuid, file.data, ext);
    await prisma.student.update({
        where: { id: student.id },
        data: { fotoPath: filename },
    });

    return { fotoPath: filename };
});
