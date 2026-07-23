export default defineEventHandler(async (event) => {
    await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid") as string;

    const qr = await prisma.qrCode.findUnique({ where: { uuid } });
    if (!qr || qr.deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: "QR tidak ditemukan",
        });
    }

    try {
        const buffer = await readQrImage(uuid);
        setResponseHeader(event, "Content-Type", "image/png");
        return buffer;
    } catch {
        throw createError({
            statusCode: 404,
            statusMessage: "File QR tidak ditemukan",
        });
    }
});
