// Tipe data sesi login untuk nuxt-auth-utils (dipakai di app/ dan server/)
declare module "#auth-utils" {
    interface User {
        id: number;
        uuid: string;
        nama: string;
        email: string;
        role: "superadmin" | "admin" | "guru_piket" | "wali_kelas";
        fotoPath: string | null;
    }

    interface UserSession {
        /** Harus sama dengan teachers.session_version, kalau beda sesi dianggap kedaluwarsa */
        sessionVersion?: number;
        /** true = "Ingat saya" (30 hari), false = 12 jam */
        remember?: boolean;
        /** Waktu login (epoch ms) */
        loggedInAt?: number;
    }
}

export {};
