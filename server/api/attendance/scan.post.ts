import { z } from "zod";

const scanSchema = z
    .object({
        token: z
            .string({ error: "QR tidak terbaca." })
            .trim()
            .min(1, "QR tidak terbaca.")
            .max(200, "QR tidak terdaftar di sistem."),
        mode: z.enum(["otomatis", "pulang_awal"], { error: "Mode scan tidak dikenal." }).default("otomatis"),
        alasan: z
            .string({ error: "Alasan harus berupa teks." })
            .trim()
            .max(255, "Alasan maksimal 255 karakter.")
            .optional(),
        sumber: z.enum(["kamera", "usb"], { error: "Sumber scan tidak dikenal." }).default("kamera"),
        deviceInfo: z.string().max(500).optional(),
    })
    .superRefine((v, ctx) => {
        if (v.mode === "pulang_awal" && (!v.alasan || v.alasan.length < 3)) {
            ctx.addIssue({
                code: "custom",
                path: ["alasan"],
                message: "Alasan izin pulang awal wajib diisi (minimal 3 karakter).",
            });
        }
    });

// Scan kartu QR siswa: absen masuk / pulang (semua role yang login)
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const body = await parseBody(event, scanSchema);
    const ctx = { ...requestContext(event), mode: body.mode, sumber: body.sumber };

    const now = new Date();
    const rules = await loadScanRules(now);
    assertSchoolDay(rules, ctx);

    const { qrId, student, view, info: qrInfo } = await resolveStudentByToken(body.token, ctx);
    const logCtx = { ...ctx, qrId, studentId: student.id };
    assertJenjangMasuk(rules, student.jenjang, logCtx, { student: view });
    const pencatat: Pencatat = {
        olehId: user.id,
        metode: "qr",
        catatan: body.mode === "pulang_awal" ? body.alasan! : null,
        deviceInfo: body.deviceInfo,
    };

    const result = await withScanRetry(() =>
        prisma.$transaction(async (tx) => {
            const existing = await findTodayAttendance(tx, student.id, rules);
            const keputusan = tentukanAksiScan(existing, student, body.mode, rules, now, { student: view });

            if (keputusan.aksi === "sudah_tercatat") {
                const att = await tx.attendance.findUniqueOrThrow({
                    where: { id: existing!.id },
                    include: attendanceViewInclude,
                });
                return { keputusan, att };
            }
            if (keputusan.aksi === "masuk") {
                return { keputusan, att: await catatMasuk(tx, existing, student.id, now, rules, pencatat) };
            }

            const att = await catatPulang(tx, existing!, now, keputusan.pulangAwal, pencatat);
            if (keputusan.pulangAwal) {
                await tx.auditLog.create({
                    data: {
                        teacherId: user.id,
                        actionType: "izin_pulang_awal",
                        entityType: "attendance",
                        entityId: att.id,
                        beforeValue: { jamPulang: null },
                        afterValue: { jamPulang: now, pulangAwal: true, metode: "qr" },
                        reason: body.alasan,
                    },
                });
            }
            return { keputusan, att };
        }),
    ).catch(logPenolakan("scan", "Scan", logCtx));

    const { keputusan, att } = result;
    const today = attendanceView(att, user, rules, now);

    if (keputusan.aksi === "sudah_tercatat") {
        const waktu = keputusan.jenis === "masuk" ? att.jamMasukAsli! : att.jamPulangAsli!;
        logger.info("scan", "Scan ganda diabaikan: sudah tercatat", { ...logCtx, attendanceId: att.id });
        return {
            result: "sudah_tercatat" as const,
            jenis: keputusan.jenis,
            message: `${student.nama} sudah tercatat ${keputusan.jenis} pukul ${formatJamWib(waktu)}.`,
            student: view,
            waktu,
            today,
            info: qrInfo,
        };
    }

    if (keputusan.aksi === "masuk") {
        const status = hitungStatusMasuk(now, rules);
        logger.info("scan", "Absen masuk", {
            ...logCtx,
            attendanceId: att.id,
            status: status.status,
            menitTerlambat: status.menitTerlambat,
        });
        return {
            result: "masuk" as const,
            jenis: "masuk" as const,
            message:
                status.status === "terlambat"
                    ? `Absen masuk tercatat, terlambat ${status.menitTerlambat} menit.`
                    : "Absen masuk tercatat, tepat waktu.",
            student: view,
            waktu: now,
            today,
            info: qrInfo,
        };
    }

    logger.info("scan", keputusan.pulangAwal ? "Absen pulang awal (izin)" : "Absen pulang", {
        ...logCtx,
        attendanceId: att.id,
    });
    return {
        result: "pulang" as const,
        jenis: "pulang" as const,
        message: keputusan.pulangAwal ? "Izin pulang awal tercatat." : "Absen pulang tercatat.",
        student: view,
        waktu: now,
        today,
        info: [keputusan.info, qrInfo].filter(Boolean).join(" ") || null,
    };
});
