const CONTENT_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
};

export default defineEventHandler(async (event) => {
    await requireAuth(event);
    const uuid = getRouterParam(event, "uuid");

    const teacher = uuid
        ? await prisma.teacher.findUnique({ where: { uuid } })
        : null;
    if (!teacher || !teacher.fotoPath) {
        throw appError(404, "Foto tidak ditemukan.");
    }

    try {
        const buffer = await readPhoto("teachers", teacher.fotoPath);
        const ext = teacher.fotoPath.split(".").pop() ?? "";
        setResponseHeader(event, "Content-Type", CONTENT_TYPES[ext] ?? "image/jpeg");
        // Nama file tetap sama saat foto diganti -> browser wajib cek ulang ke server
        setResponseHeader(event, "Cache-Control", "private, no-cache");
        return buffer;
    } catch {
        throw appError(404, "File foto tidak ditemukan.");
    }
});
