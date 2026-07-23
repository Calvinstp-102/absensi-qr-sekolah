# Absensi QR Sekolah

Sistem absensi berbasis QR Code untuk Yayasan Pendidikan Adventus Serang (TK-SD-SMP). Siswa memiliki kartu ber-QR unik yang di-scan oleh guru piket untuk mencatat kehadiran masuk dan pulang. Dilengkapi dashboard guru, manajemen data siswa, koreksi absensi, audit log, dan export laporan.

## Tech Stack

- **Framework**: Nuxt 4
- **Database**: MySQL (via Prisma ORM 7, menggunakan `@prisma/adapter-mariadb`)
- **Styling**: Tailwind CSS
- **Auth**: `nuxt-auth-utils` (session-based)
- **QR**: `html5-qrcode` (scan via kamera browser), `qrcode` (generate gambar)
- **Export**: `exceljs` (Excel), `pdf-lib` (PDF)
- **Cron**: `node-cron` (status telat/tidak hadir otomatis, cleanup QR kedaluwarsa)

## Setup Awal (Development)

### 1. Clone & Install

```bash
git clone https://github.com/Calvinstp-102/absensi-qr-sekolah.git
cd absensi-qr-sekolah
npm install --legacy-peer-deps
```

> Catatan: `--legacy-peer-deps` diperlukan karena bug resolver di beberapa versi npm saat menangani dependency tree project ini.

### 2. Setup Database

Buat database MySQL kosong (misal via HeidiSQL/phpMyAdmin):
```sql
CREATE DATABASE absensi_qr_sekolah;
```

### 3. Environment Variables

Copy `.env.example` ke `.env` (buat file `.env.example` kalau belum ada, isi sesuai contoh di bawah), lalu sesuaikan:

```env
DATABASE_URL="mysql://root:@localhost:3306/absensi_qr_sekolah"
NUXT_SESSION_PASSWORD="ganti-dengan-string-acak-minimal-32-karakter"
```

`NUXT_SESSION_PASSWORD` adalah kunci enkripsi cookie sesi login — sekali diisi dan ada user yang login, jangan diubah lagi (semua sesi aktif akan invalid kalau diubah).

### 4. Migrasi & Seed

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Seed otomatis membuat:
- **1 akun superadmin**: `superadmin@admin.com` / `superadmin`
- **10 akun guru**: `guru1@testing.com` s/d `guru10@testing.com`, password `admin1` s/d `admin10`
- **10 data siswa contoh** (belum ada QR — generate manual dari halaman Detail Siswa)
- **11 pengaturan default** (jam operasional, toleransi telat, dll — bisa diubah dari halaman Pengaturan)

> **Penting**: ganti semua password default ini sebelum dipakai production.

### 5. Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Struktur Folder
app/
├── pages/ # Setiap file = 1 halaman/route
├── components/ # Komponen reusable (ConfirmDialog, LoadingOverlay, dll)
├── composables/ # Logic reusable (useConfirm, useLoading)
├── layouts/ # Kerangka halaman (sidebar, dll)
├── middleware/ # Route guard client-side (auth.global.ts)
└── plugins/ # Plugin client (loading interceptor)
server/
├── api/ # Endpoint backend (Nitro)
├── utils/ # Helper (prisma client, qr-token, storage, dll)
└── plugins/ # Plugin server (cron jobs)
prisma/
├── schema.prisma # Skema database
├── seed.ts # Data awal
└── migrations/ # Riwayat migrasi
storage/ # File QR & foto profil (TIDAK di-serve via URL publik,
# hanya bisa diakses lewat endpoint API yang wajib login)
├── qrcodes/
└── photos/
├── students/
└── teachers/


## Role & Hak Akses

| Role | Akses |
|---|---|
| `superadmin` | Semua akses, termasuk CRUD akun guru |
| `admin` | Semua akses kecuali CRUD akun guru; termasuk Pengaturan |
| `guru_piket` | Dashboard, Scan, Data Siswa (lihat), Log Aktivitas |
| `wali_kelas` | Sama seperti guru_piket |

Semua role bisa mengubah foto profil miliknya sendiri; hanya `superadmin` yang bisa mengubah foto guru lain.

## Catatan Teknis Penting

- **Prisma 7** memakai driver adapter (`@prisma/adapter-mariadb`) untuk koneksi MySQL — bukan `url` langsung di `schema.prisma`, melainkan lewat `prisma.config.ts` + `server/utils/prisma.ts`.
- **Soft delete**: penghapusan data siswa/guru/QR tidak menghapus baris di database, hanya menandai kolom `deleted = true`. Semua query di endpoint API sudah otomatis memfilter `deleted: false`.
- **QR Code**: token QR (string acak, disimpan di tabel `qr_codes`) berbeda dari `uuid` (dipakai untuk penamaan file gambar). Saat generate ulang QR, QR lama tetap berlaku selama masa tenggang (`qr_grace_period_hari`, default 3 hari) sebelum otomatis nonaktif via cron harian.
- **Cron jobs** (`server/plugins/cron.ts`) berjalan selama proses Node aktif — pastikan hosting production menjaga proses tetap hidup terus-menerus (bukan platform serverless yang mematikan proses saat idle).
- **Timezone**: kolom tanggal (`@db.Date`) dikonversi manual via `toDbDate()` di `server/utils/date-utils.ts` untuk menghindari pergeseran tanggal akibat perbedaan WIB (UTC+7) dengan representasi UTC internal JavaScript `Date`.

## Deployment

Lihat dokumentasi internal / chat riwayat pengembangan untuk panduan deploy ke Railway (termasuk catatan penting soal Railway Volume untuk persist folder `storage/`).