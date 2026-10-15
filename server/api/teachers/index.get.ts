import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client";

// Filter kosong dari URL (?role=) dianggap tidak difilter
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const querySchema = z.object({
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
    q: z.string({ error: "Kata kunci tidak valid." }).trim().max(100, "Kata kunci maksimal 100 karakter.").optional(),
    role: z.preprocess(
        emptyToUndefined,
        z
            .enum(["superadmin", "admin", "guru_piket", "wali_kelas"], {
                error: "Role tidak dikenal.",
            })
            .optional(),
    ),
    status: z.preprocess(
        emptyToUndefined,
        z
            .enum(["aktif", "nonaktif"], { error: "Status harus aktif atau nonaktif." })
            .optional(),
    ),
});

export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const query = parseQuery(event, querySchema);

    const where: Prisma.TeacherWhereInput = { deleted: false };
    if (query.q) {
        where.OR = [
            { nama: { contains: query.q } },
            { email: { contains: query.q } },
            { noHp: { contains: normalizePhone(query.q) || query.q } },
        ];
    }
    if (query.role) where.role = query.role;
    if (query.status) where.isActive = query.status === "aktif";

    const [total, teachers, groups] = await Promise.all([
        prisma.teacher.count({ where }),
        prisma.teacher.findMany({
            where,
            select: teacherPublicSelect,
            orderBy: [{ nama: "asc" }, { id: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
        // Ringkasan seluruh guru (tidak terpengaruh filter)
        prisma.teacher.groupBy({
            by: ["role", "isActive"],
            where: { deleted: false },
            _count: { _all: true },
        }),
    ]);

    const summary = {
        total: 0,
        aktif: 0,
        nonaktif: 0,
        perRole: { superadmin: 0, admin: 0, guru_piket: 0, wali_kelas: 0 },
    };
    for (const g of groups) {
        const n = g._count._all;
        summary.total += n;
        if (g.isActive) summary.aktif += n;
        else summary.nonaktif += n;
        summary.perRole[g.role] += n;
    }

    return {
        teachers,
        summary,
        pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
    };
});
