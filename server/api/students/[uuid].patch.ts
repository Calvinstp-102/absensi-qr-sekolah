import { z } from "zod";

const updateSchema = z.object({
    nama: z.string().min(1),
    nis: z.string().optional(),
    nisn: z.string().min(1),
    gender: z.enum(["L", "P"]),
    tanggalLahir: z.string().min(1),
    alamat: z.string().min(1),
    jenjang: z.enum(["TK", "SD", "SMP"]),
    kelasSekarang: z.string().min(1),
    namaOrtu: z.string().min(1),
    noHpOrtu: z.string().min(1),
    status: z.enum(["active", "inactive"]),
    statusReason: z.string().optional(),
    kelasChangeReason: z.string().optional(),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const uuid = getRouterParam(event, "uuid");
    const body = await readValidatedBody(event, updateSchema.parse);

    const before = await prisma.student.findUnique({ where: { uuid } });
    if (!before) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    const kelasBerubah = body.kelasSekarang !== before.kelasSekarang;
    const statusBerubah = body.status !== before.status;

    if (kelasBerubah && !body.kelasChangeReason) {
        throw createError({
            statusCode: 400,
            statusMessage: "Alasan perubahan kelas wajib diisi",
        });
    }
    if (statusBerubah && !body.statusReason) {
        throw createError({
            statusCode: 400,
            statusMessage: "Alasan perubahan status wajib diisi",
        });
    }

    const updated = await prisma.student.update({
        where: { id: before.id },
        data: {
            nama: body.nama,
            nis: body.nis,
            nisn: body.nisn,
            gender: body.gender,
            tanggalLahir: new Date(body.tanggalLahir),
            alamat: body.alamat,
            jenjang: body.jenjang,
            kelasSekarang: body.kelasSekarang,
            namaOrtu: body.namaOrtu,
            noHpOrtu: body.noHpOrtu,
            status: body.status,
            ...(statusBerubah && {
                statusReason: body.statusReason,
                statusChangedAt: new Date(),
            }),
        },
    });

    if (kelasBerubah) {
        await prisma.studentClassHistory.create({
            data: {
                studentId: before.id,
                kelas: body.kelasSekarang,
                tahunAjaran: await getSettingValue("tahun_ajaran_aktif"),
                action: "pindah_kelas",
                reason: body.kelasChangeReason,
                changedBy: session.user.id,
            },
        });
        await prisma.auditLog.create({
            data: {
                teacherId: session.user.id,
                actionType: "change_class",
                entityType: "student",
                entityId: before.id,
                beforeValue: { kelas: before.kelasSekarang },
                afterValue: { kelas: body.kelasSekarang },
                reason: body.kelasChangeReason,
            },
        });
    }

    if (statusBerubah) {
        await prisma.auditLog.create({
            data: {
                teacherId: session.user.id,
                actionType: "change_student_status",
                entityType: "student",
                entityId: before.id,
                beforeValue: {
                    status: before.status,
                    statusReason: before.statusReason,
                },
                afterValue: {
                    status: body.status,
                    statusReason: body.statusReason,
                },
                reason: body.statusReason,
            },
        });
    }

    await prisma.auditLog.create({
        data: {
            teacherId: session.user.id,
            actionType: "update_student",
            entityType: "student",
            entityId: before.id,
            beforeValue: {
                nama: before.nama,
                alamat: before.alamat,
                namaOrtu: before.namaOrtu,
                noHpOrtu: before.noHpOrtu,
            },
            afterValue: {
                nama: body.nama,
                alamat: body.alamat,
                namaOrtu: body.namaOrtu,
                noHpOrtu: body.noHpOrtu,
            },
            reason: "Update data siswa",
        },
    });

    return updated;
});
