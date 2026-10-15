export type TeacherRole = "superadmin" | "admin" | "guru_piket" | "wali_kelas";

export const ROLE_LABELS: Record<TeacherRole, string> = {
    superadmin: "Superadmin",
    admin: "Admin",
    guru_piket: "Guru Piket",
    wali_kelas: "Wali Kelas",
};

export const ADMIN_ROLES: TeacherRole[] = ["superadmin", "admin"];

export function useAuth() {
    const { user, loggedIn } = useUserSession();

    const role = computed(() => user.value?.role as TeacherRole | undefined);

    function hasRole(roles: TeacherRole[]) {
        return !!role.value && roles.includes(role.value);
    }

    return {
        user,
        loggedIn,
        role,
        hasRole,
        isAdmin: computed(() => hasRole(ADMIN_ROLES)),
        isSuperadmin: computed(() => role.value === "superadmin"),
        roleLabel: computed(() => (role.value ? ROLE_LABELS[role.value] : "")),
    };
}

/** Hanya izinkan redirect ke path internal (cegah open redirect ke situs lain). */
export function safeRedirect(value: unknown): string {
    if (typeof value !== "string") return "/";
    if (!value.startsWith("/") || value.startsWith("//")) return "/";
    if (value.startsWith("/login")) return "/";
    return value;
}
