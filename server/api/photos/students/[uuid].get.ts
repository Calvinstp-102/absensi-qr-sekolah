const CONTENT_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
};

export default defineEventHandler(async (event) => {
    await requireAuth(event);
    const uuid = getRouterParam(event, "uuid");

    const student = uuid
        ? await prisma.student.findUnique({
              where: { uuid },
              select: { fotoPath: true, deleted: true },
          })
        : null;
    if (!student || student.deleted || !student.fotoPath) {
        throw appError(404, "Foto tidak ditemukan.");
    }

    try {
        const buffer = await readPhoto("students", student.fotoPath);
        const ext = student.fotoPath.split(".").pop() ?? "";
        setResponseHeader(event, "Content-Type", CONTENT_TYPES[ext] ?? "image/jpeg");
        setResponseHeader(event, "Cache-Control", "private, no-cache");
        return buffer;
    } catch {
        throw appError(404, "File foto tidak ditemukan.");
    }
});
