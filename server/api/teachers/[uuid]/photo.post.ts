export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");
    const teacher = await prisma.teacher.findUnique({ where: { uuid } });
    if (!teacher) {
        throw createError({
            statusCode: 404,
            statusMessage: "Guru tidak ditemukan",
        });
    }

    const isOwnPhoto = teacher.id === session.user.id;
    const isSuperadmin = session.user.role === "superadmin";
    if (!isOwnPhoto && !isSuperadmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Hanya bisa mengubah foto sendiri",
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

    if (teacher.fotoPath) {
        await deletePhoto("teachers", teacher.fotoPath);
    }

    const filename = await savePhoto("teachers", teacher.uuid, file.data, ext);
    await prisma.teacher.update({
        where: { id: teacher.id },
        data: { fotoPath: filename },
    });

    return { fotoPath: filename };
});
