import { z } from "zod";

const previewSchema = z.object({
    token: z.string({ error: "QR tidak terbaca." }).trim().min(1, "QR tidak terbaca.").max(200, "QR tidak terdaftar di sistem."),
});

// Pratinjau mode Izin Pulang Awal: tampilkan siswa & absensi hari ini tanpa menulis apa pun.
// POST (bukan GET) agar token QR tidak ikut tercatat di log request.
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const body = await parseBody(event, previewSchema);
    const ctx = { ...requestContext(event), mode: "pulang_awal" };

    const now = new Date();
    const rules = await loadScanRules(now);
    assertSchoolDay(rules, ctx);

    const { student, view, info } = await resolveStudentByToken(body.token, ctx);
    assertJenjangMasuk(rules, student.jenjang, { ...ctx, studentId: student.id }, { student: view });
    const existing = await findTodayAttendance(prisma, student.id, rules);
    const keputusan = tentukanAksiScan(existing, student, "pulang_awal", rules, now, { student: view });

    const att = await prisma.attendance.findUniqueOrThrow({
        where: { id: existing!.id },
        include: attendanceViewInclude,
    });

    return {
        student: view,
        today: attendanceView(att, user, rules, now),
        jamPulang: jamPulangAt(student.jenjang, rules),
        bukaPulang: bukaPulangAt(student.jenjang, rules),
        pulangAwal: keputusan.aksi === "pulang" && keputusan.pulangAwal,
        info: [keputusan.aksi === "pulang" ? keputusan.info : null, info].filter(Boolean).join(" ") || null,
    };
});
