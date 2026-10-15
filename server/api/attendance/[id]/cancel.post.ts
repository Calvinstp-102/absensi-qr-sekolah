import { z } from "zod";

const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const cancelSchema = z.object({
    jenis: z.enum(["masuk", "pulang"], { error: "Pilih absen masuk atau pulang yang dibatalkan." }),
    alasan: z
        .string({ error: "Alasan pembatalan wajib diisi." })
        .trim()
        .min(3, "Alasan pembatalan wajib diisi (minimal 3 karakter).")
        .max(255, "Alasan maksimal 255 karakter."),
});

// Batalkan absen masuk/pulang hari ini: pencatatnya sendiri dalam batas waktu, atau Admin kapan saja di hari itu
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const params = paramsSchema.safeParse(getRouterParams(event));
    if (!params.success) throw appError(404, "Data absensi tidak ditemukan.");
    const { id } = params.data;
    const body = await parseBody(event, cancelSchema);
    const ctx = { ...requestContext(event), attendanceId: id, jenis: body.jenis };

    const now = new Date();
    const rules = await loadScanRules(now);

    const before = await prisma.attendance.findUnique({
        where: { id },
        include: { student: { select: scanStudentSelect } },
    });
    if (!before || before.deleted || before.student.deleted) {
        throw appError(404, "Data absensi tidak ditemukan atau sudah dibatalkan.");
    }
    const check = cekBatal(before, body.jenis, user, rules, now);
    if (!check.boleh) {
        logger.warn("absensi", "Pembatalan ditolak", { ...ctx, alasan: check.alasan });
        throw appError(409, check.alasan ?? "Absensi ini tidak dapat dibatalkan.", { code: "CANCEL_NOT_ALLOWED" });
    }

    const beforeValue =
        body.jenis === "masuk"
            ? { jamMasuk: before.jamMasukAsli, statusUtama: before.statusUtama, metode: before.masukMetode }
            : { jamPulang: before.jamPulangAsli, pulangAwal: before.pulangAwal, metode: before.pulangMetode };

    await prisma.$transaction(async (tx) => {
        // Syarat dicek ulang di dalam transaksi agar tidak bentrok dengan scan/batal lain
        const res =
            body.jenis === "pulang"
                ? await tx.attendance.updateMany({
                      where: { id, deleted: false, jamPulangAsli: before.jamPulangAsli },
                      data: {
                          jamPulangAsli: null,
                          pulangMetode: null,
                          pulangOleh: null,
                          catatanPulang: null,
                          pulangAwal: false,
                      },
                  })
                : // Batal masuk = dianggap belum absen. Kalau batas telat sudah lewat, cron menandai lagi.
                  await tx.attendance.updateMany({
                      where: { id, deleted: false, jamMasukAsli: before.jamMasukAsli, jamPulangAsli: null },
                      data: { deleted: true },
                  });
        if (!res.count) {
            throw appError(409, "Data absensi baru saja berubah. Muat ulang lalu coba lagi.", {
                code: "CANCEL_NOT_ALLOWED",
            });
        }
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: body.jenis === "masuk" ? "batal_absen_masuk" : "batal_absen_pulang",
                entityType: "attendance",
                entityId: id,
                beforeValue,
                afterValue: body.jenis === "masuk" ? { jamMasuk: null, dibatalkan: true } : { jamPulang: null },
                reason: body.alasan,
            },
        });
    });

    logger.info("absensi", `Absen ${body.jenis} dibatalkan`, { ...ctx, studentId: before.studentId });

    return {
        message: `Absen ${body.jenis} ${before.student.nama} dibatalkan.`,
        student: studentView(before.student),
    };
});
