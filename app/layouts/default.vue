<template>
    <div class="flex min-h-screen bg-gray-100">
        <aside class="w-64 bg-primary-700 text-white flex flex-col shrink-0">
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

            <div class="px-5 py-4 border-t border-primary-600">
                <p class="text-sm font-medium truncate">{{ user?.nama }}</p>
                <p class="text-xs text-primary-200 mb-2 capitalize">
                    {{ roleLabel }}
                </p>
                <button
                    @click="handleLogout"
                    class="text-xs text-accent-400 hover:text-accent-300 font-medium"
                >
                    Logout
                </button>
            </div>
        </aside>

        <main class="flex-1 p-8 overflow-auto">
            <slot />
        </main>
    </div>
</template>

<script setup lang="ts">
const { user, clear } = useUserSession();
const route = useRoute();

const roleLabel = computed(() => {
    const map: Record<string, string> = {
        admin: "Admin",
        guru_piket: "Guru Piket",
        wali_kelas: "Wali Kelas",
    };
    return user.value?.role ? (map[user.value.role] ?? user.value.role) : "";
});

async function handleLogout() {
    await $fetch("/api/auth/logout", { method: "POST" });
    await clear();
    await navigateTo("/login");
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
