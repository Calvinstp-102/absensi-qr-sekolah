import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client";

const querySchema = withFilterKelasCheck(
    z.object({
        q: studentFilterShape.q,
        jenjang: studentFilterShape.jenjang,
        kelas: studentFilterShape.kelas,
        filter: z
            .enum(["semua", "belum_masuk", "sudah_masuk", "belum_pulang"], { error: "Filter tidak dikenal." })
            .default("semua"),
        page: z.coerce.number({ error: "Halaman tidak valid." }).int().min(1, "Halaman tidak valid.").default(1),
        pageSize: z.coerce
            .number({ error: "Jumlah per halaman tidak valid." })
            .int()
            .min(1, "Jumlah per halaman minimal 1.")
            .max(100, "Jumlah per halaman maksimal 100.")
            .default(20),
    }),
);

// Siswa aktif + status absensi hari ini (daftar "Belum hadir" & pencarian Absen Manual)
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const query = parseQuery(event, querySchema);
    const now = new Date();
    const rules = await loadScanRules(now);
    const tanggal = toDbDate(rules.tanggal);

    const hariIni = { tanggal, deleted: false };
    const where: Prisma.StudentWhereInput = { ...buildStudentWhere(query), status: "active" };
    if (query.filter === "belum_masuk") {
        where.attendances = { none: { ...hariIni, jamMasukAsli: { not: null } } };
        // Siswa jenjang yang libur hari ini tidak dianggap "belum masuk"
        const libur = jenjangLibur(rules);
        if (libur.length > 0) where.AND = [{ jenjang: { notIn: libur } }];
    } else if (query.filter === "sudah_masuk") {
        where.attendances = { some: { ...hariIni, jamMasukAsli: { not: null } } };
    } else if (query.filter === "belum_pulang") {
        where.attendances = { some: { ...hariIni, jamMasukAsli: { not: null }, jamPulangAsli: null } };
    }

    const [total, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
            where,
            select: {
                ...scanStudentSelect,
                attendances: { where: hariIni, include: attendanceViewInclude, take: 1 },
            },
            orderBy: studentOrderBy,
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
    ]);

    return {
        data: students.map(({ attendances, ...s }) => ({
            student: studentView(s),
            today: attendances[0] ? attendanceView(attendances[0], user, rules, now) : null,
            bukaPulang: formatJamWib(bukaPulangAt(s.jenjang, rules)),
            libur: rules.liburJenjang[s.jenjang] ?? null,
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
    };
});
