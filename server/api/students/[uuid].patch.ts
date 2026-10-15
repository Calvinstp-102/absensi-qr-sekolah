import { z } from "zod";

const reasonSchema = z
    .string({ error: "Alasan harus berupa teks." })
    .trim()
    .max(255, "Alasan maksimal 255 karakter.")
    .nullish()
    .transform((v) => v || "");

const updateStudentSchema = withKelasCheck(
    z.object({
        ...studentFields,
        status: z.enum(["active", "inactive"], { error: "Pilih status siswa." }),
        statusReason: reasonSchema,
        kelasChangeReason: reasonSchema,
    }),
);

// Field data diri (di luar kelas & status yang punya audit sendiri)
const PROFILE_FIELDS = [
    "nama",
    "nis",
    "nisn",
    "gender",
    "tanggalLahir",
    "alamat",
    "namaOrtu",
    "noHpOrtu",
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

/** Nilai yang bisa dibandingkan & disimpan di audit (tanggal -> "YYYY-MM-DD"). */
function comparable(v: unknown) {
    return v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? null);
}

function reject(field: string, message: string): never {
    throw appError(422, message, { fieldErrors: { [field]: message } });
}

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, updateStudentSchema);
    const before = await findStudentOr404(event);

    const changedProfile = PROFILE_FIELDS.filter(
        (f) => comparable(body[f]) !== comparable(before[f]),
    );
    const kelasBerubah =
        body.jenjang !== before.jenjang || body.kelasSekarang !== before.kelasSekarang;
    const statusBerubah = body.status !== before.status;

    if (!changedProfile.length && !kelasBerubah && !statusBerubah) {
        return { changed: [], message: "Tidak ada perubahan data." };
    }
    if (kelasBerubah && body.kelasChangeReason.length < 3) {
        reject("kelasChangeReason", "Alasan perubahan kelas wajib diisi (minimal 3 karakter).");
    }
    if (statusBerubah && body.statusReason.length < 3) {
        reject("statusReason", "Alasan perubahan status wajib diisi (minimal 3 karakter).");
    }
    if (changedProfile.includes("nis") || changedProfile.includes("nisn")) {
        await assertNisNisnAvailable(body, before.id);
    }

    const tahunAjaran = kelasBerubah ? await getSettingValue("tahun_ajaran_aktif") : "";
    const pick = (src: Record<ProfileField, unknown>) =>
        Object.fromEntries(changedProfile.map((f) => [f, comparable(src[f])]));

    await prisma
        .$transaction(async (tx) => {
            await tx.student.update({
                where: { id: before.id },
                data: {
                    nama: body.nama,
                    nis: body.nis,
                    nisn: body.nisn,
                    gender: body.gender,
                    tanggalLahir: body.tanggalLahir,
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

            if (changedProfile.length) {
                await tx.auditLog.create({
                    data: {
                        teacherId: user.id,
                        actionType: "update_student",
                        entityType: "student",
                        entityId: before.id,
                        beforeValue: pick(before),
                        afterValue: pick(body),
                        reason: "Update data siswa",
                    },
                });
            }

            if (kelasBerubah) {
                await tx.studentClassHistory.create({
                    data: {
                        studentId: before.id,
                        kelas: body.kelasSekarang,
                        tahunAjaran,
                        action: "pindah_kelas",
                        reason: body.kelasChangeReason,
                        changedBy: user.id,
                    },
                });
                await tx.auditLog.create({
                    data: {
                        teacherId: user.id,
                        actionType: "change_class",
                        entityType: "student",
                        entityId: before.id,
                        beforeValue: { jenjang: before.jenjang, kelas: before.kelasSekarang },
                        afterValue: { jenjang: body.jenjang, kelas: body.kelasSekarang },
                        reason: body.kelasChangeReason,
                    },
                });
            }

            if (statusBerubah) {
                await tx.auditLog.create({
                    data: {
                        teacherId: user.id,
                        actionType: "change_student_status",
                        entityType: "student",
                        entityId: before.id,
                        beforeValue: { status: before.status, statusReason: before.statusReason },
                        afterValue: { status: body.status, statusReason: body.statusReason },
                        reason: body.statusReason,
                    },
                });
            }
        })
        .catch((e) => handlePrismaError(e, STUDENT_UNIQUE_LABELS, body));

    const changed = [
        ...changedProfile,
        ...(kelasBerubah ? ["kelas"] : []),
        ...(statusBerubah ? ["status"] : []),
    ];
    logger.info("siswa", "Data siswa diperbarui", {
        ...requestContext(event),
        studentId: before.id,
        diubah: changed,
        ...(kelasBerubah && {
            kelasLama: `${before.jenjang} ${before.kelasSekarang}`,
            kelasBaru: `${body.jenjang} ${body.kelasSekarang}`,
        }),
        ...(statusBerubah && { status: body.status }),
    });

    return { changed, message: "Perubahan data siswa disimpan." };
});
