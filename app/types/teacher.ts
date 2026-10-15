import type { TeacherRole } from "~/composables/useAuth";
import type { Jenjang } from "#shared/utils/kelas";

export type { TeacherRole };

/** Data guru dari GET /api/teachers (tanggal sudah berupa string JSON). */
export interface TeacherRow {
    id: number;
    uuid: string;
    nama: string;
    email: string;
    noHp: string | null;
    role: TeacherRole;
    isActive: boolean;
    fotoPath: string | null;
    lastLoginAt: string | null;
    dateCreated: string;
    dateModified: string;
    /** Kelas yang dipegang (role Wali Kelas, Modul 5) */
    waliKelas?: { jenjang: Jenjang; kelas: string }[];
}

/** Role yang boleh dipilih di form (Superadmin tidak bisa diberikan lewat aplikasi). */
export const ASSIGNABLE_ROLES: { value: Exclude<TeacherRole, "superadmin">; label: string; desc: string }[] = [
    { value: "admin", label: "Admin", desc: "Kelola siswa, QR, dan pengaturan" },
    { value: "guru_piket", label: "Guru Piket", desc: "Scan absensi & lihat laporan" },
    { value: "wali_kelas", label: "Wali Kelas", desc: "Scan absensi & lihat laporan" },
];

export const ROLE_BADGE_CLASS: Record<TeacherRole, string> = {
    superadmin: "bg-purple-100 text-purple-700",
    admin: "bg-primary-100 text-primary-700",
    guru_piket: "bg-amber-100 text-amber-700",
    wali_kelas: "bg-emerald-100 text-emerald-700",
};

/** Aksi di menu titik tiga daftar guru. */
export type TeacherAction = "edit" | "reset" | "toggle" | "photo" | "removePhoto" | "delete";
