import { z } from "zod";

const querySchema = withFilterKelasCheck(
    z.object({
        jenjang: studentFilterShape.jenjang,
        kelas: studentFilterShape.kelas,
    }),
);

const FEED_LIMIT = 30;

type Ringkasan = {
    totalSiswa: number;
    sudahMasuk: number;
    tepatWaktu: number;
    terlambat: number;
    belumMasuk: number;
    tidakHadir: number;
    sudahPulang: number;
    pulangAwal: number;
    dimaklumi: number;
    /** Alasan bila jenjang ini libur hari ini (tidak ikut dihitung di total). */
    libur: string | null;
};

const kosong = (): Ringkasan => ({
    totalSiswa: 0,
    sudahMasuk: 0,
    tepatWaktu: 0,
    terlambat: 0,
    belumMasuk: 0,
    tidakHadir: 0,
    sudahPulang: 0,
    pulangAwal: 0,
    dimaklumi: 0,
    libur: null,
});

// Panel live halaman Scan: jadwal, ringkasan per jenjang, dan aktivitas terbaru dari semua perangkat
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const query = parseQuery(event, querySchema);
    const now = new Date();
    const rules = await loadScanRules(now);

    const studentWhere = { ...buildStudentWhere(query), status: "active" as const };
    const [perJenjang, rows] = await Promise.all([
        prisma.student.groupBy({ by: ["jenjang"], where: studentWhere, _count: { _all: true } }),
        prisma.attendance.findMany({
            where: { tanggal: toDbDate(rules.tanggal), deleted: false, student: studentWhere },
            include: { ...attendanceViewInclude, student: { select: scanStudentSelect } },
        }),
    ]);

    // Ringkasan per jenjang + total
    const summary: Record<string, Ringkasan> = { total: kosong() };
    for (const j of JENJANG_LIST) summary[j] = { ...kosong(), libur: rules.liburJenjang[j] ?? null };
    // Jenjang yang libur tidak ikut dihitung di total
    const ikutTotal = (jenjang: string) => !summary[jenjang]!.libur;
    for (const g of perJenjang) {
        summary[g.jenjang]!.totalSiswa = g._count._all;
        if (ikutTotal(g.jenjang)) summary.total!.totalSiswa += g._count._all;
    }
    for (const a of rows) {
        const targets = [summary[a.student.jenjang]!];
        if (ikutTotal(a.student.jenjang)) targets.push(summary.total!);
        for (const r of targets) {
            if (a.jamMasukAsli) {
                r.sudahMasuk++;
                if (a.statusUtama === "terlambat") r.terlambat++;
                else r.tepatWaktu++;
            }
            if (a.statusUtama === "tidak_hadir") r.tidakHadir++;
            if (a.jamPulangAsli) r.sudahPulang++;
            if (a.pulangAwal) r.pulangAwal++;
            if (a.statusKoreksi === "dimaklumi") r.dimaklumi++;
        }
    }
    for (const r of Object.values(summary)) r.belumMasuk = r.libur ? 0 : r.totalSiswa - r.sudahMasuk;

    // Aktivitas: setiap absen masuk & pulang hari ini, terbaru dulu
    const feed = rows
        .flatMap((a) => {
            const view = attendanceView(a, user, rules, now);
            const student = studentView(a.student);
            const events = [];
            if (view.masuk) {
                events.push({
                    key: `${a.id}-masuk`,
                    jenis: "masuk" as const,
                    waktu: view.masuk.waktu,
                    metode: view.masuk.metode,
                    oleh: view.masuk.oleh,
                    catatan: view.masuk.catatan,
                    pulangAwal: false,
                    status: a.statusUtama,
                    menitTerlambat: view.menitTerlambat,
                    attendanceId: a.id,
                    batal: view.batal.masuk,
                    student,
                });
            }
            if (view.pulang) {
                events.push({
                    key: `${a.id}-pulang`,
                    jenis: "pulang" as const,
                    waktu: view.pulang.waktu,
                    metode: view.pulang.metode,
                    oleh: view.pulang.oleh,
                    catatan: view.pulang.catatan,
                    pulangAwal: view.pulang.awal,
                    status: a.statusUtama,
                    menitTerlambat: view.menitTerlambat,
                    attendanceId: a.id,
                    batal: view.batal.pulang,
                    student,
                });
            }
            return events;
        })
        .sort((x, y) => y.waktu.getTime() - x.waktu.getTime())
        .slice(0, FEED_LIMIT);

    const jamPulang = Object.fromEntries(
        JENJANG_LIST.map((j) => [
            j,
            { jamPulang: rules.jamPulang[j], bukaPulang: formatJamWib(bukaPulangAt(j, rules)) },
        ]),
    );

    return {
        serverTime: now,
        hari: {
            tanggal: rules.tanggal,
            label: formatTanggalPanjang(rules.tanggal),
            namaHari: rules.namaHari,
            isSchoolDay: rules.isSchoolDay,
            alasan: rules.alasanLibur,
            liburJenjang: rules.liburJenjang,
        },
        jadwal: {
            jamMasuk: rules.jamMasuk,
            batasTelat: formatJamWib(rules.batasTelatAt),
            tidakHadir: formatJamWib(rules.tidakHadirAt),
            jamPulang,
            batasBatalMenit: rules.batasBatalMenit,
            scanGandaMenit: SCAN_GANDA_MENIT,
        },
        summary,
        feed,
    };
});
