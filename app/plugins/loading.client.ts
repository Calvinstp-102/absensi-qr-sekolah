export default defineNuxtPlugin(() => {
    const { show, hide } = useLoading();
    const { clear } = useUserSession();
    const toast = useToast();
    const route = useRoute();

    // Endpoint auth yang 401-nya ditangani sendiri oleh halaman (bukan "sesi habis")
    const AUTH_ENDPOINTS = ["/api/auth/login", "/api/_auth/session"];
    let handlingExpiredSession = false;

    async function handleSessionExpired(message: string) {
        // Banyak request bisa gagal bersamaan -> cukup tangani sekali
        if (handlingExpiredSession) return;
        handlingExpiredSession = true;
        try {
            await clear().catch(() => {});
            toast.warning("Sesi berakhir", message);
            const redirect =
                route.path !== "/login" ? route.fullPath : undefined;
            await navigateTo({
                path: "/login",
                query: { ...(redirect && { redirect }), reason: "expired" },
            });
        } finally {
            handlingExpiredSession = false;
        }
    }

    // 401 dari API apa pun (kecuali login) = sesi habis
    function handleUnauthorized(request: RequestInfo, response: { status: number; _data?: unknown }) {
        const url = typeof request === "string" ? request : request.url;
        if (
            response.status === 401 &&
            !AUTH_ENDPOINTS.some((p) => url.includes(p))
        ) {
            handleSessionExpired(
                getErrorMessage(
                    { statusCode: 401, data: response._data },
                    "Silakan login kembali.",
                ),
            );
        }
    }

    // Klien API aplikasi: overlay loading + penanganan sesi habis.
    // Pakai lewat useApi() / useApiFetch(), BUKAN $fetch langsung
    // ($fetch auto-import Nuxt sudah terikat sebelum plugin ini berjalan).
    const api = $fetch.create({
        onRequest() {
            show();
        },
        onResponse() {
            hide();
        },
        onRequestError() {
            hide();
        },
        onResponseError({ request, response }) {
            hide();
            handleUnauthorized(request, response);
        },
    });

    // Sama, tapi tanpa overlay: untuk scan beruntun & polling (useApi({ silent: true }))
    const apiSilent = $fetch.create({
        onResponseError({ request, response }) {
            handleUnauthorized(request, response);
        },
    });

    return { provide: { api, apiSilent } };
});
