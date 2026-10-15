import { z } from "zod";

// Log Aktivitas (hanya Superadmin & Admin): filter periode/kategori/aksi/guru/cari + paginasi
export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const f = parseAuditQuery(event, {
        page: z.coerce.number({ error: "Halaman tidak valid." }).int().min(1, "Halaman tidak valid.").default(1),
        pageSize: z.coerce
            .number({ error: "Jumlah per halaman tidak valid." })
            .int()
            .min(1, "Jumlah per halaman minimal 1.")
            .max(100, "Jumlah per halaman maksimal 100.")
            .default(25),
    });
    const page = f.page as number;
    const pageSize = f.pageSize as number;

    const where = await auditWhere(f);
    const [total, rows, ringkasan] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            include: auditInclude,
            orderBy: [{ dateCreated: "desc" }, { id: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        auditRingkasan(f),
    ]);

    return {
        periode: { from: f.from, to: f.to, label: formatRentangTanggal(f.from, f.to) },
        ringkasan,
        data: await auditView(rows),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
});
