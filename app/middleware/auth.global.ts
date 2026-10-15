import type { TeacherRole } from "~/composables/useAuth";

export default defineNuxtRouteMiddleware(async (to) => {
    const { loggedIn, user, fetch } = useUserSession();

    await fetch();

    if (!loggedIn.value) {
        if (to.path === "/login") return;
        // Simpan halaman tujuan agar setelah login langsung kembali ke sana
        return navigateTo({
            path: "/login",
            query: to.fullPath !== "/" ? { redirect: to.fullPath } : {},
        });
    }

    if (to.path === "/login") {
        return navigateTo(safeRedirect(to.query.redirect));
    }

    // Halaman yang dibatasi role: definePageMeta({ roles: ["superadmin", "admin"] })
    const roles = to.meta.roles as TeacherRole[] | undefined;
    if (roles?.length && !roles.includes(user.value?.role as TeacherRole)) {
        return navigateTo({ path: "/", query: { denied: to.path } });
    }
});
