<template>
    <div>
        <!-- Header -->
        <div class="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">
                    Manajemen Guru
                </h1>
                <p class="text-gray-500 text-sm mt-1">
                    {{
                        isSuperadmin
                            ? "Kelola akun login, role, dan status guru"
                            : "Daftar akun guru (hanya Superadmin yang dapat mengubah)"
                    }}
                </p>
            </div>
            <button
                v-if="isSuperadmin"
                type="button"
                class="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm"
                @click="openAdd"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" />
                </svg>
                Tambah Guru
            </button>
        </div>

        <!-- Ringkasan -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div
                v-for="card in summaryCards"
                :key="card.label"
                class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
            >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :class="card.iconClass">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path v-for="d in card.icon" :key="d" :d="d" />
                    </svg>
                </div>
                <div class="min-w-0">
                    <p class="text-xs text-gray-500">{{ card.label }}</p>
                    <p class="text-xl font-heading font-bold text-gray-800 leading-tight">
                        {{ data ? card.value : "–" }}
                    </p>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2 lg:col-span-1">
                <p class="text-xs text-gray-500 mb-2">Komposisi role</p>
                <div class="flex flex-wrap gap-1.5">
                    <button
                        v-for="r in roleOrder"
                        :key="r"
                        type="button"
                        class="px-2 py-0.5 rounded-full text-xs font-medium transition-shadow"
                        :class="[
                            ROLE_BADGE_CLASS[r],
                            filters.role === r ? 'ring-2 ring-offset-1 ring-primary-400' : 'hover:ring-1 hover:ring-gray-300',
                        ]"
                        :title="`Tampilkan hanya ${ROLE_LABELS[r]}`"
                        @click="filters.role = filters.role === r ? '' : r"
                    >
                        {{ ROLE_LABELS[r] }} · {{ data?.summary.perRole[r] ?? 0 }}
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-md">
            <!-- Toolbar -->
            <div class="p-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
                <div class="relative flex-1 min-w-[200px]">
                    <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        v-model="searchInput"
                        type="search"
                        placeholder="Cari nama, email, atau no HP..."
                        aria-label="Cari guru"
                        class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <select
                    v-model="filters.role"
                    aria-label="Filter role"
                    class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                    <option value="">Semua role</option>
                    <option v-for="r in roleOrder" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
                </select>
                <select
                    v-model="filters.status"
                    aria-label="Filter status"
                    class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                    <option value="">Semua status</option>
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                </select>
                <button
                    v-if="hasFilter"
                    type="button"
                    class="text-sm text-gray-500 hover:text-gray-800 px-2 py-2"
                    @click="resetFilters"
                >
                    Reset filter
                </button>
            </div>

            <!-- Error memuat -->
            <div v-if="error && !data" class="p-8 text-center">
                <p class="text-sm text-red-600 mb-3">{{ getErrorMessage(error, "Gagal memuat data guru.") }}</p>
                <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="refresh()">
                    Coba lagi
                </button>
            </div>

            <template v-else>
                <!-- Tabel (desktop) -->
                <div class="hidden md:block overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Guru</th>
                                <th class="px-4 py-3 font-medium">No HP</th>
                                <th class="px-4 py-3 font-medium">Role</th>
                                <th class="px-4 py-3 font-medium">Status</th>
                                <th class="px-4 py-3 font-medium">Login Terakhir</th>
                                <th class="px-4 py-3 font-medium">Dibuat</th>
                                <th v-if="isSuperadmin" class="px-4 py-3 w-12"><span class="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody :class="{ 'opacity-60 transition-opacity': pending && data }">
                            <template v-if="pending && !data">
                                <tr v-for="i in 5" :key="i" class="border-t border-gray-100 animate-pulse">
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-full bg-gray-200"></div>
                                            <div class="space-y-1.5">
                                                <div class="h-3 w-32 bg-gray-200 rounded"></div>
                                                <div class="h-2.5 w-40 bg-gray-100 rounded"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td v-for="j in columnCount - 1" :key="j" class="px-4 py-3">
                                        <div class="h-3 w-16 bg-gray-100 rounded"></div>
                                    </td>
                                </tr>
                            </template>
                            <tr v-else-if="!teachers.length">
                                <td :colspan="columnCount" class="p-0">
                                    <EmptyState />
                                </td>
                            </tr>
                            <tr
                                v-for="t in teachers"
                                v-else
                                :key="t.id"
                                class="border-t border-gray-100 hover:bg-primary-50/40 transition-colors"
                                :class="{ 'bg-gray-50/70': !t.isActive }"
                            >
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <div class="relative">
                                            <UserAvatar
                                                :nama="t.nama"
                                                :uuid="t.uuid"
                                                :foto-path="t.fotoPath"
                                                :class="{ 'grayscale opacity-70': !t.isActive }"
                                            />
                                            <span
                                                v-if="photo.busyUuid.value === t.uuid"
                                                class="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center"
                                            >
                                                <span class="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></span>
                                            </span>
                                        </div>
                                        <div class="min-w-0">
                                            <p class="font-medium text-gray-800 truncate flex items-center gap-1.5">
                                                {{ t.nama }}
                                                <span v-if="t.id === currentUserId" class="px-1.5 py-px rounded bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wide">
                                                    Anda
                                                </span>
                                            </p>
                                            <p class="text-xs text-gray-500 truncate">{{ t.email }}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ t.noHp || "–" }}</td>
                                <td class="px-4 py-3">
                                    <span class="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" :class="ROLE_BADGE_CLASS[t.role]">
                                        {{ ROLE_LABELS[t.role] }}
                                    </span>
                                    <p v-if="t.role === 'wali_kelas'" class="text-xs mt-1" :class="t.waliKelas?.length ? 'text-gray-500' : 'text-amber-600'">
                                        {{ labelWali(t) }}
                                    </p>
                                </td>
                                <td class="px-4 py-3">
                                    <StatusBadge :active="t.isActive" />
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span v-if="t.lastLoginAt" class="text-gray-600" :title="formatDateTime(t.lastLoginAt)">
                                        {{ formatRelative(t.lastLoginAt) }}
                                    </span>
                                    <span v-else class="text-gray-400 italic">Belum pernah</span>
                                </td>
                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap" :title="formatDateTime(t.dateCreated)">
                                    {{ formatDate(t.dateCreated) }}
                                </td>
                                <td v-if="isSuperadmin" class="px-4 py-3 text-right">
                                    <GuruActionMenu :teacher="t" :is-self="t.id === currentUserId" @action="(a) => handleAction(a, t)" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Kartu (mobile) -->
                <div class="md:hidden divide-y divide-gray-100">
                    <div v-if="pending && !data" class="p-6 text-center text-sm text-gray-400">
                        Memuat data guru...
                    </div>
                    <EmptyState v-else-if="!teachers.length" />
                    <div v-for="t in teachers" v-else :key="t.id" class="p-4 flex gap-3">
                        <UserAvatar :nama="t.nama" :uuid="t.uuid" :foto-path="t.fotoPath" :class="{ 'grayscale opacity-70': !t.isActive }" />
                        <div class="min-w-0 flex-1">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="font-medium text-gray-800 truncate">
                                        {{ t.nama }}
                                        <span v-if="t.id === currentUserId" class="text-[10px] text-gray-500 font-semibold uppercase">(Anda)</span>
                                    </p>
                                    <p class="text-xs text-gray-500 truncate">{{ t.email }}</p>
                                </div>
                                <GuruActionMenu
                                    v-if="isSuperadmin"
                                    :teacher="t"
                                    :is-self="t.id === currentUserId"
                                    @action="(a) => handleAction(a, t)"
                                />
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 mt-2">
                                <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="ROLE_BADGE_CLASS[t.role]">
                                    {{ ROLE_LABELS[t.role] }}
                                </span>
                                <span v-if="t.role === 'wali_kelas'" class="text-xs" :class="t.waliKelas?.length ? 'text-gray-500' : 'text-amber-600'">
                                    {{ labelWali(t) }}
                                </span>
                                <StatusBadge :active="t.isActive" />
                            </div>
                            <p class="text-xs text-gray-500 mt-2">
                                {{ t.noHp || "Tanpa no HP" }} ·
                                {{ t.lastLoginAt ? `Login ${formatRelative(t.lastLoginAt)}` : "Belum pernah login" }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm flex-wrap gap-3">
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                        <span>Tampilkan</span>
                        <select
                            v-model.number="pageSize"
                            aria-label="Jumlah per halaman"
                            class="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                        >
                            <option :value="10">10</option>
                            <option :value="25">25</option>
                            <option :value="50">50</option>
                        </select>
                        <span>{{ rangeText }}</span>
                    </div>
                    <div v-if="pagination && pagination.totalPages > 1" class="flex items-center gap-1">
                        <button
                            type="button"
                            :disabled="currentPage <= 1"
                            class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                            @click="currentPage--"
                        >
                            Sebelumnya
                        </button>
                        <span class="text-xs text-gray-500 px-2">
                            Hal {{ pagination.page }} / {{ pagination.totalPages }}
                        </span>
                        <button
                            type="button"
                            :disabled="currentPage >= pagination.totalPages"
                            class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                            @click="currentPage++"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            </template>
        </div>

        <!-- Input file foto (dipakai bersama untuk semua baris) -->
        <input ref="photoInput" type="file" :accept="PHOTO_ACCEPT" class="hidden" @change="onPhotoSelected" />

        <GuruFormModal
            :open="formOpen"
            :teacher="editingTeacher"
            :current-user-id="currentUserId"
            @close="formOpen = false"
            @saved="onSaved"
        />
        <GuruResetPasswordModal :teacher="resetTeacher" @close="resetTeacher = null" @saved="onResetSaved" />
    </div>
</template>

<script setup lang="ts">
import { ROLE_BADGE_CLASS, type TeacherAction, type TeacherRole, type TeacherRow } from "~/types/teacher";

definePageMeta({ roles: ["superadmin", "admin"] });
useHead({ title: "Manajemen Guru" });

const toast = useToast();
const api = useApi();
const { confirm } = useConfirm();
const { user, isSuperadmin } = useAuth();
const photo = useTeacherPhoto();
const route = useRoute();
const router = useRouter();

const currentUserId = computed(() => user.value?.id);
const roleOrder: TeacherRole[] = ["superadmin", "admin", "guru_piket", "wali_kelas"];

// --- Filter & pagination (disimpan di URL agar bisa di-refresh/dibagikan)
const str = (v: unknown) => (typeof v === "string" ? v : "");
const filters = reactive({
    q: str(route.query.q),
    role: str(route.query.role) as TeacherRole | "",
    status: str(route.query.status) as "aktif" | "nonaktif" | "",
});
const currentPage = ref(Math.max(1, Number(route.query.page) || 1));
const pageSize = ref([10, 25, 50].includes(Number(route.query.size)) ? Number(route.query.size) : 10);

const searchInput = ref(filters.q);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchInput, (v) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => (filters.q = v.trim()), 300);
});

// Filter berubah -> kembali ke halaman 1
watch([() => filters.q, () => filters.role, () => filters.status, pageSize], () => {
    currentPage.value = 1;
});

const hasFilter = computed(() => !!(filters.q || filters.role || filters.status));
function resetFilters() {
    searchInput.value = "";
    Object.assign(filters, { q: "", role: "", status: "" });
}

const query = computed(() => ({
    page: currentPage.value,
    pageSize: pageSize.value,
    ...(filters.q && { q: filters.q }),
    ...(filters.role && { role: filters.role }),
    ...(filters.status && { status: filters.status }),
}));

watch(query, (q) => {
    router.replace({
        query: {
            ...(q.q && { q: q.q }),
            ...(q.role && { role: q.role }),
            ...(q.status && { status: q.status }),
            ...(q.page > 1 && { page: String(q.page) }),
            ...(q.pageSize !== 10 && { size: String(q.pageSize) }),
        },
    });
});

const { data, pending, error, refresh } = await useApiFetch("/api/teachers", { query });

const teachers = computed(() => (data.value?.teachers ?? []) as unknown as TeacherRow[]);
const pagination = computed(() => data.value?.pagination);
const columnCount = computed(() => (isSuperadmin.value ? 7 : 6));

const rangeText = computed(() => {
    const p = pagination.value;
    if (!p || !p.total) return "dari 0 guru";
    const from = (p.page - 1) * p.pageSize + 1;
    const to = Math.min(p.page * p.pageSize, p.total);
    return `${from}–${to} dari ${p.total} guru`;
});

// Kalau halaman sekarang jadi kosong (mis. setelah hapus), mundur satu halaman
watch(pagination, (p) => {
    if (p && currentPage.value > p.totalPages) currentPage.value = p.totalPages;
});

const summaryCards = computed(() => [
    {
        label: "Total guru",
        value: data.value?.summary.total ?? 0,
        iconClass: "bg-primary-50 text-primary-600",
        icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 11a4 4 0 100-8 4 4 0 000 8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"],
    },
    {
        label: "Akun aktif",
        value: data.value?.summary.aktif ?? 0,
        iconClass: "bg-green-50 text-green-600",
        icon: ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
    },
    {
        label: "Akun nonaktif",
        value: data.value?.summary.nonaktif ?? 0,
        iconClass: "bg-gray-100 text-gray-500",
        icon: ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M4.93 4.93l14.14 14.14"],
    },
]);

/** "Wali SD 3, SD 4" / "Belum ada kelas" (Modul 5) */
function labelWali(t: TeacherRow) {
    if (!t.waliKelas?.length) return "Belum ada kelas";
    return `Wali ${t.waliKelas.map((k) => formatKelas(k.jenjang, k.kelas).replace(" · Kelas ", " ")).join(", ")}`;
}

// --- Format tanggal
function formatDate(value: string) {
    return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(value: string) {
    return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
const relative = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
function formatRelative(value: string) {
    const diffSec = (new Date(value).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diffSec);
    if (abs < 60) return "baru saja";
    if (abs < 3600) return relative.format(Math.round(diffSec / 60), "minute");
    if (abs < 86400) return relative.format(Math.round(diffSec / 3600), "hour");
    if (abs < 86400 * 30) return relative.format(Math.round(diffSec / 86400), "day");
    return formatDate(value);
}

// --- Komponen kecil di halaman ini
const StatusBadge = defineComponent({
    props: { active: { type: Boolean, required: true } },
    setup: (props) => () =>
        h(
            "span",
            {
                class: [
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                    props.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500",
                ],
            },
            [
                h("span", { class: ["w-1.5 h-1.5 rounded-full", props.active ? "bg-green-500" : "bg-gray-400"] }),
                props.active ? "Aktif" : "Nonaktif",
            ],
        ),
});

const EmptyState = defineComponent({
    setup: () => () =>
        h("div", { class: "py-12 px-4 text-center" }, [
            h("p", { class: "text-sm font-medium text-gray-700" },
                hasFilter.value ? "Tidak ada guru yang cocok" : "Belum ada data guru"),
            h("p", { class: "text-xs text-gray-500 mt-1" },
                hasFilter.value
                    ? "Coba ubah kata kunci atau filter."
                    : isSuperadmin.value
                      ? "Klik \"Tambah Guru\" untuk membuat akun pertama."
                      : ""),
            hasFilter.value
                ? h("button", {
                      type: "button",
                      class: "mt-3 text-sm font-medium text-primary-600 hover:underline",
                      onClick: resetFilters,
                  }, "Reset filter")
                : null,
        ]),
});

// --- Tambah / edit
const formOpen = ref(false);
const editingTeacher = ref<TeacherRow | null>(null);

function openAdd() {
    editingTeacher.value = null;
    formOpen.value = true;
}

async function onSaved(message: string) {
    formOpen.value = false;
    toast.success("Berhasil", message);
    await refresh();
}

// --- Reset password
const resetTeacher = ref<TeacherRow | null>(null);
function onResetSaved(message: string) {
    resetTeacher.value = null;
    toast.success("Password direset", message);
}

// --- Foto
const photoInput = ref<HTMLInputElement | null>(null);
const photoTarget = ref<TeacherRow | null>(null);

async function onPhotoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ""; // agar file yang sama bisa dipilih lagi
    if (!file || !photoTarget.value) return;
    if (await photo.upload(photoTarget.value.uuid, file)) await refresh();
}

// --- Aksi menu
async function handleAction(action: TeacherAction, t: TeacherRow) {
    switch (action) {
        case "edit":
            editingTeacher.value = t;
            formOpen.value = true;
            break;
        case "reset":
            resetTeacher.value = t;
            break;
        case "toggle":
            await toggleActive(t);
            break;
        case "photo":
            photoTarget.value = t;
            photoInput.value?.click();
            break;
        case "removePhoto":
            if (
                await confirm({
                    title: "Hapus Foto",
                    message: `Hapus foto profil ${t.nama}? Inisial nama akan ditampilkan sebagai gantinya.`,
                    confirmText: "Ya, Hapus Foto",
                    danger: true,
                })
            ) {
                if (await photo.remove(t.uuid)) await refresh();
            }
            break;
        case "delete":
            await deleteTeacher(t);
            break;
    }
}

async function toggleActive(t: TeacherRow) {
    const activate = !t.isActive;
    const ok = await confirm({
        title: activate ? "Aktifkan Akun" : "Nonaktifkan Akun",
        message: activate
            ? `Aktifkan kembali akun ${t.nama}? Guru ini akan bisa login lagi.`
            : `Nonaktifkan akun ${t.nama}? Guru ini akan langsung keluar dari semua perangkat dan tidak bisa login sampai diaktifkan kembali.`,
        confirmText: activate ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
        danger: !activate,
    });
    if (!ok) return;
    try {
        await api(`/api/teachers/${t.uuid}`, {
            method: "PATCH",
            body: { nama: t.nama, email: t.email, noHp: t.noHp, role: t.role, isActive: activate },
        });
        toast.success(
            activate ? "Akun diaktifkan" : "Akun dinonaktifkan",
            activate ? `${t.nama} sudah bisa login kembali.` : `${t.nama} tidak dapat login lagi.`,
        );
        await refresh();
    } catch (err) {
        toast.error("Gagal mengubah status", getErrorMessage(err));
    }
}

async function deleteTeacher(t: TeacherRow) {
    const ok = await confirm({
        title: "Hapus Akun Guru",
        message: `Hapus akun ${t.nama} (${t.email})? Akun ini tidak bisa login lagi dan emailnya tidak dapat dipakai untuk akun baru. Riwayat aktivitasnya tetap tersimpan.`,
        confirmText: "Ya, Hapus Akun",
        danger: true,
    });
    if (!ok) return;
    try {
        const res = await api<{ message: string }>(`/api/teachers/${t.uuid}`, { method: "DELETE" });
        toast.success("Akun dihapus", res.message);
        await refresh();
    } catch (err) {
        toast.error("Gagal menghapus guru", getErrorMessage(err));
    }
}
</script>
