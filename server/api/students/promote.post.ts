import { z } from "zod";

const MAX_STUDENTS = 200;

const promoteSchema = withPromoteKelasCheck(
    z.object({
        ...promoteSourceShape,
        studentIds: z
            .array(z.number({ error: "Id siswa tidak valid." }).int().positive(), {
                error: "Pilih siswa yang akan diproses.",
            })
            .min(1, "Pilih minimal 1 siswa.")
            .max(MAX_STUDENTS, `Maksimal ${MAX_STUDENTS} siswa sekali proses.`),
        reason: z
            .string({ error: "Alasan wajib diisi." })
            .trim()
            .min(3, "Alasan wajib diisi (minimal 3 karakter).")
            .max(255, "Alasan maksimal 255 karakter."),
    }),
);

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, promoteSchema);
    const target = promoteTarget(body.jenjang, body.kelas);
    const asal = formatKelas(body.jenjang, body.kelas);
    const tahunAjaran = await getSettingValue("tahun_ajaran_aktif");
    const ids = [...new Set(body.studentIds)];

    const students = await prisma.student.findMany({
        where: { id: { in: ids } },
        select: { id: true, nama: true, jenjang: true, kelasSekarang: true, status: true, deleted: true },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    const promoted = await alreadyPromotedIds(ids, tahunAjaran);

    // Siswa yang tidak memenuhi syarat dilewati (tidak membatalkan siswa lain) + alasannya
    const skipped: { id: number; nama: string; alasan: string }[] = [];
    const eligible: number[] = [];
    for (const id of ids) {
        const s = byId.get(id);
        if (!s || s.deleted) {
            skipped.push({ id, nama: s?.nama ?? `#${id}`, alasan: "Tidak ditemukan atau sudah dihapus." });
        } else if (s.status !== "active") {
            skipped.push({ id, nama: s.nama, alasan: "Siswa berstatus nonaktif." });
        } else if (s.jenjang !== body.jenjang || s.kelasSekarang !== body.kelas) {
            skipped.push({
                id,
                nama: s.nama,
                alasan: `Sudah tidak di ${asal} (sekarang ${formatKelas(s.jenjang, s.kelasSekarang)}).`,
            });
        } else if (promoted.has(id)) {
            skipped.push({ id, nama: s.nama, alasan: `Sudah naik kelas/lulus di tahun ajaran ${tahunAjaran}.` });
        } else {
            eligible.push(id);
        }
    }

    if (eligible.length) {
        await prisma.$transaction(async (tx) => {
            // Syarat dicek ulang di dalam transaksi agar aman dari proses bersamaan
            const res = await tx.student.updateMany({
                where: {
                    id: { in: eligible },
                    deleted: false,
                    status: "active",
                    jenjang: body.jenjang,
                    kelasSekarang: body.kelas,
                },
                data: target.lulus
                    ? {
                          status: "inactive",
                          statusReason: `Lulus tahun ajaran ${tahunAjaran}`,
                          statusChangedAt: new Date(),
                      }
                    : { jenjang: target.jenjang, kelasSekarang: target.kelas },
            });
            if (res.count !== eligible.length) {
                throw appError(409, "Data siswa berubah saat diproses. Muat ulang lalu coba lagi.");
            }
            await tx.studentClassHistory.createMany({
                data: eligible.map((studentId) => ({
                    studentId,
                    kelas: target.lulus ? body.kelas : target.kelas,
                    tahunAjaran,
                    action: target.lulus ? ("lulus" as const) : ("naik_kelas" as const),
                    reason: body.reason,
                    changedBy: user.id,
                })),
            });
            await tx.auditLog.createMany({
                data: eligible.map((entityId) => ({
                    teacherId: user.id,
                    actionType: target.lulus ? "graduate" : "promote_class",
                    entityType: "student",
                    entityId,
                    beforeValue: { jenjang: body.jenjang, kelas: body.kelas },
                    afterValue: target.lulus
                        ? { status: "inactive", lulus: tahunAjaran }
                        : { jenjang: target.jenjang, kelas: target.kelas },
                    reason: body.reason,
                })),
            });
        });
    }

    const context = {
        ...requestContext(event),
        asal,
        tujuan: target.label,
        tahunAjaran,
        diproses: eligible.length,
        dilewati: skipped.length,
    };
    if (eligible.length) logger.info("siswa", target.lulus ? "Siswa diluluskan" : "Naik kelas", context);
    else logger.warn("siswa", "Naik kelas: tidak ada siswa yang memenuhi syarat", context);

    const verb = target.lulus ? "diluluskan" : `naik ke ${target.label}`;
    return {
        processed: eligible.length,
        target,
        skipped,
        message: eligible.length
            ? `${eligible.length} siswa ${asal} berhasil ${verb}.`
            : "Tidak ada siswa yang diproses.",
    };
});
