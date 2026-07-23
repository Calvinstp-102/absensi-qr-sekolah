import { PDFDocument, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export default defineEventHandler(async (event) => {
    await requireUserSession(event);
    const query = getQuery(event);
    const idsParam = query.ids as string | undefined;
    const studentWhere = idsParam
        ? { id: { in: idsParam.split(",").map(Number) } }
        : {};

    const students = await prisma.student.findMany({
        where: { ...studentWhere, deleted: false, hasQr: true },
        orderBy: { nama: "asc" },
    });

    if (students.length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: "Tidak ada siswa dengan QR aktif untuk diexport",
        });
    }

    const qrCodes = await prisma.qrCode.findMany({
        where: {
            relatedTo: "students",
            studentId: { in: students.map((s) => s.id) },
            status: "active",
            deleted: false,
        },
    });
    const qrByStudentId = new Map(qrCodes.map((q) => [q.studentId, q]));
    const studentsWithQr = students.filter((s) => qrByStudentId.has(s.id));

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const cols = 4;
    const rows = 4;
    const perPage = cols * rows;
    const cellW = 130;
    const cellH = 170;
    const marginX = 40;
    const marginY = 40;

    for (let i = 0; i < studentsWithQr.length; i += perPage) {
        const page = pdfDoc.addPage([595, 842]);
        const batch = studentsWithQr.slice(i, i + perPage);

        for (let j = 0; j < batch.length; j++) {
            const s = batch[j];
            const qr = qrByStudentId.get(s.id)!;
            const col = j % cols;
            const row = Math.floor(j / cols);

            const qrDataUrl = await QRCode.toDataURL(qr.token, {
                margin: 1,
                width: 200,
            });
            const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
            const qrImage = await pdfDoc.embedPng(qrImageBytes);

            const x = marginX + col * cellW;
            const yTop = 842 - marginY - row * cellH;

            page.drawImage(qrImage, {
                x,
                y: yTop - 100,
                width: 90,
                height: 90,
            });
            page.drawText(s.nama, {
                x,
                y: yTop - 115,
                size: 8,
                font,
                maxWidth: 100,
            });
            page.drawText(`${s.jenjang} - ${s.kelasSekarang}`, {
                x,
                y: yTop - 128,
                size: 7,
                font,
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    setResponseHeader(event, "Content-Type", "application/pdf");
    setResponseHeader(
        event,
        "Content-Disposition",
        'attachment; filename="qr-siswa.pdf"',
    );
    return Buffer.from(pdfBytes);
});
