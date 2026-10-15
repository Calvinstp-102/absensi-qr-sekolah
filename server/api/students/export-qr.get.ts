import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { z } from "zod";

// ?ids=1,2,3 (siswa terpilih) atau filter yang sama dengan daftar siswa (kosong = semua)
const querySchema = withFilterKelasCheck(
    z.object({
        ...studentFilterShape,
        ids: z
            .string({ error: "Daftar siswa tidak valid." })
            .trim()
            .regex(/^\d+(,\d+)*$/, "Daftar siswa tidak valid.")
            .transform((v) => v.split(",").map(Number))
            .pipe(studentIdsSchema)
            .optional(),
    }),
);

// Tata letak A4 (point): 4 kolom x 4 baris kartu
const PAGE_W = 595;
const PAGE_H = 842;
const COLS = 4;
const ROWS = 4;
const MARGIN_X = 30;
const TOP = 70;
const CARD_W = (PAGE_W - MARGIN_X * 2) / COLS;
const CARD_H = 180;
const QR_SIZE = 96;
const GRAY = rgb(0.45, 0.45, 0.45);

export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const { ids, ...filter } = parseQuery(event, querySchema);
    const { where } = await resolveBulkWhere(ids ? { studentIds: ids } : { filter });

    const students = await prisma.student.findMany({
        where: { AND: [where, { status: "active", hasQr: true }] },
        select: { id: true, nama: true, nisn: true, jenjang: true, kelasSekarang: true },
        orderBy: studentOrderBy,
    });
    const qrCodes = await prisma.qrCode.findMany({
        where: {
            relatedTo: "students",
            studentId: { in: students.map((s) => s.id) },
            status: "active",
            deleted: false,
        },
        select: { studentId: true, token: true },
    });
    const tokenByStudent = new Map(qrCodes.map((q) => [q.studentId, q.token]));
    const cards = students.filter((s) => tokenByStudent.has(s.id));

    if (!cards.length) {
        throw appError(
            404,
            "Tidak ada siswa aktif yang punya QR pada pilihan ini. Generate QR terlebih dahulu.",
        );
    }

    const namaSekolah = pdfSafe(await getSettingValue("nama_sekolah").catch(() => ""));
    const pdf = await PDFDocument.create();
    pdf.setTitle("Kartu QR Absensi Siswa");
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const perPage = COLS * ROWS;
    const totalPages = Math.ceil(cards.length / perPage);
    const textW = CARD_W - 16;

    for (let p = 0; p < totalPages; p++) {
        const page = pdf.addPage([PAGE_W, PAGE_H]);
        page.drawText("Kartu QR Absensi Siswa", { x: MARGIN_X, y: PAGE_H - 36, size: 13, font: bold });
        if (namaSekolah) {
            page.drawText(namaSekolah, { x: MARGIN_X, y: PAGE_H - 52, size: 9, font, color: GRAY });
        }
        const pageLabel = `Halaman ${p + 1} dari ${totalPages}`;
        page.drawText(pageLabel, {
            x: PAGE_W - MARGIN_X - font.widthOfTextAtSize(pageLabel, 8),
            y: PAGE_H - 36,
            size: 8,
            font,
            color: GRAY,
        });

        const batch = cards.slice(p * perPage, (p + 1) * perPage);
        for (const [j, s] of batch.entries()) {
            const x = MARGIN_X + (j % COLS) * CARD_W;
            const yTop = PAGE_H - TOP - Math.floor(j / COLS) * CARD_H;

            // Garis potong putus-putus
            page.drawRectangle({
                x,
                y: yTop - CARD_H,
                width: CARD_W,
                height: CARD_H,
                borderColor: rgb(0.75, 0.75, 0.75),
                borderWidth: 0.5,
                borderDashArray: [3, 3],
            });

            const png = await QRCode.toBuffer(tokenByStudent.get(s.id)!, { margin: 1, width: 300 });
            const image = await pdf.embedPng(png);
            page.drawImage(image, {
                x: x + (CARD_W - QR_SIZE) / 2,
                y: yTop - 10 - QR_SIZE,
                width: QR_SIZE,
                height: QR_SIZE,
            });

            let y = yTop - 10 - QR_SIZE - 14;
            for (const line of wrapText(s.nama, bold, 8.5, textW, 2)) {
                page.drawText(line, {
                    x: x + (CARD_W - bold.widthOfTextAtSize(line, 8.5)) / 2,
                    y,
                    size: 8.5,
                    font: bold,
                });
                y -= 11;
            }
            const info = [pdfSafe(formatKelas(s.jenjang, s.kelasSekarang)), s.nisn ? `NISN ${s.nisn}` : ""];
            for (const line of info.filter(Boolean)) {
                page.drawText(line, {
                    x: x + (CARD_W - font.widthOfTextAtSize(line, 7.5)) / 2,
                    y,
                    size: 7.5,
                    font,
                    color: GRAY,
                });
                y -= 10;
            }
        }
    }

    const bytes = await pdf.save();
    const tanggal = new Date().toISOString().slice(0, 10);
    const suffix = filter.kelas && filter.jenjang ? `-${filter.jenjang}-${filter.kelas.replace(/\s+/g, "")}` : "";

    logger.info("qr", "Export kartu QR", {
        ...requestContext(event),
        jumlah: cards.length,
        halaman: totalPages,
        mode: ids ? "terpilih" : "filter",
    });

    setResponseHeader(event, "Content-Type", "application/pdf");
    setResponseHeader(
        event,
        "Content-Disposition",
        `attachment; filename="kartu-qr-siswa${suffix}-${tanggal}.pdf"`,
    );
    return Buffer.from(bytes);
});
