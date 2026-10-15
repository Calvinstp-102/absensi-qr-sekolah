import type { KodeStatus } from "#shared/utils/attendance-status";

// Definisi dokumen export per laporan (Modul 5). Data diambil dari mesin laporan (report.ts) yang sama dengan layar.

type Base = { judul: string; orientation: ExportDoc["orientation"] };
type Ctx = { scope: ReportScope; filter: ReportFilter; oleh: string; extraFilter?: string[] };

const CATATAN_UMUM = [
    "Kelas = kelas siswa saat ini.",
    "Hari efektif = hari sekolah yang bukan libur dan sudah ada data absensi di sistem.",
    "% Kehadiran = (Hadir + Terlambat + Dimaklumi) dibagi (hari efektif - belum hadir - tidak tercatat).",
];

const LEGENDA: KodeStatus[] = ["H", "T", "D", "S", "I", "A", "B", "L", "?"];

export function filterLabels(scope: ReportScope, f: Omit<ReportFilter, "from" | "to">, extra: string[] = []) {
    const kelas = f.kelas
        ? `Kelas: ${formatKelas(f.jenjang!, f.kelas)}`
        : f.jenjang
          ? `Jenjang: ${f.jenjang}`
          : scope.wali
            ? `Kelas wali: ${scope.kelas.map((k) => formatKelas(k.jenjang, k.kelas)).join(", ") || "-"}`
            : "Kelas: Semua kelas";
    return [
        [kelas, `Siswa: ${f.statusSiswa === "semua" ? "aktif & nonaktif" : "aktif saja"}`, f.q ? `Pencarian: "${f.q}"` : ""]
            .filter(Boolean)
            .join("  ·  "),
        ...extra,
    ];
}

async function dasar(ctx: Ctx, base: Base, periode = formatRentangTanggal(ctx.filter.from, ctx.filter.to)) {
    return {
        ...base,
        periode,
        filter: filterLabels(ctx.scope, ctx.filter, ctx.extraFilter),
        dicetakOleh: ctx.oleh,
        dicetakPada: new Date(),
        sekolah: await identitasSekolah(),
    };
}

const persenTeks = (v: number | null) => formatPersen(v);

// --- Kolom yang sering dipakai

const COL_NO: ExportColumn = { key: "no", label: "No", width: 5, format: "int", align: "center" };
const COL_NISN: ExportColumn = { key: "nisn", label: "NISN", width: 13 };
const COL_NAMA: ExportColumn = { key: "nama", label: "Nama Siswa", width: 30 };
const COL_KELAS: ExportColumn = { key: "kelas", label: "Kelas", width: 14 };

const kolomRekap = (): ExportColumn[] => [
    { key: "efektif", label: "Hari\nEfektif", width: 8, format: "int" },
    { key: "H", label: "Hadir", width: 7, format: "int" },
    { key: "T", label: "Terlambat", width: 9, format: "int" },
    { key: "D", label: "Dimaklumi", width: 9, format: "int" },
    { key: "S", label: "Sakit", width: 7, format: "int" },
    { key: "I", label: "Izin", width: 7, format: "int" },
    { key: "A", label: "Alpa", width: 7, format: "int" },
];

function nilaiRekap(r: { efektif: number; H: number; T: number; D: number; S: number; I: number; A: number }) {
    return { efektif: r.efektif, H: r.H, T: r.T, D: r.D, S: r.S, I: r.I, A: r.A };
}

function ringkasanUmum(t: ReturnType<typeof jumlahkan>, hariEfektif: number | null) {
    return [
        { label: "Jumlah siswa", value: t.siswa.toLocaleString("id-ID") },
        { label: "Hari efektif", value: hariEfektif === null ? "-" : `${hariEfektif} hari` },
        { label: "Rata-rata kehadiran", value: persenTeks(t.persen) },
        { label: "Terlambat (+dimaklumi)", value: (t.T + t.D).toLocaleString("id-ID") },
        { label: "Sakit / Izin", value: `${t.S} / ${t.I}` },
        { label: "Alpa", value: t.A.toLocaleString("id-ID") },
    ];
}

// --- Rekap siswa

export async function docRekapSiswa(ctx: Ctx, data: ReportData, sort: string): Promise<ExportDoc> {
    const rows = urutkanRekapSiswa(data.siswa.map(rekapSiswaView), sort);
    const t = jumlahkan(data.siswa);
    return {
        ...(await dasar(ctx, { judul: "Rekap Kehadiran per Siswa", orientation: "landscape" })),
        ringkasan: ringkasanUmum(t, periodeInfo(ctx.filter, data).hariEfektif),
        sections: [
            {
                sheetName: "Rekap Siswa",
                columns: [
                    COL_NO,
                    COL_NISN,
                    COL_NAMA,
                    COL_KELAS,
                    ...kolomRekap(),
                    { key: "menit", label: "Total Menit\nTerlambat", width: 11, format: "int" },
                    { key: "pulangAwal", label: "Pulang\nAwal", width: 8, format: "int" },
                    { key: "tc", label: "Tidak\nTercatat", width: 8, format: "int" },
                    { key: "persen", label: "%\nKehadiran", width: 10, format: "persen" },
                ],
                rows: rows.map((r, i) => ({
                    no: i + 1,
                    nisn: r.student.nisn ?? "",
                    nama: r.student.nama + (r.student.aktif ? "" : " (nonaktif)"),
                    kelas: r.student.kelasLabel,
                    ...nilaiRekap(r),
                    menit: r.menitTerlambat,
                    pulangAwal: r.pulangAwal,
                    tc: r.tidakTercatat,
                    persen: r.persen,
                })),
                total: {
                    nama: "TOTAL",
                    ...nilaiRekap(t),
                    menit: t.menitTerlambat,
                    pulangAwal: t.pulangAwal,
                    tc: t.tidakTercatat,
                    persen: t.persen,
                },
                empty: "Tidak ada siswa pada filter ini.",
            },
        ],
        legenda: LEGENDA,
        catatan: CATATAN_UMUM,
    };
}

// --- Rekap kelas

export async function docRekapKelas(ctx: Ctx, data: ReportData): Promise<ExportDoc> {
    const kelas = rekapKelas(data);
    const tren = trenHarian(data);
    const t = jumlahkan(data.siswa);
    return {
        ...(await dasar(ctx, { judul: "Rekap Kehadiran per Kelas", orientation: "portrait" })),
        ringkasan: ringkasanUmum(t, periodeInfo(ctx.filter, data).hariEfektif),
        sections: [
            {
                title: "Per kelas",
                sheetName: "Rekap Kelas",
                columns: [
                    COL_NO,
                    { key: "kelas", label: "Kelas", width: 16 },
                    { key: "siswa", label: "Jumlah\nSiswa", width: 8, format: "int" },
                    ...kolomRekap().map((c) => (c.key === "efektif" ? { ...c, label: "Hari-Siswa\nEfektif", width: 11 } : c)),
                    { key: "persen", label: "%\nKehadiran", width: 10, format: "persen" },
                ],
                rows: kelas.map((k, i) => ({ no: i + 1, kelas: k.kelasLabel, siswa: k.siswa, ...nilaiRekap(k), persen: k.persen })),
                total: { kelas: "TOTAL", siswa: t.siswa, ...nilaiRekap(t), persen: t.persen },
                empty: "Tidak ada kelas pada filter ini.",
            },
            {
                title: "Tren harian",
                sheetName: "Tren Harian",
                columns: [
                    { key: "tanggal", label: "Tanggal", width: 24 },
                    { key: "H", label: "Hadir", width: 8, format: "int" },
                    { key: "T", label: "Terlambat", width: 10, format: "int" },
                    { key: "D", label: "Dimaklumi", width: 10, format: "int" },
                    { key: "S", label: "Sakit", width: 8, format: "int" },
                    { key: "I", label: "Izin", width: 8, format: "int" },
                    { key: "A", label: "Alpa", width: 8, format: "int" },
                    { key: "B", label: "Belum\nHadir", width: 8, format: "int" },
                    { key: "persen", label: "%\nKehadiran", width: 10, format: "persen" },
                ],
                rows: tren.map((d) => ({ tanggal: formatTanggalPanjang(d.tanggal), H: d.H, T: d.T, D: d.D, S: d.S, I: d.I, A: d.A, B: d.B, persen: d.persen })),
                empty: "Belum ada hari efektif pada periode ini.",
            },
        ],
        legenda: LEGENDA,
        catatan: CATATAN_UMUM,
    };
}

// --- Laporan harian

export const MAKS_PDF_HARIAN = 3000;
export const MAKS_XLSX_HARIAN = 60000;

export async function docHarian(ctx: Ctx, rows: HarianRow[]): Promise<ExportDoc> {
    const hitung: Partial<Record<KodeStatus, number>> = {};
    for (const r of rows) hitung[r.kode] = (hitung[r.kode] ?? 0) + 1;
    return {
        ...(await dasar(ctx, { judul: "Laporan Absensi Harian", orientation: "landscape" })),
        ringkasan: [
            { label: "Jumlah baris", value: rows.length.toLocaleString("id-ID") },
            ...(["H", "T", "D", "S", "I", "A"] as KodeStatus[]).map((k) => ({
                label: KODE_STATUS[k].label,
                value: (hitung[k] ?? 0).toLocaleString("id-ID"),
            })),
        ],
        sections: [
            {
                sheetName: "Absensi Harian",
                columns: [
                    COL_NO,
                    { key: "tanggal", label: "Tanggal", width: 12 },
                    { key: "hari", label: "Hari", width: 8 },
                    COL_NISN,
                    { ...COL_NAMA, width: 28 },
                    COL_KELAS,
                    { key: "kode", label: "Kode", width: 6, format: "kode" },
                    { key: "status", label: "Status", width: 15 },
                    { key: "masuk", label: "Jam\nMasuk", width: 8, align: "center" },
                    { key: "pulang", label: "Jam\nPulang", width: 8, align: "center" },
                    { key: "pencatat", label: "Dicatat Oleh", width: 18 },
                    { key: "keterangan", label: "Keterangan", width: 34 },
                ],
                rows: rows.map((r, i) => {
                    const ket = [
                        r.menitTerlambat ? `Terlambat ${r.menitTerlambat} menit` : "",
                        r.keterangan?.alasan ? `${KODE_STATUS[r.kode].label}: ${r.keterangan.alasan}` : "",
                        r.masuk?.metode === "manual" ? `Masuk manual${r.masuk.catatan ? `: ${r.masuk.catatan}` : ""}` : "",
                        r.pulang?.awal ? `Pulang awal${r.pulang.catatan ? `: ${r.pulang.catatan}` : ""}` : "",
                        r.hariLibur ? `Hari libur (${r.hariLibur})` : "",
                    ].filter(Boolean);
                    const tgl = r.tanggal;
                    return {
                        no: i + 1,
                        tanggal: `${tgl.slice(8, 10)}/${tgl.slice(5, 7)}/${tgl.slice(0, 4)}`,
                        hari: NAMA_HARI[toDbDate(tgl).getUTCDay() || 7]!,
                        nisn: r.student.nisn ?? "",
                        nama: r.student.nama,
                        kelas: r.student.kelasLabel,
                        kode: r.kode,
                        status: KODE_STATUS[r.kode].label,
                        masuk: r.masuk ? (r.masuk.metode === "manual" ? `${r.masuk.jam} (M)` : r.masuk.jam) : "-",
                        pulang: r.pulang ? r.pulang.jam : "-",
                        pencatat: [r.masuk?.oleh, r.keterangan?.oleh].filter(Boolean).join(" / ") || "-",
                        keterangan: ket.join("; "),
                    };
                }),
                empty: "Tidak ada data absensi pada filter ini.",
            },
        ],
        legenda: ["H", "T", "D", "S", "I", "A", "B"],
        catatan: ["(M) = absen masuk dicatat manual oleh guru. Jam dalam WIB.", CATATAN_UMUM[0]!],
    };
}

// --- Matriks bulanan

export async function docBulanan(ctx: Ctx, data: ReportData, bulan: string): Promise<ExportDoc> {
    const kelas = matriksBulanan(data, bulan);
    const t = jumlahkan(data.siswa);
    const sections: ExportSection[] = kelas.map((k) => {
        const kolomTanggal: ExportColumn[] = k.hari.map((h, i) => ({
            key: `d${i}`,
            label: `${h.tgl}\n${h.hari}`,
            width: 4.2,
            format: "kode" as const,
        }));
        return {
            title: `${k.kelasLabel} · ${k.siswa.length} siswa · rata-rata kehadiran ${formatPersen(k.total.persen)}`,
            sheetName: k.kelasLabel.replace(" · ", " "),
            newPage: true,
            columns: [
                { ...COL_NO, width: 4 },
                { ...COL_NAMA, width: 26 },
                ...kolomTanggal,
                { key: "H", label: "H", width: 4.5, format: "int" },
                { key: "T", label: "T", width: 4.5, format: "int" },
                { key: "D", label: "D", width: 4.5, format: "int" },
                { key: "S", label: "S", width: 4.5, format: "int" },
                { key: "I", label: "I", width: 4.5, format: "int" },
                { key: "A", label: "A", width: 4.5, format: "int" },
                { key: "persen", label: "%", width: 7.5, format: "persen" },
            ],
            rows: k.siswa.map((s, i) => ({
                no: i + 1,
                nama: s.student.nama,
                ...Object.fromEntries(s.kode.map((kd, n) => [`d${n}`, kd])),
                H: s.H,
                T: s.T,
                D: s.D,
                S: s.S,
                I: s.I,
                A: s.A,
                persen: s.persen,
            })),
            total: {
                nama: "Jumlah hadir",
                ...Object.fromEntries(k.perTanggal.map((p, n) => [`d${n}`, k.hari[n]!.status === "efektif" ? p.hadir : null])),
                H: k.total.H,
                T: k.total.T,
                D: k.total.D,
                S: k.total.S,
                I: k.total.I,
                A: k.total.A,
                persen: k.total.persen,
            },
        };
    });
    return {
        ...(await dasar(ctx, { judul: "Daftar Hadir Bulanan", orientation: "landscape" }, namaBulan(bulan))),
        ringkasan: ringkasanUmum(t, periodeInfo({ from: data.kalender.dates[0]!, to: data.kalender.dates.at(-1)! }, data).hariEfektif),
        sections: sections.length ? sections : [{ columns: [COL_NO, COL_NAMA], rows: [], empty: "Tidak ada siswa pada filter ini." }],
        legenda: LEGENDA,
        catatan: ["Kolom tanggal kosong = tidak dihitung (belum terdaftar / nonaktif / sistem belum dipakai) atau tanggal yang akan datang.", ...CATATAN_UMUM],
    };
}

// --- Keterlambatan

export async function docKeterlambatan(ctx: Ctx, data: ReportData): Promise<ExportDoc> {
    const r = rekapKeterlambatan(data);
    const kejadian = r.siswa.reduce((n, s) => n + s.jumlah, 0);
    const menit = r.siswa.reduce((n, s) => n + s.totalMenit, 0);
    const tgl = (t: string | null) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}` : "-");
    return {
        ...(await dasar(ctx, { judul: "Laporan Keterlambatan", orientation: "portrait" })),
        ringkasan: [
            { label: "Kejadian terlambat", value: kejadian.toLocaleString("id-ID") },
            { label: "Siswa pernah terlambat", value: `${r.siswa.length} dari ${data.siswa.length}` },
            { label: "Rata-rata keterlambatan", value: `${kejadian ? Math.round(menit / kejadian) : 0} menit` },
            { label: "Dimaklumi", value: r.siswa.reduce((n, s) => n + s.dimaklumi, 0).toLocaleString("id-ID") },
        ],
        sections: [
            {
                title: "Siswa paling sering terlambat",
                sheetName: "Ranking",
                columns: [
                    COL_NO,
                    { ...COL_NAMA, width: 28 },
                    COL_KELAS,
                    { key: "jumlah", label: "Jumlah", width: 8, format: "int" },
                    { key: "dimaklumi", label: "Dimaklumi", width: 10, format: "int" },
                    { key: "total", label: "Total\nMenit", width: 8, format: "int" },
                    { key: "rata", label: "Rata-rata\n(menit)", width: 9, format: "int" },
                    { key: "maks", label: "Terlama\n(menit)", width: 9, format: "int" },
                    { key: "terakhir", label: "Terakhir", width: 11, align: "center" },
                ],
                rows: r.siswa.map((s, i) => ({
                    no: i + 1,
                    nama: s.student.nama,
                    kelas: s.student.kelasLabel,
                    jumlah: s.jumlah,
                    dimaklumi: s.dimaklumi,
                    total: s.totalMenit,
                    rata: s.rataMenit,
                    maks: s.maksMenit,
                    terakhir: tgl(s.terakhir),
                })),
                empty: "Tidak ada siswa yang terlambat pada periode ini.",
            },
            {
                title: "Per hari",
                sheetName: "Per Hari",
                columns: [
                    { key: "hari", label: "Hari", width: 16 },
                    { key: "jumlah", label: "Kejadian Terlambat", width: 18, format: "int" },
                ],
                rows: r.perHari.map((h) => ({ hari: h.hari, jumlah: h.jumlah })),
            },
            {
                title: "Lama keterlambatan",
                sheetName: "Lama Terlambat",
                columns: [
                    { key: "label", label: "Lama", width: 16 },
                    { key: "jumlah", label: "Kejadian", width: 18, format: "int" },
                ],
                rows: r.bucket.map((b) => ({ label: b.label, jumlah: b.jumlah })),
            },
        ],
        catatan: [`Menit terlambat dihitung dari jam masuk saat ini (${data.jamMasuk} WIB).`, CATATAN_UMUM[0]!],
    };
}

// --- Perlu perhatian

export async function docPerhatian(ctx: Ctx, data: ReportData, ambang: AmbangPerhatian): Promise<ExportDoc> {
    const rows = siswaPerhatian(data, ambang);
    return {
        ...(await dasar(
            { ...ctx, extraFilter: [`Kriteria: kehadiran < ${ambang.minPersen}%, alpa >= ${ambang.maxAlpa} hari, atau terlambat >= ${ambang.maxTerlambat} kali`] },
            { judul: "Siswa Perlu Perhatian", orientation: "landscape" },
        )),
        ringkasan: [
            { label: "Siswa perlu perhatian", value: `${rows.length} dari ${data.siswa.length}` },
            { label: "Kehadiran rendah", value: String(rows.filter((r) => r.persen !== null && r.persen < ambang.minPersen).length) },
            { label: "Sering alpa", value: String(rows.filter((r) => r.A >= ambang.maxAlpa).length) },
            { label: "Sering terlambat", value: String(rows.filter((r) => r.T + r.D >= ambang.maxTerlambat).length) },
        ],
        sections: [
            {
                sheetName: "Perlu Perhatian",
                columns: [
                    COL_NO,
                    { ...COL_NAMA, width: 26 },
                    COL_KELAS,
                    { key: "persen", label: "%\nKehadiran", width: 10, format: "persen" },
                    { key: "A", label: "Alpa", width: 7, format: "int" },
                    { key: "T", label: "Terlambat", width: 9, format: "int" },
                    { key: "SI", label: "Sakit/\nIzin", width: 8, align: "center" },
                    { key: "alasan", label: "Alasan", width: 34 },
                    { key: "ortu", label: "Orang Tua", width: 20 },
                    { key: "hp", label: "No HP Ortu", width: 15 },
                ],
                rows: rows.map((r, i) => ({
                    no: i + 1,
                    nama: r.student.nama,
                    kelas: r.student.kelasLabel,
                    persen: r.persen,
                    A: r.A,
                    T: r.T + r.D,
                    SI: `${r.S}/${r.I}`,
                    alasan: r.alasan.join("; "),
                    ortu: r.namaOrtu ?? "-",
                    hp: r.noHpOrtu ?? "-",
                })),
                empty: "Tidak ada siswa yang memenuhi kriteria.",
            },
        ],
        catatan: CATATAN_UMUM,
    };
}

// --- Aktivitas

export async function docAktivitas(ctx: Ctx, rows: Awaited<ReturnType<typeof loadAktivitas>>): Promise<ExportDoc> {
    const perJenis: Record<string, number> = {};
    for (const r of rows) perJenis[r.aksi] = (perJenis[r.aksi] ?? 0) + 1;
    return {
        ...(await dasar(ctx, { judul: "Aktivitas Absensi", orientation: "landscape" })),
        ringkasan: [
            { label: "Total aktivitas", value: rows.length.toLocaleString("id-ID") },
            ...Object.entries(perJenis)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, n]) => ({ label, value: n.toLocaleString("id-ID") })),
        ],
        sections: [
            {
                sheetName: "Aktivitas",
                columns: [
                    COL_NO,
                    { key: "waktu", label: "Waktu (WIB)", width: 16 },
                    { key: "aksi", label: "Aktivitas", width: 22 },
                    { key: "guru", label: "Oleh", width: 18 },
                    { ...COL_NAMA, width: 24 },
                    COL_KELAS,
                    { key: "tanggal", label: "Tgl Absensi", width: 11, align: "center" },
                    { key: "alasan", label: "Alasan / Catatan", width: 34 },
                ],
                rows: rows.map((r, i) => ({
                    no: i + 1,
                    waktu: r.jam,
                    aksi: r.aksi,
                    guru: r.guru,
                    nama: r.student.nama,
                    kelas: r.student.kelasLabel,
                    tanggal: `${r.tanggalAbsensi.slice(8, 10)}/${r.tanggalAbsensi.slice(5, 7)}/${r.tanggalAbsensi.slice(0, 4)}`,
                    alasan: r.alasan ?? "",
                })),
                empty: "Tidak ada aktivitas pada periode ini.",
            },
        ],
    };
}
