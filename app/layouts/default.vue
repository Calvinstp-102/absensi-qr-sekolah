<template>
    <div class="flex min-h-screen bg-gray-100">
        <!-- Mode layar penuh halaman Scan (kiosk): sidebar disembunyikan -->
        <aside v-show="!kiosk" class="w-64 bg-primary-700 text-white flex flex-col shrink-0">
            <div class="px-6 py-6 border-b border-primary-600">
                <p class="font-heading font-bold text-base leading-snug">
                    Yayasan Pendidikan Adventus Serang
                </p>
                <p class="text-xs text-primary-100 mt-1">Sistem Absensi</p>
            </div>

            <nav class="flex-1 px-3 py-4 space-y-1">
                <NuxtLink
                    to="/"
                    class="nav-link"
                    :class="{ 'nav-link-active': route.path === '/' }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <rect x="3" y="3" width="7" height="9" rx="1.5" />
                        <rect x="14" y="3" width="7" height="5" rx="1.5" />
                        <rect x="14" y="12" width="7" height="9" rx="1.5" />
                        <rect x="3" y="16" width="7" height="5" rx="1.5" />
                    </svg>
                    Dashboard
                </NuxtLink>
                <NuxtLink
                    to="/siswa"
                    class="nav-link"
                    :class="{
                        'nav-link-active': route.path.startsWith('/siswa'),
                    }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <circle cx="12" cy="7" r="3.5" />
                        <path
                            d="M4.5 21c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5"
                        />
                    </svg>
                    Data Siswa
                </NuxtLink>
                <NuxtLink
                    to="/scan"
                    class="nav-link"
                    :class="{ 'nav-link-active': route.path === '/scan' }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <rect x="3" y="3" width="6" height="6" rx="1" />
                        <rect x="15" y="3" width="6" height="6" rx="1" />
                        <rect x="3" y="15" width="6" height="6" rx="1" />
                        <path
                            d="M15 15h2.5v2.5H15zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"
                        />
                    </svg>
                    Scan
                </NuxtLink>
                <NuxtLink
                    to="/laporan"
                    class="nav-link"
                    :class="{ 'nav-link-active': route.path.startsWith('/laporan') }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
                        <path d="M14 3v6h6M8 17v-3M12 17v-6M16 17v-2" />
                    </svg>
                    Laporan
                </NuxtLink>
                <NuxtLink
                    v-if="user?.role === 'superadmin' || user?.role === 'admin'"
                    to="/guru"
                    class="nav-link"
                    :class="{ 'nav-link-active': route.path === '/guru' }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
                        <circle cx="10" cy="7" r="4" />
                        <path
                            d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        />
                    </svg>
                    Manajemen Guru
                </NuxtLink>
                <NuxtLink
                    v-if="user?.role === 'superadmin' || user?.role === 'admin'"
                    to="/log-aktivitas"
                    class="nav-link"
                    :class="{
                        'nav-link-active': route.path === '/log-aktivitas',
                    }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <path d="M4 6h16M4 12h16M4 18h10" />
                    </svg>
                    Log Aktivitas
                </NuxtLink>
                <NuxtLink
                    v-if="user?.role === 'admin' || user?.role === 'superadmin'"
                    to="/pengaturan"
                    class="nav-link"
                    :class="{ 'nav-link-active': route.path === '/pengaturan' }"
                >
                    <svg
                        class="w-[18px] h-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <circle cx="12" cy="12" r="3" />
                        <path
                            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                        />
                    </svg>
                    Pengaturan
                </NuxtLink>
            </nav>

            <div class="px-3 py-3 border-t border-primary-600">
                <NuxtLink
                    to="/akun"
                    class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                    :class="{ 'bg-white/15': route.path === '/akun' }"
                    title="Akun Saya"
                >
                    <UserAvatar
                        :nama="user?.nama ?? ''"
                        :uuid="user?.uuid"
                        :foto-path="user?.fotoPath"
                        size="sm"
                        color-class="bg-primary-600 text-white"
                    />
                    <div class="min-w-0">
                        <p class="text-sm font-medium truncate">
                            {{ user?.nama }}
                        </p>
                        <p class="text-xs text-primary-200">{{ roleLabel }}</p>
                    </div>
                </NuxtLink>
                <button
                    type="button"
                    class="mt-1 w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-accent-400 hover:text-accent-300 hover:bg-white/5 font-medium"
                    :disabled="isLoggingOut"
                    @click="handleLogout"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    >
                        <path
                            d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                        />
                    </svg>
                    {{ isLoggingOut ? "Keluar..." : "Keluar" }}
                </button>
            </div>
        </aside>

        <main class="flex-1 overflow-auto" :class="kiosk ? 'p-4' : 'p-8'">
            <slot />
        </main>
    </div>
</template>

<script setup lang="ts">
const { user, roleLabel } = useAuth();
const { clear } = useUserSession();
const { confirm } = useConfirm();
const toast = useToast();
const api = useApi();
const route = useRoute();
const router = useRouter();
const kiosk = useState<boolean>("scan-kiosk", () => false);

// Diarahkan ke sini oleh middleware karena role tidak berhak membuka halaman
watch(
    () => route.query.denied,
    (denied) => {
        if (!denied || !import.meta.client) return;
        toast.warning(
            "Akses ditolak",
            "Anda tidak memiliki akses ke halaman tersebut.",
        );
        const { denied: _, ...query } = route.query;
        router.replace({ query });
    },
    { immediate: true },
);

const isLoggingOut = ref(false);
async function handleLogout() {
    const ok = await confirm({
        title: "Keluar dari aplikasi?",
        message: "Anda perlu login kembali untuk menggunakan sistem absensi.",
        confirmText: "Ya, Keluar",
    });
    if (!ok) return;

    isLoggingOut.value = true;
    try {
        await api("/api/auth/logout", { method: "POST" });
    } catch {
        // Tetap lanjut keluar di sisi browser walau server tidak merespons
    } finally {
        await clear().catch(() => {});
        isLoggingOut.value = false;
        toast.info("Anda telah keluar", "Sampai jumpa kembali!");
        await navigateTo("/login");
    }
}
</script>

<style scoped>
.nav-link {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.75);
    transition: background-color 0.15s ease;
}
.nav-link:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: white;
}
.nav-link-active {
    background-color: rgba(255, 255, 255, 0.15);
    color: white;
    font-weight: 500;
}
</style>
