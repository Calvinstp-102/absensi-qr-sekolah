import dayjs from "dayjs";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const from = toDbDate(
        (query.from as string) || dayjs().format("YYYY-MM-DD"),
    );
    const to = toDbDate((query.to as string) || dayjs().format("YYYY-MM-DD"));
    const jenjang = query.jenjang as string | undefined;
    const status = query.status as string | undefined;
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;

    const studentWhere = {
        deleted: false,
        status: "active" as const,
        ...(jenjang && { jenjang: jenjang as any }),
    };

    // Summary — selalu dihitung dari SEMUA status (termasuk tidak hadir),
    // hanya dipengaruhi filter jenjang & rentang tanggal, TIDAK oleh filter status listing
    const allInRange = await prisma.attendance.findMany({
        where: {
            tanggal: { gte: from, lte: to },
            deleted: false,
            student: studentWhere,
        },
        select: { statusUtama: true },
    });

    const summary = {
        total: await prisma.student.count({ where: studentWhere }),
        hadir: allInRange.filter((a) => a.statusUtama === "hadir").length,
        terlambat: allInRange.filter((a) => a.statusUtama === "terlambat")
            .length,
        tidakHadir: allInRange.filter((a) => a.statusUtama === "tidak_hadir")
            .length,
    };

    // Listing — default sembunyikan "tidak_hadir" (siswa yang gak absen sama sekali gak perlu nongol
    // di listing utama), kecuali guru eksplisit pilih filter status "tidak_hadir"
    const listingWhere: any = {
        tanggal: { gte: from, lte: to },
        deleted: false,
        student: studentWhere,
    };
    listingWhere.statusUtama = status ? status : { in: ["hadir", "terlambat"] };

    const totalRows = await prisma.attendance.count({ where: listingWhere });
    const attendances = await prisma.attendance.findMany({
        where: listingWhere,
        include: { student: true },
        orderBy: [{ tanggal: "desc" }, { student: { nama: "asc" } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    return {
        attendances,
        summary,
        pagination: {
            page,
            pageSize,
            total: totalRows,
            totalPages: Math.max(1, Math.ceil(totalRows / pageSize)),
        },
    };
});
