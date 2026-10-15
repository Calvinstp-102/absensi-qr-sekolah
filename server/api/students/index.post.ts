import { z } from "zod";

const createStudentSchema = withKelasCheck(z.object(studentFields));

export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, createStudentSchema);
    await assertNisNisnAvailable(body);

    const tahunAjaran = await getSettingValue("tahun_ajaran_aktif");

    const student = await prisma
        .$transaction(async (tx) => {
            const s = await tx.student.create({
                data: body,
                select: studentListSelect,
            });
            await tx.studentClassHistory.create({
                data: {
                    studentId: s.id,
                    kelas: body.kelasSekarang,
                    tahunAjaran,
                    action: "masuk_baru",
                    changedBy: user.id,
                },
            });
            await tx.auditLog.create({
                data: {
                    teacherId: user.id,
                    actionType: "create_student",
                    entityType: "student",
                    entityId: s.id,
                    afterValue: {
                        nama: s.nama,
                        nisn: s.nisn,
                        jenjang: s.jenjang,
                        kelas: s.kelasSekarang,
                    },
                    reason: "Tambah siswa baru",
                },
            });
            return s;
        })
        .catch((e) => handlePrismaError(e, STUDENT_UNIQUE_LABELS, body));

    logger.info("siswa", "Siswa ditambahkan", {
        ...requestContext(event),
        studentId: student.id,
        jenjang: student.jenjang,
        kelas: student.kelasSekarang,
    });

    return { student, message: `Siswa ${student.nama} berhasil ditambahkan.` };
});
