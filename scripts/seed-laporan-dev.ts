// Data uji laporan (Modul 5) — HANYA untuk database uji absensi_qr_dev.
// Membuat ±3 bulan absensi realistis (hadir/terlambat/dimaklumi/sakit/izin/alpa, manual, pulang awal),
// 2 hari libur, dan audit log aktivitas. Absensi HARI INI tidak disentuh.
//
// Jalankan: $env:DATABASE_URL="mysql://root:@localhost:3306/absensi_qr_dev"; npx tsx scripts/seed-laporan-dev.ts
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { toDbDate, todayWibStr, wibAt } from "../server/utils/date-utils";

const url = process.env.DATABASE_URL ?? "";
if (!/\/absensi_qr_dev(\?|$)/.test(url)) {
    console.error("Script ini hanya boleh dijalankan ke database absensi_qr_dev. DATABASE_URL sekarang:", url.replace(/:[^:@/]*@/, ":***@"));
    process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
const MULAI = "2026-07-13";
const PREFIX = "Uji Laporan";
const JAM_PULANG = { TK: "11:00", SD: "13:00", SMP: "15:00" } as const;

// PRNG deterministik agar hasil sama setiap dijalankan
let seed = 20261015;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (n: number) => Math.floor(rand() * n);

const geser = (t: string, n: number) => new Date(toDbDate(t).getTime() + n * 86_400_000).toISOString().slice(0, 10);

async function main() {
    const today = todayWibStr();
    const kemarin = geser(today, -1);
    const admin = await prisma.teacher.findFirstOrThrow({ where: { role: "superadmin", deleted: false } });
    const guru = await prisma.teacher.findMany({ where: { deleted: false, isActive: true }, select: { id: true } });
    const students = await prisma.student.findMany({
        where: { deleted: false },
        select: { id: true, nama: true, jenjang: true, status: true, statusChangedAt: true, dateCreated: true },
    });

    // Siswa uji dibuat 13 Okt; mundurkan tanggal terdaftar agar 3 bulan data ikut dihitung di laporan
    await prisma.student.updateMany({ where: { dateCreated: { gt: toDbDate("2026-07-01") } }, data: { dateCreated: toDbDate("2026-07-01") } });

    // Bersihkan data uji lama
    await prisma.attendance.deleteMany({ where: { tanggal: { gte: toDbDate(MULAI), lte: toDbDate(kemarin) } } });
    await prisma.holiday.deleteMany({ where: { keterangan: { startsWith: PREFIX } } });
    await prisma.auditLog.deleteMany({ where: { reason: { startsWith: `[${PREFIX}]` } } });

    // Libur: 17 Agustus (semua) & ujian SMP 22–24 September (hanya SMP)
    await prisma.holiday.createMany({
        data: [
            { tanggalMulai: toDbDate("2026-08-17"), tanggalSelesai: toDbDate("2026-08-17"), keterangan: `${PREFIX}: HUT RI`, createdBy: admin.id },
            { tanggalMulai: toDbDate("2026-09-22"), tanggalSelesai: toDbDate("2026-09-24"), keterangan: `${PREFIX}: Ujian Tengah Semester SMP`, jenjang: "SMP", createdBy: admin.id },
        ],
    });

    const rows: Parameters<typeof prisma.attendance.createMany>[0]["data"] & unknown[] = [];
    const audit: { tanggal: string; studentId: number; aksi: string; alasan: string }[] = [];
    // Siswa "bermasalah" untuk laporan Perlu Perhatian: siswa aktif ke-2
    const bermasalah = students.filter((s) => s.status === "active")[1]?.id;

    for (let t = MULAI; t <= kemarin; t = geser(t, 1)) {
        const weekday = toDbDate(t).getUTCDay() || 7;
        if (weekday > 5 || t === "2026-08-17") continue;
        for (const s of students) {
            if (s.status === "inactive" && s.statusChangedAt && t >= s.statusChangedAt.toISOString().slice(0, 10)) continue;
            if (s.jenjang === "SMP" && t >= "2026-09-22" && t <= "2026-09-24") continue;

            const r = rand() * 100;
            const p = s.id === bermasalah ? r * 0.55 + 45 : r; // bergeser ke status buruk
            const oleh = guru[pick(guru.length)]!.id;
            const base = { studentId: s.id, tanggal: toDbDate(t) };
            const pulang = (awal = false) => wibAt(t, JAM_PULANG[s.jenjang], awal ? -90 - pick(60) : pick(40));

            if (p < 78) {
                const manual = rand() < 0.04;
                const pulangAwal = rand() < 0.02;
                rows.push({
                    ...base,
                    statusUtama: "hadir",
                    jamMasukAsli: wibAt(t, "06:30", pick(44)),
                    masukMetode: manual ? "manual" : "qr",
                    masukOleh: oleh,
                    catatanMasuk: manual ? "Kartu tertinggal" : null,
                    jamPulangAsli: pulang(pulangAwal),
                    pulangMetode: "qr",
                    pulangOleh: oleh,
                    pulangAwal,
                    catatanPulang: pulangAwal ? "Sakit, dijemput orang tua" : null,
                });
                if (manual) audit.push({ tanggal: t, studentId: s.id, aksi: "absen_manual", alasan: "Kartu tertinggal" });
                if (pulangAwal) audit.push({ tanggal: t, studentId: s.id, aksi: "izin_pulang_awal", alasan: "Sakit, dijemput orang tua" });
            } else if (p < 88) {
                const dimaklumi = rand() < 0.2;
                rows.push({
                    ...base,
                    statusUtama: "terlambat",
                    jamMasukAsli: wibAt(t, "07:16", pick(55)),
                    masukMetode: "qr",
                    masukOleh: oleh,
                    jamPulangAsli: pulang(),
                    pulangMetode: "qr",
                    pulangOleh: oleh,
                    ...(dimaklumi && { statusKoreksi: "dimaklumi" as const, alasanKoreksi: "Hujan deras", dikoreksiOleh: admin.id, dikoreksiAt: wibAt(t, "09:00") }),
                });
                if (dimaklumi) audit.push({ tanggal: t, studentId: s.id, aksi: "correct_attendance", alasan: "Hujan deras" });
            } else if (p < 92) {
                rows.push({ ...base, statusUtama: "tidak_hadir", statusKoreksi: "sakit", alasanKoreksi: "Demam", dikoreksiOleh: oleh, dikoreksiAt: wibAt(t, "07:30") });
                audit.push({ tanggal: t, studentId: s.id, aksi: "keterangan_absensi", alasan: "Demam" });
            } else if (p < 95) {
                rows.push({ ...base, statusUtama: "tidak_hadir", statusKoreksi: "izin", alasanKoreksi: "Acara keluarga", dikoreksiOleh: oleh, dikoreksiAt: wibAt(t, "07:30") });
                audit.push({ tanggal: t, studentId: s.id, aksi: "keterangan_absensi", alasan: "Acara keluarga" });
            } else {
                rows.push({ ...base, statusUtama: "tidak_hadir" });
            }
        }
    }

    for (let i = 0; i < rows.length; i += 1000) {
        await prisma.attendance.createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
    }

    // Audit log aktivitas (dibuat pada jam kejadian)
    const atts = await prisma.attendance.findMany({
        where: { tanggal: { gte: toDbDate(MULAI), lte: toDbDate(kemarin) } },
        select: { id: true, studentId: true, tanggal: true },
    });
    const idBy = new Map(atts.map((a) => [`${a.studentId}|${a.tanggal.toISOString().slice(0, 10)}`, a.id]));
    await prisma.auditLog.createMany({
        data: audit.map((a) => ({
            teacherId: admin.id,
            actionType: a.aksi,
            entityType: "attendance",
            entityId: idBy.get(`${a.studentId}|${a.tanggal}`)!,
            afterValue: a.aksi === "keterangan_absensi" ? { statusKoreksi: a.alasan === "Demam" ? "sakit" : "izin" } : {},
            reason: `[${PREFIX}] ${a.alasan}`,
            dateCreated: wibAt(a.tanggal, "08:00", pick(300)),
        })),
    });

    console.log(`Selesai: ${rows.length} absensi (${MULAI} s/d ${kemarin}), ${audit.length} audit, 2 libur. Siswa bermasalah id=${bermasalah}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
