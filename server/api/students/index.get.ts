import { z } from "zod";

const querySchema = withFilterKelasCheck(
    z.object({
        ...studentFilterShape,
        page: z.coerce
            .number({ error: "Halaman harus berupa angka." })
            .int("Halaman harus berupa angka bulat.")
            .min(1, "Halaman minimal 1.")
            .default(1),
        pageSize: z.coerce
            .number({ error: "Jumlah per halaman harus berupa angka." })
            .int("Jumlah per halaman harus berupa angka bulat.")
            .min(1, "Jumlah per halaman minimal 1.")
            .max(100, "Jumlah per halaman maksimal 100.")
            .default(10),
    }),
);

export default defineEventHandler(async (event) => {
    await requireAuth(event);
    const query = parseQuery(event, querySchema);
    const where = buildStudentWhere(query);

    // Ringkasan mengikuti jenjang/kelas yang dipilih (bukan cari/status/QR),
    // supaya kartu ringkasan tetap bisa dipakai sebagai filter
    const scope = buildStudentWhere({ jenjang: query.jenjang, kelas: query.kelas });

    const [total, students, groups] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
            where,
            select: studentListSelect,
            orderBy: studentOrderBy,
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
        prisma.student.groupBy({
            by: ["status", "hasQr"],
            where: scope,
            _count: { _all: true },
        }),
    ]);

    const summary = { total: 0, aktif: 0, nonaktif: 0, belumQr: 0 };
    for (const g of groups) {
        const n = g._count._all;
        summary.total += n;
        if (g.status === "active") summary.aktif += n;
        else summary.nonaktif += n;
        if (!g.hasQr) summary.belumQr += n;
    }

    return {
        students,
        summary,
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
});
