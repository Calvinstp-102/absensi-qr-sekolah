export default defineNuxtRouteMiddleware(async (to) => {
    const { loggedIn, fetch } = useUserSession();

    await fetch();

    if (!loggedIn.value && to.path !== "/login") {
        return navigateTo("/login");
    }

    if (loggedIn.value && to.path === "/login") {
        return navigateTo("/");
    }
});
