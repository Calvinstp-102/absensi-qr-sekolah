export default defineEventHandler(async (event) => {
    await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");

    const teacher = await prisma.teacher.findUnique({ where: { uuid } });
    if (!teacher || !teacher.fotoPath) {
        throw createError({
            statusCode: 404,
            statusMessage: "Foto tidak ditemukan",
        });
    }

    try {
        const buffer = await readPhoto("teachers", teacher.fotoPath);
        const ext = teacher.fotoPath.split(".").pop();
        setResponseHeader(
            event,
            "Content-Type",
            ext === "png"
                ? "image/png"
                : ext === "webp"
                  ? "image/webp"
                  : "image/jpeg",
        );
        return buffer;
    } catch {
        throw createError({
            statusCode: 404,
            statusMessage: "File foto tidak ditemukan",
        });
    }
});
