export default defineEventHandler(async (event) => {
    await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");

    const student = await prisma.student.findUnique({ where: { uuid } });
    if (!student || !student.fotoPath) {
        throw createError({
            statusCode: 404,
            statusMessage: "Foto tidak ditemukan",
        });
    }

    try {
        const buffer = await readPhoto("students", student.fotoPath);
        const ext = student.fotoPath.split(".").pop();
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
