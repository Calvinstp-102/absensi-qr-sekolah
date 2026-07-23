import { z } from "zod";
import dayjs from "dayjs";

const scanSchema = z.object({
    token: z.string().min(1),
    deviceInfo: z.string().optional(),
});

function hitungStatusMasuk(
    waktuScan: Date,
    jamMasukGlobal: string,
    toleransi: number,
): "hadir" | "terlambat" {
    const [h, m] = jamMasukGlobal.split(":").map(Number);
    const batasWaktu = dayjs(waktuScan)
        .startOf("day")
        .hour(h)
        .minute(m + toleransi);
    return dayjs(waktuScan).isAfter(batasWaktu) ? "terlambat" : "hadir";
}

export default defineEventHandler(async (event) => {
    await requireUserSession(event);
    const body = await readValidatedBody(event, scanSchema.parse);

    const qr = await prisma.qrCode.findFirst({
        where: {
            token: body.token,
            relatedTo: "students",
            deleted: false,
            OR: [
                { status: "active" },
                {
                    status: "grace_period",
                    gracePeriodUntil: { gte: new Date() },
                },
            ],
        },
    });

    if (!qr || !qr.studentId) {
        throw createError({ statusCode: 404, statusMessage: "QR tidak valid" });
    }

    const student = await prisma.student.findUnique({
        where: { id: qr.studentId },
    });
    if (!student || student.deleted) {
        throw createError({
            statusCode: 404,
            statusMessage: "Siswa tidak ditemukan",
        });
    }

    if (student.status !== "active") {
        throw createError({
            statusCode: 403,
            statusMessage: `Siswa nonaktif: ${student.statusReason || "-"}`,
        });
    }

    const today = toDbDate(dayjs().format("YYYY-MM-DD"));
    const now = new Date();

    const jamMasukGlobal = await getSettingValue("jam_masuk_global");
    const toleransi = Number(await getSettingValue("toleransi_telat_menit"));

    const existing = await prisma.attendance.findUnique({
        where: { studentId_tanggal: { studentId: student.id, tanggal: today } },
    });

    const studentInfo = {
        nama: student.nama,
        nisn: student.nisn,
        kelas: student.kelasSekarang,
    };

    // Kasus 1: belum ada record sama sekali -> absen masuk baru
    if (!existing) {
        const statusUtama = hitungStatusMasuk(now, jamMasukGlobal, toleransi);
        const attendance = await prisma.attendance.create({
            data: {
                studentId: student.id,
                tanggal: today,
                jamMasukAsli: now,
                statusUtama,
                deviceInfo: body.deviceInfo,
            },
        });
        return { type: "masuk", student: studentInfo, waktu: now, attendance };
    }

    // Kasus 2: record ada tapi jam masuk kosong (hasil Cron A/B) -> siswa baru scan, isi jam masuk aslinya
    if (!existing.jamMasukAsli) {
        const statusUtama = hitungStatusMasuk(now, jamMasukGlobal, toleransi);
        const attendance = await prisma.attendance.update({
            where: { id: existing.id },
            data: { jamMasukAsli: now, statusUtama },
        });
        return { type: "masuk", student: studentInfo, waktu: now, attendance };
    }

    // Kasus 3: sudah ada jam masuk, belum ada jam pulang -> absen pulang
    if (!existing.jamPulangAsli) {
        const attendance = await prisma.attendance.update({
            where: { id: existing.id },
            data: { jamPulangAsli: now },
        });
        return { type: "pulang", student: studentInfo, waktu: now, attendance };
    }

    // Kasus 4: sudah lengkap keduanya -> tolak
    throw createError({
        statusCode: 400,
        statusMessage: "Sudah absen lengkap hari ini",
    });
});
