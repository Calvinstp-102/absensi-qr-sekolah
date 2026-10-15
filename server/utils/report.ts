import type { H3Event } from "h3";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import type { KodeStatus } from "#shared/utils/attendance-status";
import type { Jenjang } from "#shared/utils/kelas";

// Mesin laporan (Modul 5): filter, batas kelas wali kelas, kalender hari efektif, dan semua rekap.
// Aturan status & hari efektif: lihat PROGRESS.md -> Modul 5.

// --- Filter laporan

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;
const kosongJadiUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

function tanggalField(label: string) {
    return z.preprocess(
        kosongJadiUndefined,
        z
            .string({ error: `${label} tidak valid.` })
            .trim()
            .refine((v) => TANGGAL_RE.test(v) && toDbDate(v).toISOString().slice(0, 10) === v, `${label} tidak valid.`)
            .optional(),
    );
}

export const MAKS_HARI_LAPORAN = 366;

export const reportFilterShape = {
    from: tanggalField("Tanggal awal"),
    to: tanggalField("Tanggal akhir"),
    jenjang: studentFilterShape.jenjang,
    kelas: studentFilterShape.kelas,
    q: studentFilterShape.q,
    statusSiswa: z.preprocess(
        kosongJadiUndefined,
        z.enum(["aktif", "semua"], { error: "Status siswa tidak dikenal." }).default("aktif"),
    ),
};

export type ReportFilter = {
    from: string;
    to: string;
    jenjang?: Jenjang;
    kelas?: string;
    q?: string;
    statusSiswa: "aktif" | "semua";
};

function gagalValidasi(fieldErrors: Record<string, string>): never {
    const messages = Object.values(fieldErrors);
    throw appError(422, messages.length === 1 ? messages[0]! : "Periksa kembali filter laporan.", {
        code: "VALIDATION_ERROR",
        fieldErrors,
    });
}

/** Baca query laporan (filter umum + `extra`), isi default periode (awal bulan s/d hari ini) & validasi. */
export function parseReportQuery<S extends z.ZodRawShape>(event: H3Event, extra: S) {
    const schema = z.object({ ...reportFilterShape, ...extra }).superRefine((v, ctx) => {
        const f = v as { jenjang?: string; kelas?: string };
        if (f.kelas && (!f.jenjang || !isValidKelas(f.jenjang, f.kelas))) {
            ctx.addIssue({ code: "custom", path: ["kelas"], message: "Kelas tidak sesuai jenjang yang dipilih." });
        }
    });
    const q = parseQuery(event, schema) as z.infer<typeof schema> & Partial<ReportFilter>;

    const today = todayWibStr();
    const from = q.from ?? `${today.slice(0, 8)}01`;
    const to = q.to && q.to < today ? q.to : today;
    if (from > today) gagalValidasi({ from: "Tanggal awal tidak boleh setelah hari ini." });
    if (from > to) gagalValidasi({ from: "Tanggal awal tidak boleh setelah tanggal akhir." });
    if (selisihHari(from, to) + 1 > MAKS_HARI_LAPORAN) {
        gagalValidasi({ to: `Periode laporan maksimal ${MAKS_HARI_LAPORAN} hari.` });
    }
    return { ...q, from, to } as Omit<typeof q, "from" | "to"> & ReportFilter;
}

// --- Batas kelas wali kelas

export type KelasRef = { jenjang: Jenjang; kelas: string };
/** wali = false -> semua kelas. wali = true -> hanya `kelas` (bisa kosong = belum ditugaskan). */
export type ReportScope = { wali: boolean; kelas: KelasRef[] };

export async function resolveReportScope(user: { id: number; role: string }): Promise<ReportScope> {
    if (user.role !== "wali_kelas") return { wali: false, kelas: [] };
    const rows = await prisma.waliKelas.findMany({
        where: { teacherId: user.id },
        select: { jenjang: true, kelas: true },
    });
    return { wali: true, kelas: urutkanKelas(rows) };
}

/** Wali kelas memfilter kelas/jenjang yang bukan miliknya -> 403. */
export function assertScope(scope: ReportScope, f: { jenjang?: string; kelas?: string }) {
    if (!scope.wali) return;
    const boleh = scope.kelas.some((k) => (!f.jenjang || k.jenjang === f.jenjang) && (!f.kelas || k.kelas === f.kelas));
    if ((f.jenjang || f.kelas) && !boleh) {
        throw appError(403, "Anda hanya dapat melihat laporan kelas yang Anda pegang sebagai wali kelas.");
    }
}

export function scopeInfo(scope: ReportScope) {
    return {
        wali: scope.wali,
        kelas: scope.kelas.map((k) => ({ ...k, label: formatKelas(k.jenjang, k.kelas) })),
        belumDitugaskan: scope.wali && scope.kelas.length === 0,
    };
}

/** Filter siswa laporan: tidak terhapus, status, jenjang/kelas, cari, dan batas wali kelas. */
export function reportStudentWhere(scope: ReportScope, f: Omit<ReportFilter, "from" | "to">): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = { deleted: false };
    if (f.statusSiswa !== "semua") where.status = "active";
    if (f.jenjang) where.jenjang = f.jenjang;
    if (f.kelas) where.kelasSekarang = f.kelas;
    if (f.q) where.OR = [{ nama: { contains: f.q } }, { nis: { contains: f.q } }, { nisn: { contains: f.q } }];
    if (scope.wali) {
        where.AND = [
            {
                OR: scope.kelas.length
                    ? scope.kelas.map((k) => ({ jenjang: k.jenjang, kelasSekarang: k.kelas }))
                    : [{ id: -1 }],
            },
        ];
    }
    return where;
}

// --- Urutan kelas

function urutanKelas(jenjang: string, kelas: string) {
    const j = JENJANG_LIST.indexOf(jenjang as Jenjang);
    const k = KELAS_BY_JENJANG[jenjang as Jenjang]?.indexOf(kelas) ?? 99;
    return j * 100 + (k === -1 ? 99 : k);
}

export function urutkanKelas<T extends { jenjang: string; kelas: string }>(list: T[]) {
    return [...list].sort((a, b) => urutanKelas(a.jenjang, a.kelas) - urutanKelas(b.jenjang, b.kelas));
}

// --- Kalender hari efektif

export function daftarTanggal(from: string, to: string) {
    const out: string[] = [];
    const start = toDbDate(from).getTime();
    const n = selisihHari(from, to);
    for (let i = 0; i <= n; i++) out.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
    return out;
}

export type StatusHari = "efektif" | "libur" | "tanpa_data";

export async function loadKalender(from: string, to: string) {
    const [hariSekolahValue, holidays, tanggalRows] = await Promise.all([
        getSettingValue("hari_sekolah"),
        prisma.holiday.findMany({
            where: { deleted: false, tanggalMulai: { lte: toDbDate(to) }, tanggalSelesai: { gte: toDbDate(from) } },
            select: { tanggalMulai: true, tanggalSelesai: true, keterangan: true, jenjang: true },
        }),
        // Tanggal yang punya data absensi = sistem sudah dipakai hari itu
        prisma.attendance.groupBy({ by: ["tanggal"], where: { tanggal: { gte: toDbDate(from), lte: toDbDate(to) } } }),
    ]);
    const hariSekolah = parseHariSekolah(hariSekolahValue);
    const adaData = new Set(tanggalRows.map((r) => dbDateStr(r.tanggal)));
    const libur = holidays.map((h) => ({
        mulai: dbDateStr(h.tanggalMulai),
        selesai: dbDateStr(h.tanggalSelesai),
        keterangan: h.keterangan,
        jenjang: parseJenjangLibur(h.jenjang),
    }));
    const today = todayWibStr();

    function keteranganLibur(tanggal: string, jenjang: Jenjang): string | null {
        const weekday = toDbDate(tanggal).getUTCDay() || 7;
        if (!hariSekolah.includes(weekday)) return NAMA_HARI[weekday]!;
        const h = libur.find((l) => l.mulai <= tanggal && tanggal <= l.selesai && (!l.jenjang || l.jenjang.includes(jenjang)));
        return h ? h.keterangan : null;
    }

    function statusHari(tanggal: string, jenjang: Jenjang): StatusHari {
        if (keteranganLibur(tanggal, jenjang)) return "libur";
        return adaData.has(tanggal) ? "efektif" : "tanpa_data";
    }

    return { today, dates: daftarTanggal(from, to), hariSekolah, statusHari, keteranganLibur };
}

export type Kalender = Awaited<ReturnType<typeof loadKalender>>;

// --- Data siswa & absensi

export const reportStudentSelect = {
    id: true,
    uuid: true,
    nama: true,
    nis: true,
    nisn: true,
    gender: true,
    jenjang: true,
    kelasSekarang: true,
    status: true,
    statusChangedAt: true,
    dateCreated: true,
    namaOrtu: true,
    noHpOrtu: true,
    fotoPath: true,
} satisfies Prisma.StudentSelect;

export type ReportStudent = Prisma.StudentGetPayload<{ select: typeof reportStudentSelect }>;

export function reportStudentView(s: ReportStudent) {
    return {
        id: s.id,
        uuid: s.uuid,
        nama: s.nama,
        nis: s.nis,
        nisn: s.nisn,
        gender: s.gender,
        jenjang: s.jenjang,
        kelas: s.kelasSekarang,
        kelasLabel: formatKelas(s.jenjang, s.kelasSekarang),
        aktif: s.status === "active",
        fotoPath: s.fotoPath,
    };
}

const reportAttendanceSelect = {
    id: true,
    studentId: true,
    tanggal: true,
    statusUtama: true,
    statusKoreksi: true,
    jamMasukAsli: true,
    jamPulangAsli: true,
    pulangAwal: true,
    masukMetode: true,
    pulangMetode: true,
} satisfies Prisma.AttendanceSelect;

export type ReportAttendance = Prisma.AttendanceGetPayload<{ select: typeof reportAttendanceSelect }>;

/** Tanggal (WIB) mulai & akhir siswa dihitung. Akhir = tanggal dinonaktifkan (tidak ikut dihitung). */
function rentangSiswa(s: ReportStudent) {
    return {
        mulai: wibInfo(s.dateCreated).tanggal,
        akhir: s.status === "inactive" && s.statusChangedAt ? wibInfo(s.statusChangedAt).tanggal : null,
    };
}

export function menitTerlambatDari(jamMasuk: Date, tanggal: string, jamMasukSetting: string) {
    return Math.max(0, Math.floor((jamMasuk.getTime() - wibAt(tanggal, jamMasukSetting).getTime()) / 60_000));
}

export type HitungStatus = Record<KodeStatus, number>;

const hitungKosong = (): HitungStatus => ({ H: 0, T: 0, D: 0, S: 0, I: 0, A: 0, B: 0, L: 0, "-": 0, "?": 0 });

export type BarisSiswa = {
    student: ReportStudent;
    /** Kode per tanggal, sejajar dengan `kalender.dates` */
    kode: KodeStatus[];
    /** Absensi per index tanggal (bila ada) */
    att: (ReportAttendance | undefined)[];
    hitung: HitungStatus;
    efektif: number;
    hadir: number;
    pembagi: number;
    persen: number | null;
    menitTerlambat: number;
    pulangAwal: number;
    manual: number;
};

/** Hitung rekap satu siswa dari kode harian (sejajar dengan `dates`). */
function ringkasBaris(
    student: ReportStudent,
    kode: KodeStatus[],
    att: (ReportAttendance | undefined)[],
    dates: string[],
    jamMasuk: string,
): BarisSiswa {
    const hitung = hitungKosong();
    let menitTerlambat = 0;
    let pulangAwal = 0;
    let manual = 0;
    kode.forEach((k, i) => {
        hitung[k]++;
        const a = att[i];
        if (!a || k === "L" || k === "-") return;
        if ((k === "T" || k === "D") && a.jamMasukAsli) menitTerlambat += menitTerlambatDari(a.jamMasukAsli, dates[i]!, jamMasuk);
        if (a.pulangAwal) pulangAwal++;
        if (a.masukMetode === "manual" || a.pulangMetode === "manual") manual++;
    });
    const efektif = kode.length - hitung.L - hitung["-"];
    const hadir = hitung.H + hitung.T + hitung.D;
    const pembagi = efektif - hitung.B - hitung["?"];
    return { student, kode, att, hitung, efektif, hadir, pembagi, persen: persenHadir(hadir, pembagi), menitTerlambat, pulangAwal, manual };
}

/** Potong data laporan mulai tanggal `from` (mis. "bulan ini" dari data 45 hari). */
export function potongData(data: ReportData, from: string): ReportData {
    const i0 = Math.max(0, data.kalender.dates.findIndex((t) => t >= from));
    const dates = data.kalender.dates.slice(i0);
    return {
        ...data,
        kalender: { ...data.kalender, dates },
        siswa: data.siswa.map((b) => ringkasBaris(b.student, b.kode.slice(i0), b.att.slice(i0), dates, data.jamMasuk)),
    };
}

/** Muat siswa + absensi periode, lalu hitung kode status harian & rekap per siswa (sekali saja). */
export async function loadReportData(scope: ReportScope, f: ReportFilter) {
    const [kalender, students, jam] = await Promise.all([
        loadKalender(f.from, f.to),
        prisma.student.findMany({ where: reportStudentWhere(scope, f), select: reportStudentSelect, orderBy: studentOrderBy }),
        getSettings(["jam_masuk_global"] as const),
    ]);
    const rows = students.length
        ? await prisma.attendance.findMany({
              where: {
                  deleted: false,
                  tanggal: { gte: toDbDate(f.from), lte: toDbDate(f.to) },
                  studentId: { in: students.map((s) => s.id) },
              },
              select: reportAttendanceSelect,
          })
        : [];
    const byKey = new Map(rows.map((r) => [`${r.studentId}|${dbDateStr(r.tanggal)}`, r]));
    const jamMasuk = parseJam(jam.jam_masuk_global) ? jam.jam_masuk_global : "07:00";

    const siswa: BarisSiswa[] = students.map((s) => {
        const { mulai, akhir } = rentangSiswa(s);
        const kode: KodeStatus[] = [];
        const att: (ReportAttendance | undefined)[] = [];
        for (const t of kalender.dates) {
            const a = byKey.get(`${s.id}|${t}`);
            let k: KodeStatus;
            if (t < mulai || (akhir && t >= akhir)) k = "-";
            else {
                const hari = kalender.statusHari(t, s.jenjang);
                if (hari === "libur") k = "L";
                else if (hari === "tanpa_data") k = "-";
                else if (a) k = kodeDariAbsensi(a, t === kalender.today);
                else k = t === kalender.today ? "B" : "?";
            }
            kode.push(k);
            att.push(a);
        }
        return ringkasBaris(s, kode, att, kalender.dates, jamMasuk);
    });

    return { kalender, siswa, jamMasuk };
}

export type ReportData = Awaited<ReturnType<typeof loadReportData>>;

// --- Rekap turunan

export function rekapSiswaView(b: BarisSiswa) {
    return {
        student: reportStudentView(b.student),
        efektif: b.efektif,
        hadir: b.hadir,
        H: b.hitung.H,
        T: b.hitung.T,
        D: b.hitung.D,
        S: b.hitung.S,
        I: b.hitung.I,
        A: b.hitung.A,
        B: b.hitung.B,
        tidakTercatat: b.hitung["?"],
        menitTerlambat: b.menitTerlambat,
        pulangAwal: b.pulangAwal,
        manual: b.manual,
        persen: b.persen,
    };
}

export type RekapSiswaRow = ReturnType<typeof rekapSiswaView>;

/** Jumlahkan beberapa baris siswa (rekap kelas / total). */
export function jumlahkan(list: BarisSiswa[]) {
    const t = { siswa: list.length, efektif: 0, hadir: 0, pembagi: 0, H: 0, T: 0, D: 0, S: 0, I: 0, A: 0, B: 0, tidakTercatat: 0, menitTerlambat: 0, pulangAwal: 0 };
    for (const b of list) {
        t.efektif += b.efektif;
        t.hadir += b.hadir;
        t.pembagi += b.pembagi;
        t.H += b.hitung.H;
        t.T += b.hitung.T;
        t.D += b.hitung.D;
        t.S += b.hitung.S;
        t.I += b.hitung.I;
        t.A += b.hitung.A;
        t.B += b.hitung.B;
        t.tidakTercatat += b.hitung["?"];
        t.menitTerlambat += b.menitTerlambat;
        t.pulangAwal += b.pulangAwal;
    }
    return { ...t, persen: persenHadir(t.hadir, t.pembagi) };
}

export function rekapKelas(data: ReportData) {
    const groups = new Map<string, BarisSiswa[]>();
    for (const b of data.siswa) {
        const key = `${b.student.jenjang}|${b.student.kelasSekarang}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(b);
    }
    const rows = [...groups.entries()].map(([key, list]) => {
        const [jenjang, kelas] = key.split("|") as [Jenjang, string];
        return { jenjang, kelas, kelasLabel: formatKelas(jenjang, kelas), ...jumlahkan(list) };
    });
    return urutkanKelas(rows);
}

/** Tren harian: per tanggal efektif (minimal 1 siswa dihitung). */
export function trenHarian(data: ReportData) {
    return data.kalender.dates
        .map((tanggal, i) => {
            const c = hitungKosong();
            for (const b of data.siswa) c[b.kode[i]!]++;
            const hadir = c.H + c.T + c.D;
            const pembagi = hadir + c.S + c.I + c.A;
            return { tanggal, ...c, hadir, pembagi, persen: persenHadir(hadir, pembagi) };
        })
        .filter((d) => d.pembagi > 0 || d.B > 0);
}

const BUCKET_TELAT = [
    { label: "1–5 menit", max: 5 },
    { label: "6–15 menit", max: 15 },
    { label: "16–30 menit", max: 30 },
    { label: "31–60 menit", max: 60 },
    { label: "> 60 menit", max: Infinity },
];

export function rekapKeterlambatan(data: ReportData) {
    const perHari = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ hari: NAMA_HARI[d]!, jumlah: 0 }));
    const bucket = BUCKET_TELAT.map((b) => ({ label: b.label, jumlah: 0 }));
    const siswa = data.siswa
        .map((b) => {
            const menitList: number[] = [];
            let terakhir: string | null = null;
            b.kode.forEach((k, i) => {
                if (k !== "T" && k !== "D") return;
                const t = data.kalender.dates[i]!;
                const menit = b.att[i]?.jamMasukAsli ? menitTerlambatDari(b.att[i]!.jamMasukAsli!, t, data.jamMasuk) : 0;
                menitList.push(menit);
                terakhir = t;
                perHari[(toDbDate(t).getUTCDay() || 7) - 1]!.jumlah++;
                bucket[Math.max(0, BUCKET_TELAT.findIndex((x) => menit <= x.max))]!.jumlah++;
            });
            const total = menitList.reduce((a, m) => a + m, 0);
            return {
                student: reportStudentView(b.student),
                jumlah: menitList.length,
                dimaklumi: b.hitung.D,
                totalMenit: total,
                rataMenit: menitList.length ? Math.round(total / menitList.length) : 0,
                maksMenit: menitList.length ? Math.max(...menitList) : 0,
                terakhir: terakhir as string | null,
                efektif: b.efektif,
            };
        })
        .filter((s) => s.jumlah > 0)
        .sort((a, b) => b.jumlah - a.jumlah || b.totalMenit - a.totalMenit || a.student.nama.localeCompare(b.student.nama));
    return { siswa, perHari: perHari.filter((h, i) => data.kalender.hariSekolah.includes(i + 1) || h.jumlah > 0), bucket };
}

export type AmbangPerhatian = { minPersen: number; maxAlpa: number; maxTerlambat: number };

export function siswaPerhatian(data: ReportData, ambang: AmbangPerhatian) {
    return data.siswa
        .map((b) => {
            const alasan: string[] = [];
            if (b.persen !== null && b.persen < ambang.minPersen) {
                alasan.push(`Kehadiran ${b.persen.toLocaleString("id-ID")}% (< ${ambang.minPersen}%)`);
            }
            if (b.hitung.A >= ambang.maxAlpa) alasan.push(`Alpa ${b.hitung.A} hari`);
            const telat = b.hitung.T + b.hitung.D;
            if (telat >= ambang.maxTerlambat) alasan.push(`Terlambat ${telat} kali`);
            return { ...rekapSiswaView(b), alasan, namaOrtu: b.student.namaOrtu, noHpOrtu: b.student.noHpOrtu };
        })
        .filter((r) => r.alasan.length > 0)
        .sort((a, b) => (a.persen ?? 101) - (b.persen ?? 101) || b.A - a.A);
}

/** Matriks bulanan: dikelompokkan per kelas, tanggal 1..akhir bulan (hari setelah hari ini kosong). */
export function matriksBulanan(data: ReportData, bulan: string) {
    const akhirBulan = new Date(Date.UTC(Number(bulan.slice(0, 4)), Number(bulan.slice(5, 7)), 0)).getUTCDate();
    const semuaTanggal = Array.from({ length: akhirBulan }, (_, i) => `${bulan}-${String(i + 1).padStart(2, "0")}`);
    const idx = new Map(data.kalender.dates.map((t, i) => [t, i]));

    const groups = new Map<string, BarisSiswa[]>();
    for (const b of data.siswa) {
        const key = `${b.student.jenjang}|${b.student.kelasSekarang}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(b);
    }
    const kelas = [...groups.entries()].map(([key, list]) => {
        const [jenjang, kls] = key.split("|") as [Jenjang, string];
        const hari = semuaTanggal.map((t) => {
            const weekday = toDbDate(t).getUTCDay() || 7;
            const i = idx.get(t);
            return {
                tanggal: t,
                tgl: Number(t.slice(8, 10)),
                hari: NAMA_HARI[weekday]!.slice(0, 3),
                status: (i === undefined ? "mendatang" : data.kalender.statusHari(t, jenjang)) as StatusHari | "mendatang",
                libur: i === undefined ? null : data.kalender.keteranganLibur(t, jenjang),
            };
        });
        const siswa = list.map((b) => ({
            ...rekapSiswaView(b),
            kode: semuaTanggal.map((t) => {
                const i = idx.get(t);
                return (i === undefined ? "" : b.kode[i]!) as KodeStatus | "";
            }),
        }));
        const perTanggal = semuaTanggal.map((_, n) => {
            const kodes = siswa.map((s) => s.kode[n]);
            const hadir = kodes.filter((k) => k === "H" || k === "T" || k === "D").length;
            return { hadir, tidakHadir: kodes.filter((k) => k === "S" || k === "I" || k === "A").length };
        });
        return { jenjang, kelas: kls, kelasLabel: formatKelas(jenjang, kls), hari, siswa, perTanggal, total: jumlahkan(list) };
    });
    return urutkanKelas(kelas);
}

// --- Laporan harian (daftar baris absensi, dari DB dengan paginasi)

export const KODE_FILTER_ENUM = ["H", "T", "D", "S", "I", "A", "B"] as const;

export function kodeWhere(kode: (typeof KODE_FILTER_ENUM)[number], today: string): Prisma.AttendanceWhereInput {
    const hariIni = toDbDate(today);
    switch (kode) {
        case "H":
            return { statusUtama: "hadir" };
        case "T":
            return { statusUtama: "terlambat", statusKoreksi: null, jamMasukAsli: { not: null } };
        case "D":
            return { statusUtama: "terlambat", statusKoreksi: "dimaklumi" };
        case "S":
            return { statusKoreksi: "sakit" };
        case "I":
            return { statusKoreksi: "izin" };
        case "A":
            return {
                OR: [
                    { statusUtama: "tidak_hadir", statusKoreksi: null },
                    { statusUtama: "terlambat", statusKoreksi: null, jamMasukAsli: null, tanggal: { lt: hariIni } },
                ],
            };
        case "B":
            return { statusUtama: "terlambat", statusKoreksi: null, jamMasukAsli: null, tanggal: hariIni };
    }
}

export const harianInclude = {
    student: { select: reportStudentSelect },
    masukTeacher: { select: { nama: true } },
    pulangTeacher: { select: { nama: true } },
    teacher: { select: { nama: true } },
} satisfies Prisma.AttendanceInclude;

export type HarianAttendance = Prisma.AttendanceGetPayload<{ include: typeof harianInclude }>;

export function harianView(a: HarianAttendance, kalender: Kalender, jamMasuk: string) {
    const tanggal = dbDateStr(a.tanggal);
    const kode = kodeDariAbsensi(a, tanggal === kalender.today);
    return {
        id: a.id,
        tanggal,
        student: reportStudentView(a.student),
        kode,
        menitTerlambat: (kode === "T" || kode === "D") && a.jamMasukAsli ? menitTerlambatDari(a.jamMasukAsli, tanggal, jamMasuk) : 0,
        hariLibur: kalender.keteranganLibur(tanggal, a.student.jenjang),
        masuk: a.jamMasukAsli
            ? { jam: formatJamWib(a.jamMasukAsli), metode: a.masukMetode, oleh: a.masukTeacher?.nama ?? null, catatan: a.catatanMasuk }
            : null,
        pulang: a.jamPulangAsli
            ? {
                  jam: formatJamWib(a.jamPulangAsli),
                  metode: a.pulangMetode,
                  oleh: a.pulangTeacher?.nama ?? null,
                  catatan: a.catatanPulang,
                  awal: a.pulangAwal,
              }
            : null,
        keterangan: a.statusKoreksi
            ? { jenis: a.statusKoreksi, alasan: a.alasanKoreksi, oleh: a.teacher?.nama ?? null, waktu: a.dikoreksiAt }
            : null,
    };
}

export type HarianRow = ReturnType<typeof harianView>;

// --- Aktivitas absensi (dari audit log)

export const AKSI_AKTIVITAS: Record<string, string> = {
    absen_manual: "Absen manual",
    izin_pulang_awal: "Izin pulang awal",
    correct_attendance: "Terlambat dimaklumi",
    keterangan_absensi: "Keterangan absensi",
    batal_absen_masuk: "Batal absen masuk",
    batal_absen_pulang: "Batal absen pulang",
};

/** Rentang waktu (Date) untuk tanggal WIB from..to (inklusif). */
export function rentangWaktuWib(from: string, to: string) {
    return { gte: wibAt(from, "00:00"), lt: wibAt(to, "00:00", 24 * 60) };
}

// --- Info periode untuk respons & judul export

export function periodeInfo(f: { from: string; to: string }, data?: ReportData) {
    return {
        from: f.from,
        to: f.to,
        label: formatRentangTanggal(f.from, f.to),
        hariEfektif: data ? trenHarian(data).filter((d) => d.pembagi > 0).length : null,
    };
}

export const sortSiswaEnum = z.preprocess(
    kosongJadiUndefined,
    z
        .enum(["kelas", "nama", "persen_asc", "persen_desc", "alpa", "terlambat"], { error: "Urutan tidak dikenal." })
        .default("kelas"),
);

export function urutkanRekapSiswa(rows: RekapSiswaRow[], sort: string) {
    const byKelas = (a: RekapSiswaRow, b: RekapSiswaRow) =>
        urutanKelas(a.student.jenjang, a.student.kelas) - urutanKelas(b.student.jenjang, b.student.kelas) ||
        a.student.nama.localeCompare(b.student.nama);
    const cmp: Record<string, (a: RekapSiswaRow, b: RekapSiswaRow) => number> = {
        kelas: byKelas,
        nama: (a, b) => a.student.nama.localeCompare(b.student.nama),
        persen_asc: (a, b) => (a.persen ?? 101) - (b.persen ?? 101) || byKelas(a, b),
        persen_desc: (a, b) => (b.persen ?? -1) - (a.persen ?? -1) || byKelas(a, b),
        alpa: (a, b) => b.A - a.A || byKelas(a, b),
        terlambat: (a, b) => b.T + b.D - (a.T + a.D) || b.menitTerlambat - a.menitTerlambat || byKelas(a, b),
    };
    return [...rows].sort(cmp[sort] ?? byKelas);
}

/** Query laporan harian: status/metode/urutan + paginasi. */
export const harianExtraShape = {
    status: z.preprocess(kosongJadiUndefined, z.enum(KODE_FILTER_ENUM, { error: "Status tidak dikenal." }).optional()),
    metode: z.preprocess(
        kosongJadiUndefined,
        z.enum(["manual", "pulang_awal", "keterangan"], { error: "Filter metode tidak dikenal." }).optional(),
    ),
    sort: z.preprocess(
        kosongJadiUndefined,
        z.enum(["tanggal_desc", "tanggal_asc", "nama", "kelas", "jam_masuk"], { error: "Urutan tidak dikenal." }).default("tanggal_desc"),
    ),
};

export const paginasiShape = {
    page: z.coerce.number({ error: "Halaman tidak valid." }).int().min(1, "Halaman tidak valid.").default(1),
    pageSize: z.coerce
        .number({ error: "Jumlah per halaman tidak valid." })
        .int()
        .min(1, "Jumlah per halaman minimal 1.")
        .max(100, "Jumlah per halaman maksimal 100.")
        .default(25),
};

type HarianQuery = ReportFilter & {
    status?: (typeof KODE_FILTER_ENUM)[number];
    metode?: "manual" | "pulang_awal" | "keterangan";
    sort: "tanggal_desc" | "tanggal_asc" | "nama" | "kelas" | "jam_masuk";
};

export function harianQuery(scope: ReportScope, f: HarianQuery, today: string) {
    const and: Prisma.AttendanceWhereInput[] = [];
    if (f.status) and.push(kodeWhere(f.status, today));
    if (f.metode === "manual") and.push({ OR: [{ masukMetode: "manual" }, { pulangMetode: "manual" }] });
    if (f.metode === "pulang_awal") and.push({ pulangAwal: true });
    if (f.metode === "keterangan") and.push({ statusKoreksi: { not: null } });
    const where: Prisma.AttendanceWhereInput = {
        deleted: false,
        tanggal: { gte: toDbDate(f.from), lte: toDbDate(f.to) },
        student: reportStudentWhere(scope, f),
        ...(and.length && { AND: and }),
    };
    const nama = { student: { nama: "asc" as const } };
    const orderBy: Record<HarianQuery["sort"], Prisma.AttendanceOrderByWithRelationInput[]> = {
        tanggal_desc: [{ tanggal: "desc" }, { student: { jenjang: "asc" } }, { student: { kelasSekarang: "asc" } }, nama],
        tanggal_asc: [{ tanggal: "asc" }, { student: { jenjang: "asc" } }, { student: { kelasSekarang: "asc" } }, nama],
        nama: [nama, { tanggal: "desc" }],
        kelas: [{ student: { jenjang: "asc" } }, { student: { kelasSekarang: "asc" } }, nama, { tanggal: "desc" }],
        jam_masuk: [{ tanggal: "desc" }, { jamMasukAsli: "asc" }],
    };
    return { where, orderBy: orderBy[f.sort] };
}

export const ambangShape = {
    minPersen: z.coerce.number({ error: "Ambang kehadiran tidak valid." }).min(0, "Minimal 0%.").max(100, "Maksimal 100%.").default(80),
    maxAlpa: z.coerce.number({ error: "Ambang alpa tidak valid." }).int().min(1, "Minimal 1.").max(366, "Terlalu besar.").default(3),
    maxTerlambat: z.coerce.number({ error: "Ambang terlambat tidak valid." }).int().min(1, "Minimal 1.").max(366, "Terlalu besar.").default(5),
};

export const bulanShape = {
    bulan: z.preprocess(
        kosongJadiUndefined,
        z
            .string({ error: "Bulan tidak valid." })
            .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan tidak valid (format YYYY-MM).")
            .optional(),
    ),
};

/** Periode 1 bulan (sampai hari ini bila bulan berjalan). */
export function periodeBulan(bulan: string | undefined) {
    const today = todayWibStr();
    const b = bulan ?? today.slice(0, 7);
    if (b > today.slice(0, 7)) gagalValidasi({ bulan: "Bulan tidak boleh setelah bulan ini." });
    const akhir = new Date(Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)), 0)).toISOString().slice(0, 10);
    return { bulan: b, from: `${b}-01`, to: akhir < today ? akhir : today };
}

export function namaBulan(bulan: string) {
    return toDbDate(`${bulan}-01`).toLocaleDateString("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });
}

/** Ambil data aktivitas (audit log absensi) dalam periode, sudah dibatasi kelas wali & filter siswa. */
export async function loadAktivitas(scope: ReportScope, f: ReportFilter, jenis?: string) {
    const logs = await prisma.auditLog.findMany({
        where: {
            deleted: false,
            entityType: "attendance",
            actionType: jenis ? jenis : { in: Object.keys(AKSI_AKTIVITAS) },
            dateCreated: rentangWaktuWib(f.from, f.to),
        },
        include: { teacher: { select: { nama: true } } },
        orderBy: { dateCreated: "desc" },
        take: 20_000,
    });
    const ids = [...new Set(logs.map((l) => l.entityId))];
    const atts = ids.length
        ? await prisma.attendance.findMany({
              where: { id: { in: ids }, student: reportStudentWhere(scope, { ...f, statusSiswa: "semua" }) },
              select: { id: true, tanggal: true, student: { select: reportStudentSelect } },
          })
        : [];
    const byId = new Map(atts.map((a) => [a.id, a]));
    return logs
        .filter((l) => byId.has(l.entityId))
        .map((l) => {
            const a = byId.get(l.entityId)!;
            const after = (l.afterValue ?? {}) as Record<string, unknown>;
            let aksi = AKSI_AKTIVITAS[l.actionType] ?? l.actionType;
            if (l.actionType === "keterangan_absensi") {
                const k = after.statusKoreksi;
                aksi = k === "sakit" ? "Keterangan Sakit" : k === "izin" ? "Keterangan Izin" : "Keterangan dicabut (Alpa)";
            }
            return {
                id: l.id,
                waktu: l.dateCreated,
                jam: `${formatTanggalPendekWib(l.dateCreated)} ${formatJamWib(l.dateCreated)}`,
                jenis: l.actionType,
                aksi,
                guru: l.teacher.nama,
                tanggalAbsensi: dbDateStr(a.tanggal),
                student: reportStudentView(a.student),
                alasan: l.reason,
            };
        });
}

/** Date -> "15/10/2026" (tanggal WIB). */
export function formatTanggalPendekWib(date: Date) {
    const t = wibInfo(date).tanggal;
    return `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}`;
}
