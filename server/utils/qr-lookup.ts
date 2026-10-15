// Cari siswa pemilik token QR dengan pesan penolakan yang jelas.
// Token tidak pernah dicatat ke log; yang dicatat cukup id QR / siswa.

export async function resolveStudentByToken(token: string, ctx: Record<string, unknown>) {
    const qr = await prisma.qrCode.findUnique({
        where: { token },
        select: {
            id: true,
            relatedTo: true,
            status: true,
            deleted: true,
            gracePeriodUntil: true,
            dateModified: true,
            student: { select: scanStudentSelect },
        },
    });

    if (!qr || qr.relatedTo !== "students" || !qr.student) {
        logger.warn("scan", "Scan ditolak: QR tidak terdaftar", ctx);
        throw appError(404, "QR tidak terdaftar di sistem. Pastikan yang di-scan adalah kartu absensi siswa.", {
            code: "QR_NOT_FOUND",
        });
    }

    const student = qr.student;
    const logCtx = { ...ctx, qrId: qr.id, studentId: student.id };

    if (student.deleted) {
        logger.warn("scan", "Scan ditolak: siswa sudah dihapus", logCtx);
        throw appError(404, `Data siswa pemilik QR ini (${student.nama}) sudah dihapus dari sistem.`, {
            code: "QR_NOT_FOUND",
        });
    }

    const view = studentView(student);
    const now = new Date();
    const masaTenggangHabis = qr.status === "grace_period" && (!qr.gracePeriodUntil || qr.gracePeriodUntil < now);
    if (qr.deleted || qr.status === "expired" || masaTenggangHabis) {
        const sejak = masaTenggangHabis && qr.gracePeriodUntil ? qr.gracePeriodUntil : qr.dateModified;
        logger.warn("scan", "Scan ditolak: QR kedaluwarsa", logCtx);
        throw appError(
            410,
            `QR milik ${student.nama} sudah tidak berlaku sejak ${formatTanggalPanjang(todayWibStr(sejak))}. Gunakan kartu QR terbaru.`,
            { code: "QR_EXPIRED", student: view },
        );
    }

    if (student.status !== "active") {
        const sejak = student.statusChangedAt
            ? ` sejak ${formatTanggalPanjang(todayWibStr(student.statusChangedAt))}`
            : "";
        logger.warn("scan", "Scan ditolak: siswa nonaktif", logCtx);
        throw appError(
            403,
            `${student.nama} berstatus nonaktif${sejak}${student.statusReason ? `: ${student.statusReason}` : ""}.`,
            { code: "STUDENT_INACTIVE", student: view },
        );
    }

    const info =
        qr.status === "grace_period" && qr.gracePeriodUntil
            ? `Kartu QR lama, masih berlaku sampai ${formatTanggalPanjang(todayWibStr(qr.gracePeriodUntil))} ${formatJamWib(qr.gracePeriodUntil)}. Segera ganti dengan kartu terbaru.`
            : null;

    return { qrId: qr.id, student, view, info };
}
