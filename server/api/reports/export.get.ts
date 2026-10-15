import { z } from "zod";

const LAPORAN = ["siswa", "kelas", "harian", "bulanan", "keterlambatan", "perhatian", "aktivitas"] as const;
type Laporan = (typeof LAPORAN)[number];

const NAMA_FILE: Record<Laporan, string> = {
    siswa: "Rekap-Siswa",
    kelas: "Rekap-Kelas",
    harian: "Absensi-Harian",
    bulanan: "Daftar-Hadir-Bulanan",
    keterlambatan: "Keterlambatan",
    perhatian: "Siswa-Perlu-Perhatian",
    aktivitas: "Aktivitas-Absensi",
};

const baseSchema = z.object({
    laporan: z.enum(LAPORAN, { error: "Jenis laporan tidak dikenal." }),
    format: z.enum(["xlsx", "pdf"], { error: "Format export harus xlsx atau pdf." }),
});

function tolakKosong(): never {
    throw appError(422, "Tidak ada data untuk diexport pada filter ini. Ubah periode atau filter lalu coba lagi.");
}

// Export semua laporan ke Excel / PDF dengan filter yang sama dengan layar
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const { laporan, format } = parseQuery(event, baseSchema.loose());
    const scope = await resolveReportScope(user);
    const ctxBase = { scope, oleh: user.nama };

    let doc: ExportDoc;
    let jumlah = 0;
    let periodeFile: string;
    let filterLog: { jenjang?: string; kelas?: string; from: string; to: string };

    switch (laporan) {
        case "siswa":
        case "kelas":
        case "keterlambatan": {
            const f = parseReportQuery(event, { sort: sortSiswaEnum });
            assertScope(scope, f);
            const data = await loadReportData(scope, f);
            if (!data.siswa.length) tolakKosong();
            const ctx = { ...ctxBase, filter: f };
            doc =
                laporan === "siswa"
                    ? await docRekapSiswa(ctx, data, f.sort)
                    : laporan === "kelas"
                      ? await docRekapKelas(ctx, data)
                      : await docKeterlambatan(ctx, data);
            jumlah = data.siswa.length;
            periodeFile = `${f.from}_${f.to}`;
            filterLog = f;
            break;
        }
        case "perhatian": {
            const f = parseReportQuery(event, ambangShape);
            assertScope(scope, f);
            const data = await loadReportData(scope, f);
            if (!data.siswa.length) tolakKosong();
            doc = await docPerhatian({ ...ctxBase, filter: f }, data, {
                minPersen: f.minPersen,
                maxAlpa: f.maxAlpa,
                maxTerlambat: f.maxTerlambat,
            });
            jumlah = doc.sections[0]!.rows.length;
            periodeFile = `${f.from}_${f.to}`;
            filterLog = f;
            break;
        }
        case "bulanan": {
            const q = parseReportQuery(event, bulanShape);
            assertScope(scope, q);
            const periode = periodeBulan(q.bulan);
            const f = { ...q, from: periode.from, to: periode.to };
            const data = await loadReportData(scope, f);
            if (!data.siswa.length) tolakKosong();
            doc = await docBulanan({ ...ctxBase, filter: f }, data, periode.bulan);
            jumlah = data.siswa.length;
            periodeFile = periode.bulan;
            filterLog = f;
            break;
        }
        case "harian": {
            const f = parseReportQuery(event, harianExtraShape);
            assertScope(scope, f);
            const [kalender, jam] = await Promise.all([loadKalender(f.from, f.to), getSettings(["jam_masuk_global"] as const)]);
            const { where, orderBy } = harianQuery(scope, f, kalender.today);
            jumlah = await prisma.attendance.count({ where });
            if (!jumlah) tolakKosong();
            const maks = format === "pdf" ? MAKS_PDF_HARIAN : MAKS_XLSX_HARIAN;
            if (jumlah > maks) {
                throw appError(
                    422,
                    format === "pdf"
                        ? `Terlalu banyak data untuk PDF (${jumlah.toLocaleString("id-ID")} baris, maksimal ${maks.toLocaleString("id-ID")}). Gunakan Excel atau persempit periode/kelas.`
                        : `Terlalu banyak data (${jumlah.toLocaleString("id-ID")} baris, maksimal ${maks.toLocaleString("id-ID")}). Persempit periode atau kelas.`,
                );
            }
            const rows = await prisma.attendance.findMany({ where, include: harianInclude, orderBy });
            const extra = [
                f.status ? `Status: ${KODE_STATUS[f.status].label}` : "",
                f.metode ? `Filter: ${{ manual: "absen manual", pulang_awal: "pulang awal", keterangan: "ada keterangan/koreksi" }[f.metode]}` : "",
            ].filter(Boolean);
            doc = await docHarian(
                { ...ctxBase, filter: f, extraFilter: extra },
                rows.map((a) => harianView(a, kalender, jam.jam_masuk_global)),
            );
            periodeFile = `${f.from}_${f.to}`;
            filterLog = f;
            break;
        }
        case "aktivitas": {
            const f = parseReportQuery(event, {
                jenis: z.preprocess(
                    (v) => (v === "" ? undefined : v),
                    z.enum(Object.keys(AKSI_AKTIVITAS) as [string, ...string[]], { error: "Jenis aktivitas tidak dikenal." }).optional(),
                ),
            });
            assertScope(scope, f);
            const rows = await loadAktivitas(scope, f, f.jenis);
            if (!rows.length) tolakKosong();
            doc = await docAktivitas(
                { ...ctxBase, filter: f, extraFilter: f.jenis ? [`Jenis: ${AKSI_AKTIVITAS[f.jenis]}`] : [] },
                rows,
            );
            jumlah = rows.length;
            periodeFile = `${f.from}_${f.to}`;
            filterLog = f;
            break;
        }
    }

    const mulai = Date.now();
    const file = format === "pdf" ? await renderPdf(doc) : await renderExcel(doc);

    const bagianKelas = filterLog.kelas
        ? `${filterLog.jenjang}-${filterLog.kelas}`
        : filterLog.jenjang ?? (scope.wali ? "Kelas-Wali" : "Semua");
    const namaFile = `Laporan-${NAMA_FILE[laporan]}_${bagianKelas}_${periodeFile}.${format}`.replace(/[^\w.-]+/g, "-");

    logger.info("laporan", "Export laporan", {
        ...requestContext(event),
        laporan,
        format,
        from: filterLog.from,
        to: filterLog.to,
        ...(filterLog.jenjang && { jenjang: filterLog.jenjang }),
        ...(filterLog.kelas && { kelas: filterLog.kelas }),
        baris: jumlah,
        ukuranKb: Math.round(file.byteLength / 1024),
        durasiMs: Date.now() - mulai,
    });

    setResponseHeaders(event, {
        "Content-Type":
            format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${namaFile}"`,
        "Cache-Control": "no-store",
    });
    return Buffer.from(file);
});
