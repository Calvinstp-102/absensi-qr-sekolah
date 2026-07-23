import { z } from "zod";

const createStudentSchema = z.object({
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
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readValidatedBody(event, createStudentSchema.parse);

    const student = await prisma.student.create({
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
        },
    });

    await prisma.studentClassHistory.create({
        data: {
            studentId: student.id,
            kelas: body.kelasSekarang,
            tahunAjaran: await getSettingValue("tahun_ajaran_aktif"),
            action: "masuk_baru",
            changedBy: session.user.id,
        },
    });

    return student;
});
