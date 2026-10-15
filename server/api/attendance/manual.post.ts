import { z } from "zod";

const manualSchema = z.object({
    studentUuid: z.string({ error: "Pilih siswa." }).trim().min(1, "Pilih siswa.").max(50, "Siswa tidak valid."),
    jenis: z.enum(["masuk", "pulang"], { error: "Pilih absen masuk atau pulang." }),
    alasan: z
        .string({ error: "Alasan wajib diisi." })
        .trim()
        .min(3, "Alasan wajib diisi (minimal 3 karakter).")
        .max(255, "Alasan maksimal 255 karakter."),
});

// Absen manual (kartu tertinggal/rusak): semua role, wajib alasan, ter-audit
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const body = await parseBody(event, manualSchema);
    const ctx = { ...requestContext(event), jenis: body.jenis };

    const now = new Date();
    const rules = await loadScanRules(now);
    assertSchoolDay(rules, ctx);

    const student = await prisma.student.findUnique({
        where: { uuid: body.studentUuid },
        select: scanStudentSelect,
    });
    if (!student || student.deleted) throw appError(404, "Siswa tidak ditemukan atau sudah dihapus.");
    const view = studentView(student);
    const logCtx = { ...ctx, studentId: student.id };
    if (student.status !== "active") {
        logger.warn("absensi", "Absen manual ditolak: siswa nonaktif", logCtx);
        throw appError(
            403,
            `${student.nama} berstatus nonaktif${student.statusReason ? `: ${student.statusReason}` : ""}.`,
            { code: "STUDENT_INACTIVE", student: view },
        );
    }
    assertJenjangMasuk(rules, student.jenjang, logCtx, { student: view });

    const pencatat: Pencatat = { olehId: user.id, metode: "manual", catatan: body.alasan };

    const { att, pulangAwal } = await withScanRetry(() =>
        prisma.$transaction(async (tx) => {
            const existing = await findTodayAttendance(tx, student.id, rules);
            const aktif = existing && !existing.deleted ? existing : null;
            let att;
            let pulangAwal = false;

            if (body.jenis === "masuk") {
                if (aktif?.jamMasukAsli) {
                    throw appError(
                        409,
                        `${student.nama} sudah absen masuk pukul ${formatJamWib(aktif.jamMasukAsli)}.`,
                        { code: "ALREADY_RECORDED", student: view },
                    );
                }
                att = await catatMasuk(tx, existing, student.id, now, rules, pencatat);
            } else {
                if (!aktif?.jamMasukAsli) {
                    throw appError(
                        409,
                        `${student.nama} belum absen masuk hari ini. Catat absen masuk terlebih dahulu.`,
                        { code: "BELUM_MASUK", student: view },
                    );
                }
                if (aktif.jamPulangAsli) {
                    throw appError(
                        409,
                        `${student.nama} sudah absen pulang pukul ${formatJamWib(aktif.jamPulangAsli)}.`,
                        { code: "ALREADY_RECORDED", student: view },
                    );
                }
                // Pulang sebelum jam pulang dibuka otomatis dicatat sebagai pulang awal
                pulangAwal = now.getTime() < bukaPulangAt(student.jenjang, rules).getTime();
                att = await catatPulang(tx, aktif, now, pulangAwal, pencatat);
            }

            await tx.auditLog.create({
                data: {
                    teacherId: user.id,
                    actionType: "absen_manual",
                    entityType: "attendance",
                    entityId: att.id,
                    beforeValue: { jenis: body.jenis, waktu: null },
                    afterValue: {
                        jenis: body.jenis,
                        waktu: now,
                        statusUtama: att.statusUtama,
                        ...(body.jenis === "pulang" && { pulangAwal }),
                    },
                    reason: body.alasan,
                },
            });
            return { att, pulangAwal };
        }),
    ).catch(logPenolakan("absensi", "Absen manual", logCtx));

    logger.info("absensi", `Absen ${body.jenis} manual dicatat`, {
        ...logCtx,
        attendanceId: att.id,
        status: att.statusUtama,
        ...(body.jenis === "pulang" && { pulangAwal }),
    });

    const today = attendanceView(att, user, rules, now);
    let message: string;
    if (body.jenis === "masuk") {
        message =
            att.statusUtama === "terlambat"
                ? `Absen masuk manual tercatat, terlambat ${today.menitTerlambat} menit.`
                : "Absen masuk manual tercatat, tepat waktu.";
    } else {
        message = pulangAwal ? "Absen pulang manual tercatat sebagai pulang awal." : "Absen pulang manual tercatat.";
    }

    return { result: body.jenis, jenis: body.jenis, message, student: view, waktu: now, today, info: null };
});
