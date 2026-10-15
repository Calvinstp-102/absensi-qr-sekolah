import type { TeacherRole } from "~/composables/useAuth";

declare module "#app" {
    interface PageMeta {
        /** Role yang boleh membuka halaman ini. Kosong = semua guru yang login. */
        roles?: TeacherRole[];
    }
}

export {};
