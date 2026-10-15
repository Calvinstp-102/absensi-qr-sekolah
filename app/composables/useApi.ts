// Klien API standar. Selalu pakai ini, jangan $fetch / useFetch langsung,
// agar loading overlay & penanganan sesi habis (401) berjalan.
// `silent: true` = tanpa overlay (scan beruntun, polling); penanganan 401 tetap jalan.

export function useApi(options: { silent?: boolean } = {}): typeof $fetch {
    // Di server (SSR) plugin $api tidak ada -> pakai $fetch bawaan
    if (!import.meta.client) return $fetch;
    const nuxtApp = useNuxtApp();
    return options.silent ? nuxtApp.$apiSilent : nuxtApp.$api;
}

// Sama seperti useFetch (termasuk tipe respons), tapi lewat $api di browser.
// Di server, Nuxt tetap memakai useRequestFetch agar cookie sesi ikut terkirim.
export const useApiFetch = createUseFetch(() =>
    import.meta.client ? { $fetch: useNuxtApp().$api } : {},
);
