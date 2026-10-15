import { z } from "zod";
import { ADMIN_ROLES } from "../../utils/auth";

const keteranganSchema = z.object({
    studentUuid: z.string({ error: "Pilih siswa." }).trim().min(1, "Pilih siswa.").max(50, "Siswa tidak valid."),
    tanggal: z
        .string({ error: "Tanggal wajib diisi." })
        .trim()
        .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && toDbDate(v).toISOString().slice(0, 10) === v, "Tanggal tidak valid."),
    jenis: z.enum(["sakit", "izin", "alpa"], { error: "Pilih keterangan: Sakit, Izin, atau Alpa." }),
    alasan: z
        .string({ error: "Alasan wajib diisi." })
        .trim()
        .min(3, "Alasan wajib diisi (minimal 3 karakter).")
        .max(255, "Alasan maksimal 255 karakter."),
});

const LABEL = { sakit: "Sakit", izin: "Izin", alpa: "Alpa" } as const;

// Keterangan ketidakhadiran (Modul 5): Sakit/Izin oleh semua role, kembalikan ke Alpa hanya Admin/Superadmin.
// Bisa dicatat sebelum cron membuat baris (mis. ortu mengabari pagi hari).
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const body = await parseBody(event, keteranganSchema);
    const ctx = { ...requestContext(event), jenis: body.jenis, tanggal: body.tanggal };

    if (body.jenis === "alpa" && !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
        logger.warn("absensi", "Keterangan ditolak: bukan admin", ctx);
        throw appError(403, "Mengembalikan keterangan menjadi Alpa hanya dapat dilakukan oleh Admin atau Superadmin.");
    }

    const today = todayWibStr();
    if (body.tanggal > today) {
        throw appError(422, "Keterangan hanya dapat dicatat untuk hari ini atau hari sebelumnya.", {
            code: "VALIDATION_ERROR",
            fieldErrors: { tanggal: "Tanggal tidak boleh setelah hari ini." },
        });
    }

    const student = await prisma.student.findUnique({
        where: { uuid: body.studentUuid },
        select: { id: true, nama: true, jenjang: true, status: true, deleted: true, dateCreated: true },
    });
    if (!student || student.deleted) throw appError(404, "Siswa tidak ditemukan atau sudah dihapus.");
    const logCtx = { ...ctx, studentId: student.id };
    if (student.status !== "active") {
        throw appError(409, `${student.nama} berstatus nonaktif, keterangan tidak dapat dicatat.`);
    }
    if (body.tanggal < wibInfo(student.dateCreated).tanggal) {
        throw appError(409, `${student.nama} belum terdaftar pada tanggal tersebut.`);
    }

    // Harus hari sekolah & bukan libur jenjang siswa
    const kalender = await loadKalender(body.tanggal, body.tanggal);
    const libur = kalender.keteranganLibur(body.tanggal, student.jenjang);
    if (libur) {
        throw appError(409, `Tanggal tersebut bukan hari sekolah untuk ${student.jenjang} (${libur}).`, { code: "NOT_SCHOOL_DAY" });
    }
    // Hari lalu tanpa data sama sekali = sistem belum dipakai; mencatat di sana membuat siswa lain "tidak tercatat"
    if (body.tanggal !== today && kalender.statusHari(body.tanggal, student.jenjang) === "tanpa_data") {
        throw appError(409, "Belum ada data absensi pada tanggal tersebut (sistem belum dipakai), keterangan tidak dapat dicatat.");
    }

    const tanggal = toDbDate(body.tanggal);
    const existing = await prisma.attendance.findUnique({ where: { studentId_tanggal: { studentId: student.id, tanggal } } });
    const aktif = existing && !existing.deleted ? existing : null;

    if (aktif?.jamMasukAsli) {
        logger.warn("absensi", "Keterangan ditolak: siswa sudah absen masuk", logCtx);
        throw appError(409, `${student.nama} sudah absen masuk pukul ${formatJamWib(aktif.jamMasukAsli)}, tidak dapat diberi keterangan tidak hadir.`);
    }
    if (aktif?.statusKoreksi === "dimaklumi") {
        throw appError(409, "Absensi ini sudah ditandai Terlambat (Dimaklumi).");
    }
    if (body.jenis === "alpa" && !(aktif?.statusKoreksi === "sakit" || aktif?.statusKoreksi === "izin")) {
        throw appError(409, "Siswa ini tidak memiliki keterangan Sakit/Izin pada tanggal tersebut.");
    }
    if (body.jenis !== "alpa" && aktif?.statusKoreksi === body.jenis) {
        throw appError(409, `${student.nama} sudah tercatat ${LABEL[body.jenis]} pada tanggal tersebut.`);
    }

    const before = aktif ? { statusUtama: aktif.statusUtama, statusKoreksi: aktif.statusKoreksi } : null;
    const keterangan =
        body.jenis === "alpa"
            ? { statusKoreksi: null, alasanKoreksi: null, dikoreksiOleh: null, dikoreksiAt: null }
            : { statusKoreksi: body.jenis, alasanKoreksi: body.alasan, dikoreksiOleh: user.id, dikoreksiAt: new Date() };
    const kosong = {
        jamMasukAsli: null,
        masukMetode: null,
        masukOleh: null,
        catatanMasuk: null,
        jamPulangAsli: null,
        pulangMetode: null,
        pulangOleh: null,
        catatanPulang: null,
        pulangAwal: false,
    };

    const att = await prisma
        .$transaction(async (tx) => {
            let att;
            if (!existing) {
                att = await tx.attendance.create({
                    data: { studentId: student.id, tanggal, statusUtama: "tidak_hadir", ...keterangan },
                });
            } else {
                // Syarat dicek ulang di dalam transaksi agar tidak bentrok dengan scan yang bersamaan
                const res = await tx.attendance.updateMany({
                    where: existing.deleted
                        ? { id: existing.id, deleted: true }
                        : { id: existing.id, deleted: false, jamMasukAsli: null, statusKoreksi: existing.statusKoreksi },
                    data: existing.deleted
                        ? { ...kosong, deleted: false, statusUtama: "tidak_hadir", ...keterangan }
                        : { statusUtama: "tidak_hadir", ...keterangan },
                });
                if (!res.count) throw appError(409, "Data absensi baru saja berubah. Muat ulang lalu coba lagi.");
                att = await tx.attendance.findUniqueOrThrow({ where: { id: existing.id } });
            }
            await tx.auditLog.create({
                data: {
                    teacherId: user.id,
                    actionType: "keterangan_absensi",
                    entityType: "attendance",
                    entityId: att.id,
                    beforeValue: before ?? { status: "belum ada data" },
                    afterValue: { statusUtama: "tidak_hadir", statusKoreksi: keterangan.statusKoreksi, tanggal: body.tanggal },
                    reason: body.alasan,
                },
            });
            return att;
        })
        .catch((e: unknown) => {
            // Scan/cron bersamaan membuat baris lebih dulu
            if ((e as { code?: string })?.code === "P2002") {
                throw appError(409, "Data absensi baru saja berubah. Muat ulang lalu coba lagi.");
            }
            throw e;
        });

    logger.info("absensi", `Keterangan absensi: ${LABEL[body.jenis]}`, { ...logCtx, attendanceId: att.id });

    return {
        status: "ok",
        attendanceId: att.id,
        message:
            body.jenis === "alpa"
                ? `Keterangan ${student.nama} dikembalikan menjadi Alpa.`
                : `${student.nama} dicatat ${LABEL[body.jenis]} pada ${formatTanggalPanjang(body.tanggal)}.`,
    };
});
