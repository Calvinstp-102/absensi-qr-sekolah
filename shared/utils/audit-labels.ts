// Label Log Aktivitas (Modul 7) — dipakai halaman Log Aktivitas (app/) dan export (server/)
import { SETTING_DEFS } from "./setting-rules";

export type KategoriAudit = "siswa" | "qr" | "absensi" | "pengaturan" | "guru" | "akun";

export const KATEGORI_AUDIT: Record<KategoriAudit, { label: string; badge: string }> = {
    siswa: { label: "Siswa", badge: "bg-primary-100 text-primary-700" },
    qr: { label: "QR Code", badge: "bg-cyan-100 text-cyan-700" },
    absensi: { label: "Absensi", badge: "bg-amber-100 text-amber-700" },
    pengaturan: { label: "Pengaturan", badge: "bg-slate-200 text-slate-700" },
    guru: { label: "Guru", badge: "bg-emerald-100 text-emerald-700" },
    akun: { label: "Akun & Login", badge: "bg-violet-100 text-violet-700" },
};

/** "bahaya" = penghapusan/pembatalan/login gagal (badge merah) */
export type ToneAudit = "normal" | "bahaya";

export const AKSI_AUDIT: Record<string, { label: string; kategori: KategoriAudit; tone?: ToneAudit }> = {
    // Siswa
    create_student: { label: "Tambah siswa", kategori: "siswa" },
    update_student: { label: "Ubah data siswa", kategori: "siswa" },
    change_class: { label: "Pindah kelas", kategori: "siswa" },
    change_student_status: { label: "Ubah status siswa", kategori: "siswa" },
    promote_class: { label: "Naik kelas", kategori: "siswa" },
    graduate: { label: "Lulus", kategori: "siswa" },
    update_student_photo: { label: "Ubah foto siswa", kategori: "siswa" },
    remove_student_photo: { label: "Hapus foto siswa", kategori: "siswa", tone: "bahaya" },
    delete_student: { label: "Hapus siswa", kategori: "siswa", tone: "bahaya" },
    // QR
    generate_qr: { label: "Generate QR (massal)", kategori: "qr" },
    regenerate_qr: { label: "Generate QR", kategori: "qr" },
    register_qr: { label: "Daftarkan kartu QR", kategori: "qr" },
    delete_qr: { label: "Hapus QR", kategori: "qr", tone: "bahaya" },
    // Absensi
    absen_manual: { label: "Absen manual", kategori: "absensi" },
    izin_pulang_awal: { label: "Izin pulang awal", kategori: "absensi" },
    correct_attendance: { label: "Terlambat dimaklumi", kategori: "absensi" },
    keterangan_absensi: { label: "Keterangan sakit/izin", kategori: "absensi" },
    batal_absen_masuk: { label: "Batal absen masuk", kategori: "absensi", tone: "bahaya" },
    batal_absen_pulang: { label: "Batal absen pulang", kategori: "absensi", tone: "bahaya" },
    // Pengaturan
    update_setting: { label: "Ubah pengaturan", kategori: "pengaturan" },
    create_holiday: { label: "Tambah hari libur", kategori: "pengaturan" },
    update_holiday: { label: "Ubah hari libur", kategori: "pengaturan" },
    delete_holiday: { label: "Hapus hari libur", kategori: "pengaturan", tone: "bahaya" },
    // Guru
    create_teacher: { label: "Tambah guru", kategori: "guru" },
    update_teacher: { label: "Ubah data guru", kategori: "guru" },
    reset_teacher_password: { label: "Reset password guru", kategori: "guru" },
    delete_teacher: { label: "Hapus guru", kategori: "guru", tone: "bahaya" },
    // Akun & login
    login: { label: "Login", kategori: "akun" },
    logout: { label: "Logout", kategori: "akun" },
    login_gagal: { label: "Login gagal", kategori: "akun", tone: "bahaya" },
    login_dikunci: { label: "Login dikunci", kategori: "akun", tone: "bahaya" },
    login_ditolak: { label: "Login ditolak (nonaktif)", kategori: "akun", tone: "bahaya" },
    change_password: { label: "Ganti password", kategori: "akun" },
};

/** Info aksi; aksi yang tidak dikenal tetap tampil apa adanya. */
export function infoAksi(actionType: string) {
    return AKSI_AUDIT[actionType] ?? { label: actionType, kategori: "pengaturan" as KategoriAudit, tone: "normal" as ToneAudit };
}

export function aksiPerKategori(kategori: KategoriAudit) {
    return Object.entries(AKSI_AUDIT)
        .filter(([, v]) => v.kategori === kategori)
        .map(([value, v]) => ({ value, label: v.label }));
}

// --- Field before/after

const LABEL_FIELD_DASAR: Record<string, string> = {
    nama: "Nama",
    email: "Email",
    noHp: "No HP",
    role: "Role",
    isActive: "Status akun",
    kelasWali: "Kelas wali",
    nis: "NIS",
    nisn: "NISN",
    gender: "Jenis kelamin",
    tanggalLahir: "Tanggal lahir",
    alamat: "Alamat",
    jenjang: "Jenjang",
    kelas: "Kelas",
    kelasSekarang: "Kelas",
    namaOrtu: "Nama orang tua",
    noHpOrtu: "No HP orang tua",
    status: "Status",
    statusReason: "Alasan status",
    adaFoto: "Foto",
    deleted: "Dihapus",
    qrAktif: "QR aktif",
    qrCodeId: "Kartu QR",
    qrUuid: "Kartu QR",
    diaktifkanKembali: "Kartu lama diaktifkan",
    statusUtama: "Status absensi",
    statusKoreksi: "Keterangan",
    tanggal: "Tanggal absensi",
    jamMasuk: "Jam masuk",
    jamPulang: "Jam pulang",
    waktu: "Waktu",
    pulangAwal: "Pulang awal",
    metode: "Metode",
    jenis: "Jenis",
    tanggalMulai: "Tanggal mulai",
    tanggalSelesai: "Tanggal selesai",
    keterangan: "Keterangan",
    ip: "Alamat IP",
    perangkat: "Perangkat",
    alasanGagal: "Penyebab",
    sisaPercobaan: "Sisa percobaan",
    ingatSaya: "Ingat saya",
};

export function labelField(field: string) {
    return LABEL_FIELD_DASAR[field] ?? SETTING_DEFS[field]?.label ?? field;
}

const NILAI: Record<string, Record<string, string>> = {
    role: { superadmin: "Superadmin", admin: "Admin", guru_piket: "Guru Piket", wali_kelas: "Wali Kelas" },
    gender: { L: "Laki-laki", P: "Perempuan" },
    status: { active: "Aktif", inactive: "Nonaktif" },
    statusUtama: { hadir: "Hadir", terlambat: "Terlambat", tidak_hadir: "Tidak hadir" },
    statusKoreksi: { dimaklumi: "Dimaklumi", sakit: "Sakit", izin: "Izin" },
    metode: { qr: "QR", manual: "Manual" },
    jenis: { masuk: "Masuk", pulang: "Pulang" },
};

const ISO_WAKTU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Nilai before/after siap tampil (Bahasa Indonesia, waktu WIB). */
export function formatNilaiAudit(field: string, value: unknown): string {
    if (value === null || value === undefined || value === "") return "–";
    if (typeof value === "boolean") {
        if (field === "isActive") return value ? "Aktif" : "Nonaktif";
        if (field === "adaFoto") return value ? "Ada" : "Tidak ada";
        return value ? "Ya" : "Tidak";
    }
    if (typeof value === "string") {
        if (NILAI[field]?.[value]) return NILAI[field]![value]!;
        if (field === "hari_sekolah") {
            const nama = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
            return value.split(",").map((d) => nama[Number(d)] ?? d).join(", ");
        }
        if (ISO_WAKTU.test(value)) {
            const d = new Date(value);
            if (!Number.isNaN(d.getTime())) {
                const wib = new Date(d.getTime() + 7 * 3600_000).toISOString();
                const t = `${wib.slice(8, 10)}/${wib.slice(5, 7)}/${wib.slice(0, 4)}`;
                return /T00:00:00(\.000)?Z$/.test(value) ? t : `${t} ${wib.slice(11, 16)} WIB`;
            }
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
        return value;
    }
    if (typeof value === "number") return value.toLocaleString("id-ID");
    return JSON.stringify(value);
}

export type PerubahanAudit = { field: string; label: string; sebelum: string; sesudah: string; berubah: boolean };

/**
 * Gabung before/after jadi daftar field. Field `ip`/`perangkat` tidak dimasukkan (tampil terpisah).
 * Field yang hanya ada di `before` (mis. data siswa saat dihapus) = konteks, tidak dianggap berubah.
 */
export function daftarPerubahan(before: unknown, after: unknown): PerubahanAudit[] {
    const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
    const b = obj(before);
    const a = obj(after);
    const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((f) => f !== "ip" && f !== "perangkat");
    const list = fields.map((field) => {
        const sebelum = field in b ? formatNilaiAudit(field, b[field]) : "–";
        const sesudah = field in a ? formatNilaiAudit(field, a[field]) : sebelum;
        return { field, label: labelField(field), sebelum, sesudah, berubah: sebelum !== sesudah };
    });
    // Yang berubah ditampilkan lebih dulu
    return [...list.filter((p) => p.berubah), ...list.filter((p) => !p.berubah)];
}

/** Ringkasan 1 baris: "Kelas: SD 3 → SD 4; Nama: A → B" (hanya yang berubah). */
export function ringkasPerubahan(list: PerubahanAudit[], maks = 3) {
    const berubah = list.filter((p) => p.berubah);
    const teks = berubah.slice(0, maks).map((p) =>
        p.sebelum === "–" ? `${p.label}: ${p.sesudah}` : `${p.label}: ${p.sebelum} → ${p.sesudah}`,
    );
    if (berubah.length > maks) teks.push(`+${berubah.length - maks} lainnya`);
    return teks.join("; ");
}
