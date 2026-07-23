export default defineEventHandler(async (event) => {
    const uuid = getRouterParam(event, "uuid");

    const student = await prisma.student.findUnique({
        where: { uuid },
        include: {
            classHistories: { orderBy: { dateCreated: "desc" } },
            attendances: { orderBy: { tanggal: "desc" }, take: 90 },
        },
    });

    if (!student || student.deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    const qr = await prisma.qrCode.findFirst({
        where: {
            relatedTo: "students",
            studentId: student.id,
            status: "active",
            deleted: false,
        },
    });

    const qrGracePeriodDays = Number(
        await getSettingValue("qr_grace_period_hari"),
    );

    const summary = {
        hadir: student.attendances.filter((a) => a.statusUtama === "hadir")
            .length,
        terlambat: student.attendances.filter(
            (a) => a.statusUtama === "terlambat",
        ).length,
        tidakHadir: student.attendances.filter(
            (a) => a.statusUtama === "tidak_hadir",
        ).length,
    };

    return { student, summary, qr, qrGracePeriodDays }
});
