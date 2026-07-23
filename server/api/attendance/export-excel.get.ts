import ExcelJS from "exceljs";
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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Absensi");

    sheet.columns = [
        { header: "Tanggal", key: "tanggal", width: 14 },
        { header: "Nama", key: "nama", width: 25 },
        { header: "Jenjang", key: "jenjang", width: 10 },
        { header: "Kelas", key: "kelas", width: 10 },
        { header: "Jam Masuk", key: "jamMasuk", width: 12 },
        { header: "Jam Pulang", key: "jamPulang", width: 12 },
        { header: "Status", key: "status", width: 18 },
    ];

    for (const a of attendances) {
        sheet.addRow({
            tanggal: dayjs(a.tanggal).format("DD/MM/YYYY"),
            nama: a.student.nama,
            jenjang: a.student.jenjang,
            kelas: a.student.kelasSekarang,
            jamMasuk: a.jamMasukAsli
                ? dayjs(a.jamMasukAsli).format("HH:mm")
                : "-",
            jamPulang: a.jamPulangAsli
                ? dayjs(a.jamPulangAsli).format("HH:mm")
                : "-",
            status:
                a.statusKoreksi === "dimaklumi"
                    ? `${a.statusUtama} (Dimaklumi)`
                    : a.statusUtama,
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    setResponseHeader(
        event,
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    setResponseHeader(
        event,
        "Content-Disposition",
        `attachment; filename="absensi-${dayjs(from).format("YYYY-MM-DD")}_${dayjs(to).format("YYYY-MM-DD")}.xlsx"`,
    );
    return buffer;
});
