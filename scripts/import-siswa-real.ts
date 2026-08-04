import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { toDbDate } from "../server/utils/date-utils";
import { dataSiswaReal } from "./data-siswa-real";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const superadmin = await prisma.teacher.findUnique({ where: { email: "superadmin@admin.com" } });
  if (!superadmin) {
    console.error("Akun superadmin@admin.com tidak ditemukan, jalankan seed dulu.");
    process.exit(1);
  }

  const tahunAjaran = await prisma.settings.findUnique({ where: { key: "tahun_ajaran_aktif" } });
  const tahunAjaranValue = tahunAjaran?.value ?? "2026/2027";

  let created = 0;
  let skipped = 0;

  for (const s of dataSiswaReal) {
    const existing = await prisma.student.findUnique({ where: { nisn: s.nisn } });
    if (existing) {
      console.log(`Lewati (sudah ada): ${s.nama} (NISN ${s.nisn})`);
      skipped++;
      continue;
    }

    const student = await prisma.student.create({
      data: {
        nama: s.nama,
        nis: s.nis,
        nisn: s.nisn,
        gender: s.gender as "L" | "P",
        tanggalLahir: s.tanggalLahir ? toDbDate(s.tanggalLahir) : null,
        alamat: s.alamat,
        jenjang: s.jenjang as "TK" | "SD" | "SMP",
        kelasSekarang: s.kelasSekarang,
        namaOrtu: s.namaOrtu,
        noHpOrtu: null,
      },
    });

    await prisma.studentClassHistory.create({
      data: {
        studentId: student.id,
        kelas: s.kelasSekarang,
        tahunAjaran: tahunAjaranValue,
        action: "masuk_baru",
        reason: "Import data dari Excel sekolah",
        changedBy: superadmin.id,
      },
    });

    console.log(`Ditambahkan: ${s.nama} (${s.jenjang} ${s.kelasSekarang})`);
    created++;
  }

  console.log(`\nSelesai. ${created} siswa ditambahkan, ${skipped} dilewati (NISN sudah ada).`);
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