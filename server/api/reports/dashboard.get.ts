import type { KodeStatus } from "#shared/utils/attendance-status";

const URUTAN_TIDAK_HADIR: KodeStatus[] = ["A", "?", "B", "S", "I"];

// Dashboard: kondisi hari ini, tren 30 hari efektif, rekap bulan ini, libur mendatang
export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const scope = await resolveReportScope(user);
    const now = new Date();
    const rules = await loadScanRules(now);
    const today = rules.tanggal;
    const awalBulan = `${today.slice(0, 8)}01`;
    const awalTren = daftarTanggal(
        new Date(toDbDate(today).getTime() - 59 * 86_400_000).toISOString().slice(0, 10),
        today,
    )[0]!;
    const from = awalBulan < awalTren ? awalBulan : awalTren;

    const [data, liburRows] = await Promise.all([
        loadReportData(scope, { from, to: today, statusSiswa: "aktif" }),
        prisma.holiday.findMany({
            where: {
                deleted: false,
                tanggalSelesai: { gte: toDbDate(today) },
                tanggalMulai: { lte: new Date(toDbDate(today).getTime() + 30 * 86_400_000) },
            },
            include: holidayInclude,
            orderBy: { tanggalMulai: "asc" },
            take: 5,
        }),
    ]);
    const iToday = data.kalender.dates.length - 1;

    // --- Hari ini
    const kosong = () => ({ total: 0, H: 0, T: 0, D: 0, S: 0, I: 0, A: 0, B: 0, tidakTercatat: 0, libur: 0 });
    const total = kosong();
    const perKelasMap = new Map<string, ReturnType<typeof kosong> & { jenjang: string; kelas: string }>();
    const tidakHadir: {
        student: ReturnType<typeof reportStudentView>;
        kode: KodeStatus;
        alasan: string | null;
        namaOrtu: string | null;
        noHpOrtu: string | null;
    }[] = [];

    for (const b of data.siswa) {
        const k = b.kode[iToday]!;
        const key = `${b.student.jenjang}|${b.student.kelasSekarang}`;
        if (!perKelasMap.has(key)) perKelasMap.set(key, { ...kosong(), jenjang: b.student.jenjang, kelas: b.student.kelasSekarang });
        const kelas = perKelasMap.get(key)!;
        for (const r of [total, kelas]) {
            if (k === "L") r.libur++;
            if (k === "L" || k === "-") continue;
            r.total++;
            if (k === "?") r.tidakTercatat++;
            else r[k]++;
        }
        if (URUTAN_TIDAK_HADIR.includes(k)) {
            tidakHadir.push({
                student: reportStudentView(b.student),
                kode: k,
                alasan: null,
                namaOrtu: b.student.namaOrtu,
                noHpOrtu: b.student.noHpOrtu,
            });
        }
    }
    // Alasan Sakit/Izin hari ini
    const keterangan = tidakHadir.some((t) => t.kode === "S" || t.kode === "I")
        ? await prisma.attendance.findMany({
              where: {
                  tanggal: toDbDate(today),
                  deleted: false,
                  statusKoreksi: { in: ["sakit", "izin"] },
                  studentId: { in: tidakHadir.map((t) => t.student.id) },
              },
              select: { studentId: true, alasanKoreksi: true },
          })
        : [];
    const alasanBy = new Map(keterangan.map((k) => [k.studentId, k.alasanKoreksi]));
    for (const t of tidakHadir) t.alasan = alasanBy.get(t.student.id) ?? null;
    tidakHadir.sort(
        (a, b) =>
            URUTAN_TIDAK_HADIR.indexOf(a.kode) - URUTAN_TIDAK_HADIR.indexOf(b.kode) ||
            a.student.kelasLabel.localeCompare(b.student.kelasLabel) ||
            a.student.nama.localeCompare(b.student.nama),
    );

    // % sudah hadir hari ini dari siswa yang wajib hadir (jenjang libur tidak dihitung)
    const persenKelas = (r: ReturnType<typeof kosong>) => {
        const hadir = r.H + r.T + r.D;
        return { ...r, hadir, persen: persenHadir(hadir, r.total) };
    };

    // --- Tren (30 hari efektif terakhir) & bulan ini
    const tren = trenHarian(data)
        .filter((d) => d.pembagi > 0 || d.tanggal === today)
        .slice(-30);
    const bulanIni = potongData(data, awalBulan);
    const terlambatBulanIni = rekapKeterlambatan(bulanIni);

    const hariSekolah = data.kalender.hariSekolah;
    return {
        scope: scopeInfo(scope),
        serverTime: now,
        hari: {
            tanggal: today,
            label: formatTanggalPanjang(today),
            isSchoolDay: rules.isSchoolDay,
            alasan: rules.alasanLibur,
            liburJenjang: rules.liburJenjang,
        },
        jadwal: {
            jamMasuk: rules.jamMasuk,
            batasTelat: formatJamWib(rules.batasTelatAt),
            tidakHadir: formatJamWib(rules.tidakHadirAt),
            sudahLewatBatasTidakHadir: now >= rules.tidakHadirAt,
        },
        hariIni: persenKelas(total),
        perKelas: urutkanKelas([...perKelasMap.values()]).map((r) => ({
            ...persenKelas(r),
            kelasLabel: formatKelas(r.jenjang, r.kelas),
        })),
        tidakHadir,
        tren: tren.map((d) => ({
            tanggal: d.tanggal,
            persen: d.persen,
            hadir: d.hadir,
            pembagi: d.pembagi,
            T: d.T + d.D,
            S: d.S,
            I: d.I,
            A: d.A,
        })),
        bulanIni: {
            label: namaBulan(today.slice(0, 7)),
            ringkasan: jumlahkan(bulanIni.siswa),
            topTerlambat: terlambatBulanIni.siswa.slice(0, 5),
        },
        liburMendatang: liburRows.map((h) => holidayView(h, hariSekolah, today)),
    };
});
