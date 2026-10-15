// Jumlah hari absensi terakhir yang ditampilkan di halaman detail
const ATTENDANCE_LIMIT = 90;

export default defineEventHandler(async (event) => {
    await requireAuth(event);
    const found = await findStudentOr404(event);

    const [student, qr, graceCount, graceSetting] = await Promise.all([
        prisma.student.findUniqueOrThrow({
            where: { id: found.id },
            select: {
                ...studentListSelect,
                tanggalLahir: true,
                alamat: true,
                namaOrtu: true,
                noHpOrtu: true,
                statusChangedAt: true,
                dateCreated: true,
                classHistories: {
                    where: { deleted: false },
                    orderBy: [{ dateCreated: "desc" }, { id: "desc" }],
                    select: {
                        id: true,
                        kelas: true,
                        tahunAjaran: true,
                        action: true,
                        reason: true,
                        dateCreated: true,
                        teacher: { select: { nama: true } },
                    },
                },
                attendances: {
                    where: { deleted: false },
                    orderBy: { tanggal: "desc" },
                    take: ATTENDANCE_LIMIT,
                    select: {
                        id: true,
                        tanggal: true,
                        jamMasukAsli: true,
                        jamPulangAsli: true,
                        statusUtama: true,
                        statusKoreksi: true,
                        alasanKoreksi: true,
                        dikoreksiAt: true,
                        teacher: { select: { nama: true } },
                        // Modul 2: cara & catatan absen masuk/pulang
                        masukMetode: true,
                        catatanMasuk: true,
                        pulangMetode: true,
                        catatanPulang: true,
                        pulangAwal: true,
                    },
                },
            },
        }),
        prisma.qrCode.findFirst({
            where: { relatedTo: "students", studentId: found.id, status: "active", deleted: false },
            select: { uuid: true, generatedAt: true, reason: true },
        }),
        prisma.qrCode.count({
            where: {
                relatedTo: "students",
                studentId: found.id,
                status: "grace_period",
                deleted: false,
                gracePeriodUntil: { gte: new Date() },
            },
        }),
        getSettingValue("qr_grace_period_hari"),
    ]);

    // tidakHadir = alpa (tanpa keterangan); sakit/izin dihitung terpisah (Modul 5)
    const summary = { hadir: 0, terlambat: 0, dimaklumi: 0, tidakHadir: 0, sakit: 0, izin: 0 };
    for (const a of student.attendances) {
        if (a.statusKoreksi === "sakit") summary.sakit++;
        else if (a.statusKoreksi === "izin") summary.izin++;
        else if (a.statusUtama === "hadir") summary.hadir++;
        else if (a.statusUtama === "tidak_hadir") summary.tidakHadir++;
        else if (a.statusKoreksi === "dimaklumi") summary.dimaklumi++;
        else summary.terlambat++;
    }

    return {
        student,
        summary,
        qr,
        qrGraceCount: graceCount,
        qrGracePeriodDays: Number(graceSetting) || 0,
        attendanceLimit: ATTENDANCE_LIMIT,
    };
});
