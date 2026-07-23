import cron from "node-cron";
import dayjs from "dayjs";

export default defineNitroPlugin(() => {
    // Cek tiap menit — bandingkan ke jam settingan yang dinamis
    cron.schedule("* * * * *", async () => {
        try {
            await runAttendanceCron();
        } catch (e) {
            console.error("[cron] attendance error:", e);
        }
    });

    // Sekali sehari jam 1 pagi — expire QR yang masa tenggangnya lewat, lalu hapus file fisiknya
    cron.schedule("0 1 * * *", async () => {
        try {
            await runQrCleanupCron();
        } catch (e) {
            console.error("[cron] qr cleanup error:", e);
        }
    });

    console.log("[cron] Attendance & QR expiry cron jobs registered");
});

async function runAttendanceCron() {
    const jamMasukGlobal = await getSettingValue("jam_masuk_global");
    const toleransi = Number(await getSettingValue("toleransi_telat_menit"));
    const tidakHadirDelay = Number(
        await getSettingValue("tidak_hadir_delay_menit"),
    );

    const [h, m] = jamMasukGlobal.split(":").map(Number);
    const now = dayjs();
    const cronATime = now
        .startOf("day")
        .hour(h)
        .minute(m + toleransi);
    const cronBTime = cronATime.add(tidakHadirDelay, "minute");

    if (now.isBefore(cronATime)) return;

    const today = toDbDate(now.format("YYYY-MM-DD"));

    // Cron A: siswa aktif yang belum punya record hari ini -> tandai Terlambat
    const activeStudents = await prisma.student.findMany({
        where: { status: "active" },
    });
    const todaysAttendance = await prisma.attendance.findMany({
        where: { tanggal: today },
    });
    const attendedIds = new Set(todaysAttendance.map((a) => a.studentId));

    for (const s of activeStudents) {
        if (!attendedIds.has(s.id)) {
            await prisma.attendance.create({
                data: {
                    studentId: s.id,
                    tanggal: today,
                    statusUtama: "terlambat",
                },
            });
        }
    }

    // Cron B: yang masih Terlambat & belum ada jam masuk sampai batas waktu -> Tidak Hadir
    if (now.isAfter(cronBTime)) {
        await prisma.attendance.updateMany({
            where: {
                tanggal: today,
                statusUtama: "terlambat",
                jamMasukAsli: null,
            },
            data: { statusUtama: "tidak_hadir" },
        });
    }
}

async function runQrCleanupCron() {
    const now = new Date();

    // Step 1: QR yang masa tenggangnya sudah lewat -> tandai expired + soft delete
    await prisma.qrCode.updateMany({
        where: {
            status: "grace_period",
            gracePeriodUntil: { lt: now },
            deleted: false,
        },
        data: { status: "expired", deleted: true },
    });

    // Step 2: semua QR yang sudah deleted -> hapus file fisiknya dari storage
    const deletedQrCodes = await prisma.qrCode.findMany({
        where: { deleted: true },
    });

    for (const qr of deletedQrCodes) {
        await deleteQrImage(qr.uuid);
    }
}
