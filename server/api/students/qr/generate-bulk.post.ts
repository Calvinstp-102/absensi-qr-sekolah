import { randomUUID } from "node:crypto";
import { z } from "zod";

const REASON = "Generate QR massal";

// Pilih siswa dengan daftar id (centang) ATAU filter daftar ("pilih semua hasil filter")
const bulkSchema = z
    .object({
        studentIds: studentIdsSchema.optional(),
        filter: withFilterKelasCheck(z.object(studentFilterShape)).optional(),
    })
    .refine((v) => !!v.studentIds !== !!v.filter, {
        message: "Pilih siswa terlebih dahulu.",
        path: ["studentIds"],
    });

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, bulkSchema);
    const { where } = await resolveBulkWhere(body);

    const students = await prisma.student.findMany({
        where,
        select: { id: true, nama: true, status: true, hasQr: true },
        orderBy: studentOrderBy,
    });

    // Hanya siswa aktif yang belum punya QR; QR yang sudah ada tidak diganti
    const skipped: { id: number; nama: string; alasan: string }[] = [];
    const eligible: typeof students = [];
    for (const s of students) {
        if (s.status !== "active") skipped.push({ id: s.id, nama: s.nama, alasan: "Siswa berstatus nonaktif." });
        else if (s.hasQr) skipped.push({ id: s.id, nama: s.nama, alasan: "Sudah punya QR aktif." });
        else eligible.push(s);
    }

    const issued = eligible.map((s) => ({ studentId: s.id, uuid: randomUUID(), token: generateQrToken() }));

    if (issued.length) {
        await prisma.$transaction(async (tx) => {
            const ids = issued.map((q) => q.studentId);
            // Cek ulang di dalam transaksi: siswa yang sudah dibuatkan QR oleh proses lain dibatalkan
            const res = await tx.student.updateMany({
                where: { id: { in: ids }, hasQr: false, status: "active", deleted: false },
                data: { hasQr: true },
            });
            if (res.count !== ids.length) {
                throw appError(409, "Data QR siswa berubah saat diproses. Muat ulang lalu coba lagi.");
            }
            await tx.qrCode.createMany({
                data: issued.map((q) => ({
                    uuid: q.uuid,
                    relatedTo: "students" as const,
                    studentId: q.studentId,
                    token: q.token,
                    status: "active" as const,
                    generatedBy: user.id,
                    reason: REASON,
                })),
            });
            await tx.auditLog.createMany({
                data: issued.map((q) => ({
                    teacherId: user.id,
                    actionType: "generate_qr",
                    entityType: "student",
                    entityId: q.studentId,
                    beforeValue: { qrCodeId: null },
                    afterValue: { qrUuid: q.uuid },
                    reason: REASON,
                })),
            });
        });

        for (const q of issued) await saveQrImageSafe(q.uuid, q.token);
    }

    const context = {
        ...requestContext(event),
        mode: body.studentIds ? "terpilih" : "filter",
        dibuat: issued.length,
        dilewati: skipped.length,
    };
    if (issued.length) logger.info("qr", "Generate QR massal", context);
    else logger.warn("qr", "Generate QR massal: tidak ada siswa yang memenuhi syarat", context);

    return {
        generated: issued.length,
        skipped,
        message: issued.length
            ? `${issued.length} QR berhasil dibuat.`
            : "Tidak ada QR yang dibuat. Semua siswa terpilih sudah punya QR atau nonaktif.",
    };
});
