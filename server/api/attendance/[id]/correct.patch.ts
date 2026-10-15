import { z } from "zod";

const paramsSchema = z.object({
    id: z.coerce
        .number({ error: "Data absensi tidak valid." })
        .int("Data absensi tidak valid.")
        .positive("Data absensi tidak valid."),
});

const correctSchema = z.object({
    reason: z
        .string({ error: "Alasan koreksi wajib diisi." })
        .trim()
        .min(3, "Alasan koreksi wajib diisi (minimal 3 karakter).")
        .max(255, "Alasan koreksi maksimal 255 karakter."),
});

// Koreksi = keterlambatan dimaklumi (semua role boleh, wajib alasan, ter-audit)
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const params = paramsSchema.safeParse(getRouterParams(event));
    if (!params.success) throw appError(404, "Data absensi tidak ditemukan.");
    const { id } = params.data;
    const body = await parseBody(event, correctSchema);
    const ctx = { ...requestContext(event), attendanceId: id };

    const before = await prisma.attendance.findUnique({
        where: { id },
        include: { student: { select: { id: true, deleted: true } } },
    });
    if (!before || before.deleted || before.student.deleted) {
        throw appError(404, "Data absensi tidak ditemukan atau sudah dihapus.");
    }
    if (before.statusKoreksi) {
        logger.warn("absensi", "Koreksi ditolak: sudah dikoreksi", ctx);
        throw appError(409, "Absensi ini sudah dikoreksi sebelumnya.");
    }
    if (before.statusUtama !== "terlambat") {
        logger.warn("absensi", "Koreksi ditolak: status bukan terlambat", { ...ctx, status: before.statusUtama });
        throw appError(409, "Hanya absensi berstatus Terlambat yang dapat dikoreksi menjadi Dimaklumi.");
    }

    const updated = await prisma.$transaction(async (tx) => {
        // Syarat dicek ulang agar dua koreksi bersamaan tidak sama-sama tersimpan
        const res = await tx.attendance.updateMany({
            where: { id, statusKoreksi: null, deleted: false },
            data: {
                statusKoreksi: "dimaklumi",
                alasanKoreksi: body.reason,
                dikoreksiOleh: user.id,
                dikoreksiAt: new Date(),
            },
        });
        if (!res.count) throw appError(409, "Absensi ini sudah dikoreksi sebelumnya.");
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "correct_attendance",
                entityType: "attendance",
                entityId: id,
                beforeValue: { statusUtama: before.statusUtama, statusKoreksi: null },
                afterValue: { statusUtama: before.statusUtama, statusKoreksi: "dimaklumi" },
                reason: body.reason,
            },
        });
        return tx.attendance.findUniqueOrThrow({ where: { id } });
    });

    logger.info("absensi", "Absensi dikoreksi: dimaklumi", {
        ...ctx,
        studentId: before.studentId,
        tanggal: before.tanggal.toISOString().slice(0, 10),
    });

    return { attendance: updated, message: "Keterlambatan ditandai Dimaklumi." };
});
