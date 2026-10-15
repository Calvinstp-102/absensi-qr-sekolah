export default defineEventHandler(async (event) => {
    await requireAuth(event);
    const uuid = getRouterParam(event, "uuid");

    const qr = uuid
        ? await prisma.qrCode.findUnique({
              where: { uuid },
              select: { uuid: true, token: true, deleted: true },
          })
        : null;
    if (!qr || qr.deleted) {
        throw appError(404, "QR tidak ditemukan.");
    }

    let buffer: Buffer;
    try {
        buffer = await readQrImage(qr.uuid);
    } catch {
        // File gambar hilang (mis. gagal ditulis / storage dipindah) -> buat ulang dari token
        try {
            await saveQrImage(qr.uuid, qr.token);
            buffer = await readQrImage(qr.uuid);
            logger.warn("qr", "Gambar QR hilang, dibuat ulang", { qrUuid: qr.uuid });
        } catch (e) {
            logger.error("qr", "Gagal membuat ulang gambar QR", { qrUuid: qr.uuid }, e);
            throw appError(404, "File QR tidak ditemukan.");
        }
    }

    setResponseHeader(event, "Content-Type", "image/png");
    // Gambar QR untuk uuid yang sama tidak pernah berubah
    setResponseHeader(event, "Cache-Control", "private, max-age=86400");
    return buffer;
});
