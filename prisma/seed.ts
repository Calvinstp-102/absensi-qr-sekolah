import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
    // ─── SETTINGS ───
    const defaultSettings = [
        {
            key: "jam_masuk_global",
            value: "07:00",
            description: "Jam masuk berlaku untuk semua jenjang",
        },
        {
            key: "jam_pulang_tk",
            value: "11:00",
            description: "Jam pulang jenjang TK",
        },
        {
            key: "jam_pulang_sd",
            value: "13:00",
            description: "Jam pulang jenjang SD",
        },
        {
            key: "jam_pulang_smp",
            value: "15:00",
            description: "Jam pulang jenjang SMP",
        },
        {
            key: "toleransi_telat_menit",
            value: "15",
            description: "Grace period sebelum ditandai Terlambat (menit)",
        },
        {
            key: "tidak_hadir_delay_menit",
            value: "60",
            description:
                "Jarak waktu dari status Terlambat otomatis ke Tidak Hadir otomatis (menit)",
        },
        {
            key: "qr_grace_period_hari",
            value: "3",
            description:
                "Lama QR lama masih berlaku setelah digenerate ulang (hari)",
        },
        {
            key: "tahun_ajaran_aktif",
            value: "2026/2027",
            description: "Tahun ajaran yang sedang berjalan",
        },
        {
            key: "nama_sekolah",
            value: "Yayasan Pendidikan Adventus Serang",
            description: "Ditampilkan di header & export PDF",
        },
        {
            key: "alamat_sekolah",
            value: "-",
            description: "Alamat sekolah untuk header laporan PDF",
        },
        {
            key: "npsn",
            value: "-",
            description: "Nomor Pokok Sekolah Nasional",
        },
    ];

    for (const setting of defaultSettings) {
        await prisma.settings.upsert({
            where: { key: setting.key },
            update: {},
            create: setting,
        });
    }
    console.log("Seeded settings:", defaultSettings.length, "keys");

    // ─── GURU (10 akun) ───
    const guruData = [
        { nama: "Budi Santoso", role: "admin" as const },
        { nama: "Siti Rahayu", role: "guru_piket" as const },
        { nama: "Ahmad Fauzi", role: "guru_piket" as const },
        { nama: "Dewi Lestari", role: "wali_kelas" as const },
        { nama: "Eko Prasetyo", role: "wali_kelas" as const },
        { nama: "Fitriani", role: "wali_kelas" as const },
        { nama: "Gunawan", role: "guru_piket" as const },
        { nama: "Hesti Wulandari", role: "wali_kelas" as const },
        { nama: "Indra Kusuma", role: "wali_kelas" as const },
        { nama: "Joko Widodo", role: "wali_kelas" as const },
    ];

    const teachers = [];
    for (let i = 0; i < guruData.length; i++) {
        const n = i + 1;
        const passwordHash = await bcrypt.hash(`admin${n}`, 10);
        const teacher = await prisma.teacher.upsert({
            where: { email: `guru${n}@testing.com` },
            update: {},
            create: {
                nama: guruData[i].nama,
                email: `guru${n}@testing.com`,
                passwordHash,
                role: guruData[i].role,
                isActive: true,
            },
        });
        teachers.push(teacher);
    }
    console.log(
        "Seeded teachers:",
        teachers.length,
        "(guru1@testing.com..guru10@testing.com, password admin1..admin10)",
    );

    const adminTeacher = teachers[0];

    const superadminPasswordHash = await bcrypt.hash("superadmin", 10);
    await prisma.teacher.upsert({
        where: { email: "superadmin@admin.com" },
        update: {},
        create: {
            nama: "Superadmin",
            email: "superadmin@admin.com",
            passwordHash: superadminPasswordHash,
            role: "superadmin",
            isActive: true,
        },
    });
    console.log(
        "Seeded superadmin: superadmin@admin.com (password: superadmin)",
    );

    // ─── SISWA (10 data) ───
    const studentData = [
        {
            nama: "Alexandra M. Ritiauw",
            nis: "1001",
            nisn: "3205877125",
            gender: "P" as const,
            jenjang: "TK" as const,
            kelas: "TK B",
            ttl: "2020-05-12",
            alamat: "Jl. Mawar No. 1",
            namaOrtu: "Marthen Ritiauw",
            noHpOrtu: "081234567001",
        },
        {
            nama: "Bagas Wicaksono",
            nis: "1002",
            nisn: "3205877126",
            gender: "L" as const,
            jenjang: "TK" as const,
            kelas: "TK A",
            ttl: "2021-02-20",
            alamat: "Jl. Melati No. 2",
            namaOrtu: "Wahyu Wicaksono",
            noHpOrtu: "081234567002",
        },
        {
            nama: "Citra Ayu Lestari",
            nis: "1003",
            nisn: "3205877127",
            gender: "P" as const,
            jenjang: "SD" as const,
            kelas: "1",
            ttl: "2019-08-03",
            alamat: "Jl. Anggrek No. 3",
            namaOrtu: "Slamet Lestari",
            noHpOrtu: "081234567003",
        },
        {
            nama: "Dimas Prayoga",
            nis: "1004",
            nisn: "3205877128",
            gender: "L" as const,
            jenjang: "SD" as const,
            kelas: "3",
            ttl: "2017-11-15",
            alamat: "Jl. Kenanga No. 4",
            namaOrtu: "Hari Prayoga",
            noHpOrtu: "081234567004",
        },
        {
            nama: "Elang Saputra",
            nis: "1005",
            nisn: "3205877129",
            gender: "L" as const,
            jenjang: "SD" as const,
            kelas: "5",
            ttl: "2015-03-22",
            alamat: "Jl. Dahlia No. 5",
            namaOrtu: "Bambang Saputra",
            noHpOrtu: "081234567005",
        },
        {
            nama: "Farah Nabila",
            nis: "1006",
            nisn: "3205877130",
            gender: "P" as const,
            jenjang: "SD" as const,
            kelas: "6",
            ttl: "2014-07-09",
            alamat: "Jl. Tulip No. 6",
            namaOrtu: "Ridwan Nabila",
            noHpOrtu: "081234567006",
        },
        {
            nama: "Gilang Ramadhan",
            nis: "1007",
            nisn: "3205877131",
            gender: "L" as const,
            jenjang: "SMP" as const,
            kelas: "7",
            ttl: "2013-01-17",
            alamat: "Jl. Cempaka No. 7",
            namaOrtu: "Agus Ramadhan",
            noHpOrtu: "081234567007",
        },
        {
            nama: "Hana Salsabila",
            nis: "1008",
            nisn: "3205877132",
            gender: "P" as const,
            jenjang: "SMP" as const,
            kelas: "8",
            ttl: "2012-09-28",
            alamat: "Jl. Flamboyan No. 8",
            namaOrtu: "Yusuf Salsabila",
            noHpOrtu: "081234567008",
        },
        {
            nama: "Irfan Maulana",
            nis: "1009",
            nisn: "3205877133",
            gender: "L" as const,
            jenjang: "SMP" as const,
            kelas: "9",
            ttl: "2011-04-05",
            alamat: "Jl. Teratai No. 9",
            namaOrtu: "Deni Maulana",
            noHpOrtu: "081234567009",
        },
        {
            nama: "Jasmine Putri",
            nis: "1010",
            nisn: "3205877134",
            gender: "P" as const,
            jenjang: "SMP" as const,
            kelas: "7",
            ttl: "2013-06-30",
            alamat: "Jl. Seroja No. 10",
            namaOrtu: "Fajar Putri",
            noHpOrtu: "081234567010",
        },
    ];

    const students = [];
    for (const s of studentData) {
        const student = await prisma.student.upsert({
            where: { nisn: s.nisn },
            update: {},
            create: {
                nama: s.nama,
                nis: s.nis,
                nisn: s.nisn,
                gender: s.gender,
                jenjang: s.jenjang,
                kelasSekarang: s.kelas,
                tanggalLahir: new Date(s.ttl),
                alamat: s.alamat,
                namaOrtu: s.namaOrtu,
                noHpOrtu: s.noHpOrtu,
            },
        });
        students.push(student);

        const existingHistory = await prisma.studentClassHistory.findFirst({
            where: { studentId: student.id, action: "masuk_baru" },
        });
        if (!existingHistory) {
            await prisma.studentClassHistory.create({
                data: {
                    studentId: student.id,
                    kelas: student.kelasSekarang,
                    tahunAjaran: "2026/2027",
                    action: "masuk_baru",
                    reason: "Data awal (seed)",
                    changedBy: adminTeacher.id,
                },
            });
        }
    }
    console.log(
        "Seeded students:",
        students.length,
        "(dengan histori kelas awal, belum ada QR)",
    );
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
