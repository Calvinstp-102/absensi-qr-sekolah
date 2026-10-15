import { z } from "zod";

const MAKS = { pdf: 3000, xlsx: 60000 } as const;

// Export Log Aktivitas ke Excel / PDF dengan filter yang sama dengan layar
export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const f = parseAuditQuery(event, {
        format: z.enum(["xlsx", "pdf"], { error: "Format export harus xlsx atau pdf." }),
    });
    const format = f.format as "xlsx" | "pdf";

    const where = await auditWhere(f);
    const total = await prisma.auditLog.count({ where });
    if (!total) throw appError(422, "Tidak ada aktivitas untuk diexport pada filter ini. Ubah periode atau filter lalu coba lagi.");
    if (total > MAKS[format]) {
        throw appError(
            422,
            `Terlalu banyak data untuk ${format === "pdf" ? "PDF" : "Excel"} (${total.toLocaleString("id-ID")} baris, maksimal ${MAKS[format].toLocaleString("id-ID")}). Persempit periode atau filter${format === "pdf" ? ", atau gunakan Excel" : ""}.`,
        );
    }

    const mulai = Date.now();
    const rows = await prisma.auditLog.findMany({ where, include: auditInclude, orderBy: [{ dateCreated: "desc" }, { id: "desc" }] });
    const data = await auditView(rows);
    // Ringkasan per kategori dari data yang diexport (mengikuti semua filter)
    const perKategori: Partial<Record<KategoriAudit, number>> = {};
    for (const r of data) perKategori[r.kategori] = (perKategori[r.kategori] ?? 0) + 1;

    // Keterangan filter untuk kop dokumen
    const guruNama = f.guru ? (await prisma.teacher.findUnique({ where: { uuid: f.guru }, select: { nama: true } }))?.nama : null;
    const filter = [
        [
            f.kategori ? `Kategori: ${KATEGORI_AUDIT[f.kategori].label}` : "Kategori: semua",
            f.aksi ? `Aktivitas: ${infoAksi(f.aksi).label}` : "",
            guruNama ? `Oleh: ${guruNama}` : "",
            f.q ? `Pencarian: "${f.q}"` : "",
        ]
            .filter(Boolean)
            .join("  ·  "),
    ];

    const doc: ExportDoc = {
        judul: "Log Aktivitas",
        periode: formatRentangTanggal(f.from, f.to),
        filter,
        orientation: "landscape",
        dicetakOleh: user.nama,
        dicetakPada: new Date(),
        sekolah: await identitasSekolah(),
        ringkasan: [
            { label: "Jumlah aktivitas", value: total.toLocaleString("id-ID") },
            ...(Object.keys(KATEGORI_AUDIT) as KategoriAudit[])
                .filter((k) => perKategori[k])
                .map((k) => ({ label: KATEGORI_AUDIT[k].label, value: perKategori[k]!.toLocaleString("id-ID") })),
        ],
        sections: [
            {
                sheetName: "Log Aktivitas",
                columns: [
                    { key: "no", label: "No", width: 5, format: "int", align: "center" },
                    { key: "waktu", label: "Waktu (WIB)", width: 16 },
                    { key: "guru", label: "Oleh", width: 18 },
                    { key: "aksi", label: "Aktivitas", width: 20 },
                    { key: "kategori", label: "Kategori", width: 14 },
                    { key: "target", label: "Data", width: 24 },
                    { key: "perubahan", label: "Perubahan", width: 38 },
                    { key: "alasan", label: "Alasan", width: 26 },
                    { key: "akun", label: "IP / Perangkat", width: 18 },
                ],
                rows: data.map((r, i) => ({
                    no: i + 1,
                    waktu: `${formatTanggalPendekWib(r.waktu)} ${formatJamWib(r.waktu)}`,
                    guru: r.guru.nama,
                    aksi: r.label,
                    kategori: KATEGORI_AUDIT[r.kategori].label,
                    target: r.target ? [r.target.label, r.target.sub].filter(Boolean).join(" · ") : "-",
                    perubahan: ringkasPerubahan(r.perubahan, 6) || "-",
                    alasan: r.alasan ?? "",
                    akun: r.akun ? [r.akun.ip, r.akun.perangkat].filter(Boolean).join(" · ") : "",
                })),
            },
        ],
        catatan: ["Waktu dalam WIB. Perubahan menampilkan nilai sebelum → sesudah untuk data yang berubah."],
    };

    const file = format === "pdf" ? await renderPdf(doc) : await renderExcel(doc);
    logger.info("audit", "Export log aktivitas", {
        ...requestContext(event),
        format,
        from: f.from,
        to: f.to,
        ...(f.kategori && { kategori: f.kategori }),
        baris: total,
        ukuranKb: Math.round(file.byteLength / 1024),
        durasiMs: Date.now() - mulai,
    });

    setResponseHeaders(event, {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Log-Aktivitas_${f.from}_${f.to}.${format}"`,
        "Cache-Control": "no-store",
    });
    return Buffer.from(file);
});
