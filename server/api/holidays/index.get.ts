import { z } from "zod";

const querySchema = z.object({
    tahun: z.coerce
        .number({ error: "Tahun tidak valid." })
        .int("Tahun tidak valid.")
        .min(2000, "Tahun tidak valid.")
        .max(2100, "Tahun tidak valid.")
        .optional(),
});

// Daftar hari libur yang beririsan dengan satu tahun kalender
export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    const query = parseQuery(event, querySchema);
    const today = todayWibStr();
    const tahun = query.tahun ?? Number(today.slice(0, 4));

    const [rows, semua, hariSekolahValue] = await Promise.all([
        prisma.holiday.findMany({
            where: {
                deleted: false,
                tanggalMulai: { lte: toDbDate(`${tahun}-12-31`) },
                tanggalSelesai: { gte: toDbDate(`${tahun}-01-01`) },
            },
            include: holidayInclude,
            orderBy: [{ tanggalMulai: "asc" }, { id: "asc" }],
        }),
        prisma.holiday.findMany({
            where: { deleted: false },
            select: { tanggalMulai: true, tanggalSelesai: true },
        }),
        getSettingValue("hari_sekolah"),
    ]);
    const hariSekolah = parseHariSekolah(hariSekolahValue);
    const data = rows.map((h) => holidayView(h, hariSekolah, today));

    // Tahun yang punya data libur (+ tahun ini & tahun depan) untuk pilihan tahun
    const tahunSet = new Set([Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1, tahun]);
    for (const h of semua) {
        tahunSet.add(h.tanggalMulai.getUTCFullYear());
        tahunSet.add(h.tanggalSelesai.getUTCFullYear());
    }

    return {
        tahun,
        today,
        tahunList: [...tahunSet].sort((a, b) => a - b),
        data,
        summary: {
            total: data.length,
            akanDatang: data.filter((h) => h.status === "akan_datang").length,
            hariSekolahLibur: data.reduce((n, h) => n + h.jumlahHariSekolah, 0),
        },
    };
});
