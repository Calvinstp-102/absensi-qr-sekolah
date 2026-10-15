import { z } from "zod";

const registerSchema = z.object({
    token: z
        .string({ error: "QR belum terbaca." })
        .trim()
        .min(1, "QR belum terbaca.")
        .max(191, "Isi QR terlalu panjang. Gunakan kartu QR absensi."),
    reason: z
        .string({ error: "Alasan harus berupa teks." })
        .trim()
        .max(255, "Alasan maksimal 255 karakter.")
        .nullish()
        .transform((v) => v || "Daftarkan kartu QR yang sudah ada"),
});

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, registerSchema);
    const student = await findStudentOr404(event);
    const ctx = { ...requestContext(event), studentId: student.id };

    if (student.status !== "active") {
        logger.warn("qr", "Daftarkan QR ditolak: siswa nonaktif", ctx);
        throw appError(409, "Siswa nonaktif tidak dapat didaftarkan QR. Aktifkan siswa terlebih dahulu.");
    }

    // Token unik di database, termasuk QR yang sudah dihapus/kedaluwarsa
    const existing = await prisma.qrCode.findUnique({
        where: { token: body.token },
        include: { student: { select: { nama: true, jenjang: true, kelasSekarang: true, deleted: true } } },
    });
    const ownedBySelf = existing?.relatedTo === "students" && existing.studentId === student.id;

    if (existing && !ownedBySelf) {
        logger.warn("qr", "Daftarkan QR ditolak: kartu milik pihak lain", { ...ctx, qrId: existing.id });
        const other = existing.student;
        throw appError(
            409,
            other && !other.deleted
                ? `Kartu QR ini sudah terdaftar untuk siswa lain: ${other.nama} (${formatKelas(other.jenjang, other.kelasSekarang)}).`
                : "Kartu QR ini pernah dipakai akun lain sehingga tidak dapat didaftarkan. Gunakan kartu lain atau Generate QR.",
        );
    }
    if (existing && ownedBySelf && existing.status === "active" && !existing.deleted) {
        throw appError(409, "Kartu QR ini sudah menjadi QR aktif siswa ini.");
    }

    const grace = await qrGraceUntil();
    const result = await prisma.$transaction(async (tx) => {
        const previous = await moveActiveQrToGrace(tx, student.id, grace.until);
        let qr: { id: number; uuid: string; token: string };
        if (existing) {
            // Kartu lama milik siswa ini sendiri (pernah dihapus/kedaluwarsa) -> aktifkan kembali
            qr = await tx.qrCode.update({
                where: { id: existing.id },
                data: {
                    status: "active",
                    deleted: false,
                    gracePeriodUntil: null,
                    generatedBy: user.id,
                    reason: body.reason,
                },
                select: { id: true, uuid: true, token: true },
            });
            await tx.student.update({ where: { id: student.id }, data: { hasQr: true } });
        } else {
            qr = await issueStudentQr(tx, {
                studentId: student.id,
                token: body.token,
                generatedBy: user.id,
                reason: body.reason,
            });
        }
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "register_qr",
                entityType: "student",
                entityId: student.id,
                beforeValue: { qrCodeId: previous?.id ?? null },
                afterValue: { qrCodeId: qr.id, diaktifkanKembali: !!existing },
                reason: body.reason,
            },
        });
        return { qr, previous };
    });

    await saveQrImageSafe(result.qr.uuid, result.qr.token);

    logger.info("qr", existing ? "Kartu QR lama diaktifkan kembali" : "Kartu QR didaftarkan", {
        ...ctx,
        qrId: result.qr.id,
        qrLamaMasaTenggang: result.previous?.id ?? null,
    });

    return {
        qrUuid: result.qr.uuid,
        message: existing
            ? "Kartu QR lama siswa ini diaktifkan kembali."
            : "Kartu QR berhasil didaftarkan.",
    };
});
