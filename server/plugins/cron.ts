import cron from "node-cron";

// Semua jadwal memakai WIB, tidak tergantung timezone server (Railway = UTC)
const TZ = { timezone: "Asia/Jakarta" };

// QR yang berubah status dalam N hari terakhir yang file gambarnya dibersihkan
const QR_CLEANUP_LOOKBACK_DAYS = 7;

export default defineNitroPlugin(() => {
    // Cek tiap menit — bandingkan ke jam settingan yang dinamis
    cron.schedule("* * * * *", () => runLocked("absensi", runAttendanceCron), TZ);

    // Sekali sehari jam 1 pagi WIB — expire QR yang masa tenggangnya lewat, lalu hapus file fisiknya
    cron.schedule("0 1 * * *", () => runLocked("qr", runQrCleanupCron), TZ);

    // Tiap hari 00:05 WIB — hapus file log yang lebih tua dari LOG_RETENTION_DAYS hari.
    // Juga dijalankan saat server start, kalau-kalau server mati saat jadwalnya.
    cron.schedule("5 0 * * *", runLogCleanup, TZ);
    void runLogCleanup();

    logger.info(
        "cron",
        "Cron absensi, pembersihan QR & pembersihan log terdaftar",
    );
});

// Lock dalam proses: run berikutnya dilewati kalau run sebelumnya belum selesai
const running = new Set<string>();

async function runLocked(name: string, job: () => Promise<void>) {
    if (running.has(name)) return;
    running.add(name);
    try {
        await job();
    } catch (e) {
        logger.error("cron", `Cron ${name} gagal`, undefined, e);
    } finally {
        running.delete(name);
    }
}

async function runLogCleanup() {
    try {
        const deleted = await cleanupOldLogs();
        if (deleted.length > 0) {
            logger.info(
                "system",
                `Hapus ${deleted.length} file log lama (lebih dari ${LOG_RETENTION_DAYS} hari): ${deleted.join(", ")}`,
            );
        }
    } catch (e) {
        logger.error("system", "Gagal menghapus file log lama", undefined, e);
    }
}

// Tanggal terakhir yang sudah dicatat "bukan hari sekolah" (agar cukup 1 baris log per hari)
let liburDicatat: string | null = null;
// Sama, untuk libur khusus jenjang ("2026-10-15|SMP")
let liburJenjangDicatat: string | null = null;

async function runAttendanceCron() {
    const now = new Date();
    const rules = await loadScanRules(now);
    if (now < rules.batasTelatAt) return;

    if (!rules.isSchoolDay) {
        if (liburDicatat !== rules.tanggal) {
            liburDicatat = rules.tanggal;
            logger.info("cron", `Cron absensi dilewati: ${rules.alasanLibur}`, { tanggal: rules.tanggal });
        }
        return;
    }

    // Libur khusus jenjang: siswa jenjang tsb tidak ditandai Terlambat/Tidak Hadir
    const libur = jenjangLibur(rules);
    const liburKey = `${rules.tanggal}|${libur.join(",")}`;
    if (libur.length > 0 && liburJenjangDicatat !== liburKey) {
        liburJenjangDicatat = liburKey;
        logger.info("cron", `Cron absensi melewati jenjang yang libur: ${libur.join(", ")}`, { tanggal: rules.tanggal });
    }

    const tanggal = toDbDate(rules.tanggal);
    const siswaAktif = {
        status: "active" as const,
        deleted: false,
        ...(libur.length > 0 ? { jenjang: { notIn: libur } } : {}),
    };

    // Cron A: siswa aktif yang belum punya absensi hari ini -> Terlambat (tanpa jam masuk)
    const belumAda = await prisma.student.count({
        where: { ...siswaAktif, attendances: { none: { tanggal, deleted: false } } },
    });
    if (belumAda > 0) {
        const students = await prisma.student.findMany({
            where: { ...siswaAktif, attendances: { none: { tanggal, deleted: false } } },
            select: { id: true },
        });
        const ids = students.map((s) => s.id);

        // Baris yang pernah dibatalkan (deleted) dihidupkan lagi sebagai Terlambat
        const revived = await prisma.attendance.updateMany({
            where: { tanggal, deleted: true, studentId: { in: ids } },
            data: {
                deleted: false,
                statusUtama: "terlambat",
                jamMasukAsli: null,
                masukMetode: null,
                masukOleh: null,
                catatanMasuk: null,
                jamPulangAsli: null,
                pulangMetode: null,
                pulangOleh: null,
                catatanPulang: null,
                pulangAwal: false,
                statusKoreksi: null,
                alasanKoreksi: null,
                dikoreksiOleh: null,
                dikoreksiAt: null,
            },
        });
        // Sisanya dibuat baru; skipDuplicates aman bila bersamaan dengan scan
        const created = await prisma.attendance.createMany({
            data: ids.map((studentId) => ({ studentId, tanggal, statusUtama: "terlambat" as const })),
            skipDuplicates: true,
        });
        const markedLate = revived.count + created.count;
        if (markedLate > 0) {
            logger.info("cron", `${markedLate} siswa belum scan, ditandai Terlambat`, { tanggal: rules.tanggal });
        }
    }

    // Cron B: yang masih Terlambat & belum ada jam masuk sampai batas waktu -> Tidak Hadir
    if (now >= rules.tidakHadirAt) {
        const { count } = await prisma.attendance.updateMany({
            where: {
                tanggal,
                deleted: false,
                statusUtama: "terlambat",
                jamMasukAsli: null,
                ...(libur.length > 0 ? { student: { jenjang: { notIn: libur } } } : {}),
            },
            data: { statusUtama: "tidak_hadir" },
        });
        if (count > 0) {
            logger.info(
                "cron",
                `${count} siswa tidak scan sampai batas waktu, ditandai Tidak Hadir`,
                { tanggal: rules.tanggal },
            );
        }
    }
}

async function runQrCleanupCron() {
    const now = new Date();

    // Step 1: QR yang masa tenggangnya sudah lewat -> tandai expired + soft delete
    const expired = await prisma.qrCode.updateMany({
        where: {
            status: "grace_period",
            gracePeriodUntil: { lt: now },
            deleted: false,
        },
        data: { status: "expired", deleted: true },
    });

    // Step 2: QR tidak berlaku yang berubah beberapa hari terakhir -> hapus file fisiknya dari storage
    // (yang lebih lama sudah dibersihkan di run sebelumnya)
    const since = new Date(now.getTime() - QR_CLEANUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const deletedQrCodes = await prisma.qrCode.findMany({
        where: {
            OR: [{ deleted: true }, { status: "expired" }],
            dateModified: { gte: since },
        },
        select: { uuid: true },
    });

    for (const qr of deletedQrCodes) {
        await deleteQrImage(qr.uuid);
    }

    if (expired.count > 0 || deletedQrCodes.length > 0) {
        logger.info("cron", "Pembersihan QR selesai", {
            qrKedaluwarsa: expired.count,
            fileQrDiproses: deletedQrCodes.length,
        });
    }
}
