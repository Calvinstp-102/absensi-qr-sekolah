import { PDFDocument, StandardFonts } from "pdf-lib";
import dayjs from "dayjs";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const from = toDbDate(
        (query.from as string) || dayjs().format("YYYY-MM-DD"),
    );
    const to = toDbDate((query.to as string) || dayjs().format("YYYY-MM-DD"));

    const attendances = await prisma.attendance.findMany({
        where: {
            tanggal: { gte: from, lte: to },
            deleted: false,
            ...(query.status && { statusUtama: query.status as any }),
            student: {
                deleted: false,
                status: "active",
                ...(query.jenjang && { jenjang: query.jenjang as any }),
            },
        },
        include: { student: true },
        orderBy: [{ tanggal: "asc" }, { student: { nama: "asc" } }],
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595, 842]);
    let y = 800;

    page.drawText(
        `Laporan Absensi - ${dayjs(from).format("DD MMM YYYY")} s/d ${dayjs(to).format("DD MMM YYYY")}`,
        { x: 50, y, size: 12, font: boldFont },
    );
    y -= 30;

    const colX = [50, 110, 260, 320, 370, 430, 490];
    const headers = [
        "Tanggal",
        "Nama",
        "Jenjang",
        "Kelas",
        "Masuk",
        "Pulang",
        "Status",
    ];
    headers.forEach((h, i) =>
        page.drawText(h, { x: colX[i], y, size: 9, font: boldFont }),
    );
    y -= 15;

    for (const a of attendances) {
        if (y < 50) {
            page = pdfDoc.addPage([595, 842]);
            y = 800;
        }
        const row = [
            dayjs(a.tanggal).format("DD/MM/YY"),
            a.student.nama,
            a.student.jenjang,
            a.student.kelasSekarang,
            a.jamMasukAsli ? dayjs(a.jamMasukAsli).format("HH:mm") : "-",
            a.jamPulangAsli ? dayjs(a.jamPulangAsli).format("HH:mm") : "-",
            a.statusKoreksi === "dimaklumi"
                ? `${a.statusUtama} (D)`
                : a.statusUtama,
        ];
        row.forEach((val, i) =>
            page.drawText(String(val), {
                x: colX[i],
                y,
                size: 8,
                font,
                maxWidth: 55,
            }),
        );
        y -= 14;
    }

    const pdfBytes = await pdfDoc.save();
    setResponseHeader(event, "Content-Type", "application/pdf");
    setResponseHeader(
        event,
        "Content-Disposition",
        `attachment; filename="absensi-${dayjs(from).format("YYYY-MM-DD")}_${dayjs(to).format("YYYY-MM-DD")}.pdf"`,
    );
    return Buffer.from(pdfBytes);
});
