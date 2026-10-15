<template>
    <div>
        <!-- Header -->
        <div class="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">Data Siswa</h1>
                <p class="text-gray-500 text-sm mt-1">
                    {{
                        isAdmin
                            ? "Kelola data siswa, kelas, dan kartu QR absensi"
                            : "Daftar siswa (hanya Admin yang dapat mengubah data)"
                    }}
                </p>
            </div>
            <div v-if="isAdmin" class="flex items-center gap-2 flex-wrap">
                <button type="button" class="btn-secondary" @click="exportQr('filter')">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {{ hasFilter ? "Export QR (sesuai filter)" : "Export Semua QR" }}
                </button>
                <button type="button" class="btn-secondary" @click="promoteOpen = true">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    Naik Kelas
                </button>
                <button
                    type="button"
                    class="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm"
                    @click="openAdd"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Tambah Siswa
                </button>
            </div>
        </div>

        <!-- Ringkasan (klik = filter) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <button
                v-for="card in summaryCards"
                :key="card.label"
                type="button"
                class="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 text-left transition-shadow hover:shadow-md"
                :class="card.active ? 'border-primary-400 ring-1 ring-primary-400' : 'border-gray-100'"
                :title="card.hint"
                @click="card.apply"
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
            </button>
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
                        placeholder="Cari nama, NIS, atau NISN..."
                        aria-label="Cari siswa"
                        class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <select v-model="filters.jenjang" aria-label="Filter jenjang" class="filter-select" @change="filters.kelas = ''">
                    <option value="">Semua jenjang</option>
                    <option v-for="j in JENJANG_LIST" :key="j" :value="j">{{ j }}</option>
                </select>
                <select v-model="filters.kelas" aria-label="Filter kelas" class="filter-select" :disabled="!filters.jenjang">
                    <option value="">{{ filters.jenjang ? "Semua kelas" : "Kelas" }}</option>
                    <option v-for="k in kelasOptions" :key="k" :value="k">
                        {{ filters.jenjang === "TK" ? k : `Kelas ${k}` }}
                    </option>
                </select>
                <select v-model="filters.status" aria-label="Filter status" class="filter-select">
                    <option value="">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                </select>
                <select v-model="filters.qr" aria-label="Filter QR" class="filter-select">
                    <option value="">Semua QR</option>
                    <option value="ada">Sudah punya QR</option>
                    <option value="belum">Belum punya QR</option>
                </select>
                <button v-if="hasFilter" type="button" class="text-sm text-gray-500 hover:text-gray-800 px-2 py-2" @click="resetFilters">
                    Reset filter
                </button>
            </div>

            <!-- Bilah aksi siswa terpilih -->
            <div
                v-if="isAdmin && selectionCount"
                class="px-4 py-2.5 border-b border-primary-100 bg-primary-50 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
            >
                <span class="font-medium text-primary-800">{{ selectionCount }} siswa dipilih</span>
                <button
                    v-if="!selectAllMatching && allPageSelected && (pagination?.total ?? 0) > students.length"
                    type="button"
                    class="text-primary-700 underline hover:no-underline"
                    @click="selectAllMatching = true"
                >
                    Pilih semua {{ pagination?.total }} hasil filter
                </button>
                <div class="flex flex-wrap items-center gap-2 ml-auto">
                    <button type="button" class="btn-secondary !py-1.5" @click="generateBulk">Generate QR (yang belum punya)</button>
                    <button type="button" class="btn-secondary !py-1.5" @click="exportQr('selection')">Export QR terpilih</button>
                    <button type="button" class="text-gray-500 hover:text-gray-800 px-2" @click="clearSelection">Batal pilih</button>
                </div>
            </div>

            <!-- Error memuat -->
            <div v-if="error && !data" class="p-8 text-center">
                <p class="text-sm text-red-600 mb-3">{{ getErrorMessage(error, "Gagal memuat data siswa.") }}</p>
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
                                <th v-if="isAdmin" class="pl-4 py-3 w-8">
                                    <input
                                        type="checkbox"
                                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                                        aria-label="Pilih semua di halaman ini"
                                        :checked="allPageSelected"
                                        :indeterminate="somePageSelected"
                                        :disabled="!students.length"
                                        @change="togglePage"
                                    />
                                </th>
                                <th class="px-4 py-3 font-medium">Siswa</th>
                                <th class="px-4 py-3 font-medium">Kelas</th>
                                <th class="px-4 py-3 font-medium">Status</th>
                                <th class="px-4 py-3 font-medium">QR</th>
                                <th class="px-4 py-3 w-12"><span class="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody :class="{ 'opacity-60 transition-opacity': pending && data }">
                            <template v-if="pending && !data">
                                <tr v-for="i in 5" :key="i" class="border-t border-gray-100 animate-pulse">
                                    <td v-if="isAdmin" class="pl-4"></td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-full bg-gray-200"></div>
                                            <div class="space-y-1.5">
                                                <div class="h-3 w-36 bg-gray-200 rounded"></div>
                                                <div class="h-2.5 w-28 bg-gray-100 rounded"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td v-for="j in 4" :key="j" class="px-4 py-3">
                                        <div class="h-3 w-16 bg-gray-100 rounded"></div>
                                    </td>
                                </tr>
                            </template>
                            <tr v-else-if="!students.length">
                                <td :colspan="isAdmin ? 6 : 5" class="p-0">
                                    <EmptyState />
                                </td>
                            </tr>
                            <tr
                                v-for="s in students"
                                v-else
                                :key="s.id"
                                class="border-t border-gray-100 hover:bg-primary-50/40 transition-colors"
                                :class="{ 'bg-gray-50/70': s.status !== 'active', 'bg-primary-50/60': isSelected(s.id) }"
                            >
                                <td v-if="isAdmin" class="pl-4 py-3">
                                    <input
                                        type="checkbox"
                                        class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                                        :aria-label="`Pilih ${s.nama}`"
                                        :checked="isSelected(s.id)"
                                        @change="toggleRow(s.id)"
                                    />
                                </td>
                                <td class="px-4 py-3">
                                    <NuxtLink :to="`/siswa/${s.uuid}`" class="flex items-center gap-3 min-w-0 group">
                                        <UserAvatar
                                            :nama="s.nama"
                                            :uuid="s.uuid"
                                            :foto-path="s.fotoPath"
                                            kind="students"
                                            :class="{ 'grayscale opacity-70': s.status !== 'active' }"
                                        />
                                        <div class="min-w-0">
                                            <p class="font-medium text-gray-800 truncate group-hover:text-primary-700">{{ s.nama }}</p>
                                            <p class="text-xs text-gray-500 truncate">
                                                NISN {{ s.nisn || "–" }}<template v-if="s.nis"> · NIS {{ s.nis }}</template>
                                            </p>
                                        </div>
                                    </NuxtLink>
                                </td>
                                <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ formatKelas(s.jenjang, s.kelasSekarang) }}</td>
                                <td class="px-4 py-3">
                                    <StatusBadge :active="s.status === 'active'" :reason="s.statusReason ?? undefined" />
                                </td>
                                <td class="px-4 py-3">
                                    <QrBadge :has-qr="s.hasQr" />
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <BaseActionMenu
                                        v-if="isAdmin"
                                        :items="menuItems(s)"
                                        :label="`Aksi untuk ${s.nama}`"
                                        @select="(a) => handleAction(a, s)"
                                    />
                                    <NuxtLink v-else :to="`/siswa/${s.uuid}`" class="text-xs font-medium text-primary-600 hover:underline">
                                        Detail
                                    </NuxtLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Kartu (mobile) -->
                <div class="md:hidden divide-y divide-gray-100">
                    <div v-if="pending && !data" class="p-6 text-center text-sm text-gray-400">Memuat data siswa...</div>
                    <EmptyState v-else-if="!students.length" />
                    <div v-for="s in students" v-else :key="s.id" class="p-4 flex gap-3" :class="{ 'bg-primary-50/60': isSelected(s.id) }">
                        <input
                            v-if="isAdmin"
                            type="checkbox"
                            class="mt-3 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                            :aria-label="`Pilih ${s.nama}`"
                            :checked="isSelected(s.id)"
                            @change="toggleRow(s.id)"
                        />
                        <NuxtLink :to="`/siswa/${s.uuid}`" class="shrink-0">
                            <UserAvatar :nama="s.nama" :uuid="s.uuid" :foto-path="s.fotoPath" kind="students" :class="{ 'grayscale opacity-70': s.status !== 'active' }" />
                        </NuxtLink>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-start justify-between gap-2">
                                <NuxtLink :to="`/siswa/${s.uuid}`" class="min-w-0">
                                    <p class="font-medium text-gray-800 truncate">{{ s.nama }}</p>
                                    <p class="text-xs text-gray-500 truncate">
                                        {{ formatKelas(s.jenjang, s.kelasSekarang) }} · NISN {{ s.nisn || "–" }}
                                    </p>
                                </NuxtLink>
                                <BaseActionMenu
                                    v-if="isAdmin"
                                    :items="menuItems(s)"
                                    :label="`Aksi untuk ${s.nama}`"
                                    @select="(a) => handleAction(a, s)"
                                />
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 mt-2">
                                <StatusBadge :active="s.status === 'active'" :reason="s.statusReason ?? undefined" />
                                <QrBadge :has-qr="s.hasQr" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm flex-wrap gap-3">
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                        <span>Tampilkan</span>
                        <select v-model.number="pageSize" aria-label="Jumlah per halaman" class="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                            <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
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
                        <span class="text-xs text-gray-500 px-2">Hal {{ pagination.page }} / {{ pagination.totalPages }}</span>
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

        <template v-if="isAdmin">
            <SiswaFormModal :open="formOpen" :student="editingStudent" @close="formOpen = false" @saved="onSaved" />
            <SiswaPromoteModal :open="promoteOpen" @close="onPromoteClosed" />
            <BaseModal :open="!!bulkResult" title="Generate QR Massal" @close="bulkResult = null">
                <div v-if="bulkResult" class="space-y-4">
                    <div
                        class="rounded-lg px-4 py-3 text-sm"
                        :class="bulkResult.generated ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-50 border border-gray-200 text-gray-700'"
                    >
                        {{ bulkResult.message }}
                    </div>
                    <SiswaSkippedList :items="bulkResult.skipped" />
                    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button type="button" class="btn-secondary" @click="bulkResult = null">Tutup</button>
                        <button
                            v-if="bulkResult.generated"
                            type="button"
                            class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                            @click="exportBulkResult"
                        >
                            Export kartu QR
                        </button>
                    </div>
                </div>
            </BaseModal>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { ActionMenuItem } from "~/types/ui";
import type { Jenjang, SkippedStudent, StudentAction, StudentDetailResponse, StudentRow } from "~/types/student";

useHead({ title: "Data Siswa" });

const toast = useToast();
const api = useApi();
const { confirm } = useConfirm();
const { download } = useDownload();
const { isAdmin } = useAuth();
const route = useRoute();
const router = useRouter();

const PAGE_SIZES = [10, 25, 50, 100];

// --- Filter & pagination (disimpan di URL agar bisa di-refresh/dibagikan)
const str = (v: unknown) => (typeof v === "string" ? v : "");
const initialJenjang = JENJANG_LIST.includes(str(route.query.jenjang) as Jenjang) ? (str(route.query.jenjang) as Jenjang) : "";
const filters = reactive({
    q: str(route.query.q),
    jenjang: initialJenjang as Jenjang | "",
    kelas: initialJenjang && isValidKelas(initialJenjang, str(route.query.kelas)) ? str(route.query.kelas) : "",
    status: (["active", "inactive"].includes(str(route.query.status)) ? str(route.query.status) : "") as "active" | "inactive" | "",
    qr: (["ada", "belum"].includes(str(route.query.qr)) ? str(route.query.qr) : "") as "ada" | "belum" | "",
});
const currentPage = ref(Math.max(1, Number(route.query.page) || 1));
const pageSize = ref(PAGE_SIZES.includes(Number(route.query.size)) ? Number(route.query.size) : 10);

const kelasOptions = computed(() => (filters.jenjang ? KELAS_BY_JENJANG[filters.jenjang] : []));

const searchInput = ref(filters.q);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchInput, (v) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => (filters.q = v.trim()), 300);
});

// Filter berubah -> kembali ke halaman 1 & pilihan dikosongkan
watch([() => ({ ...filters }), pageSize], () => {
    currentPage.value = 1;
    clearSelection();
});

const hasFilter = computed(() => !!(filters.q || filters.jenjang || filters.status || filters.qr));
function resetFilters() {
    searchInput.value = "";
    Object.assign(filters, { q: "", jenjang: "", kelas: "", status: "", qr: "" });
}

/** Filter aktif tanpa nilai kosong (dipakai daftar, export, & generate massal). */
const activeFilter = computed(() =>
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>,
);

const query = computed(() => ({ ...activeFilter.value, page: currentPage.value, pageSize: pageSize.value }));

watch(query, (q) => {
    const { page, pageSize: size, ...rest } = q;
    router.replace({
        query: {
            ...rest,
            ...(page > 1 && { page: String(page) }),
            ...(size !== 10 && { size: String(size) }),
        },
    });
});

const { data, pending, error, refresh } = await useApiFetch("/api/students", { query });

const students = computed(() => (data.value?.students ?? []) as unknown as StudentRow[]);
const pagination = computed(() => data.value?.pagination);

const rangeText = computed(() => {
    const p = pagination.value;
    if (!p || !p.total) return "dari 0 siswa";
    const from = (p.page - 1) * p.pageSize + 1;
    const to = Math.min(p.page * p.pageSize, p.total);
    return `${from}–${to} dari ${p.total} siswa`;
});

// Kalau halaman sekarang jadi kosong (mis. setelah hapus), mundur satu halaman
watch(pagination, (p) => {
    if (p && currentPage.value > p.totalPages) currentPage.value = p.totalPages;
});

const summaryCards = computed(() => {
    const s = data.value?.summary;
    return [
        {
            label: "Total siswa",
            value: s?.total ?? 0,
            hint: "Tampilkan semua siswa",
            active: !filters.status && !filters.qr,
            apply: () => Object.assign(filters, { status: "", qr: "" }),
            iconClass: "bg-primary-50 text-primary-600",
            icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 11a4 4 0 100-8 4 4 0 000 8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"],
        },
        {
            label: "Aktif",
            value: s?.aktif ?? 0,
            hint: "Tampilkan siswa aktif",
            active: filters.status === "active" && !filters.qr,
            apply: () => Object.assign(filters, { status: "active", qr: "" }),
            iconClass: "bg-green-50 text-green-600",
            icon: ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
        },
        {
            label: "Nonaktif",
            value: s?.nonaktif ?? 0,
            hint: "Tampilkan siswa nonaktif (pindah, lulus, dll.)",
            active: filters.status === "inactive" && !filters.qr,
            apply: () => Object.assign(filters, { status: "inactive", qr: "" }),
            iconClass: "bg-gray-100 text-gray-500",
            icon: ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M4.93 4.93l14.14 14.14"],
        },
        {
            label: "Belum punya QR",
            value: s?.belumQr ?? 0,
            hint: "Tampilkan siswa yang belum punya QR",
            active: filters.qr === "belum",
            apply: () => Object.assign(filters, { qr: "belum", status: "" }),
            iconClass: "bg-amber-50 text-amber-600",
            icon: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h3v3h-3zM20 14v3M17 20h3"],
        },
    ];
});

// --- Pilih siswa (centang). Bisa juga "semua hasil filter" lintas halaman.
const selectedIds = ref(new Set<number>());
const selectAllMatching = ref(false);

const allPageSelected = computed(
    () => students.value.length > 0 && students.value.every((s) => isSelected(s.id)),
);
const somePageSelected = computed(
    () => !allPageSelected.value && students.value.some((s) => isSelected(s.id)),
);
const selectionCount = computed(() =>
    selectAllMatching.value ? (pagination.value?.total ?? 0) : selectedIds.value.size,
);

function isSelected(id: number) {
    return selectAllMatching.value || selectedIds.value.has(id);
}
function toggleRow(id: number) {
    if (selectAllMatching.value) {
        // Keluar dari mode "semua hasil filter" -> sisakan siswa di halaman ini
        selectAllMatching.value = false;
        selectedIds.value = new Set(students.value.map((s) => s.id));
    }
    const next = new Set(selectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds.value = next;
}
function togglePage() {
    const select = !allPageSelected.value;
    selectAllMatching.value = false;
    const next = new Set(selectedIds.value);
    for (const s of students.value) {
        if (select) next.add(s.id);
        else next.delete(s.id);
    }
    selectedIds.value = next;
}
function clearSelection() {
    selectedIds.value = new Set();
    selectAllMatching.value = false;
}

/** Pilihan untuk API: daftar id atau filter. */
const selection = computed(() =>
    selectAllMatching.value ? { filter: activeFilter.value } : { studentIds: [...selectedIds.value] },
);

// --- QR massal & export
const bulkResult = ref<{ generated: number; skipped: SkippedStudent[]; message: string; ids: number[] } | null>(null);

async function generateBulk() {
    const ok = await confirm({
        title: "Generate QR Massal",
        message: `Buat QR untuk ${selectionCount.value} siswa terpilih? Siswa yang sudah punya QR atau nonaktif akan dilewati (QR yang sudah ada tidak diganti).`,
        confirmText: "Ya, Generate",
    });
    if (!ok) return;
    // Simpan pilihan untuk tombol "Export kartu QR" di hasil (kosong = sesuai filter)
    const ids = selectAllMatching.value ? [] : [...selectedIds.value];
    try {
        const res = await api<{ generated: number; skipped: SkippedStudent[]; message: string }>(
            "/api/students/qr/generate-bulk",
            { method: "POST", body: selection.value },
        );
        bulkResult.value = { ...res, ids };
        if (res.generated) toast.success("QR dibuat", res.message);
        clearSelection();
        await refresh();
    } catch (err) {
        toast.error("Gagal generate QR", getErrorMessage(err));
    }
}

async function exportBulkResult() {
    const ids = bulkResult.value?.ids ?? [];
    bulkResult.value = null;
    await download("/api/students/export-qr", {
        query: ids.length ? { ids: ids.join(",") } : activeFilter.value,
        fallbackName: "kartu-qr-siswa.pdf",
        errorTitle: "Gagal export QR",
    });
}

async function exportQr(mode: "filter" | "selection") {
    const sel: { studentIds?: number[]; filter?: Record<string, string> } =
        mode === "selection" ? selection.value : { filter: activeFilter.value };
    const query = sel.studentIds ? { ids: sel.studentIds.join(",") } : sel.filter;
    const ok = await download("/api/students/export-qr", {
        query,
        fallbackName: "kartu-qr-siswa.pdf",
        errorTitle: "Gagal export QR",
    });
    if (ok) toast.success("Export selesai", "File PDF kartu QR sedang diunduh.");
}

// --- Komponen kecil di halaman ini
const StatusBadge = defineComponent({
    props: { active: { type: Boolean, required: true }, reason: { type: String, default: undefined } },
    setup: (props) => () =>
        h(
            "span",
            {
                class: [
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                    props.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500",
                ],
                title: !props.active && props.reason ? `Alasan: ${props.reason}` : undefined,
            },
            [
                h("span", { class: ["w-1.5 h-1.5 rounded-full", props.active ? "bg-green-500" : "bg-gray-400"] }),
                props.active ? "Aktif" : "Nonaktif",
            ],
        ),
});

const QrBadge = defineComponent({
    props: { hasQr: { type: Boolean, required: true } },
    setup: (props) => () =>
        h(
            "span",
            {
                class: [
                    "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                    props.hasQr ? "bg-primary-50 text-primary-700" : "bg-amber-50 text-amber-700",
                ],
            },
            props.hasQr ? "Ada QR" : "Belum ada",
        ),
});

const EmptyState = defineComponent({
    setup: () => () =>
        h("div", { class: "py-12 px-4 text-center" }, [
            h("p", { class: "text-sm font-medium text-gray-700" },
                hasFilter.value ? "Tidak ada siswa yang cocok" : "Belum ada data siswa"),
            h("p", { class: "text-xs text-gray-500 mt-1" },
                hasFilter.value
                    ? "Coba ubah kata kunci atau filter."
                    : isAdmin.value
                      ? "Klik \"Tambah Siswa\" untuk menambahkan siswa pertama."
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

// --- Menu aksi per siswa
const ICONS = {
    detail: ["M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z", "M12 15a3 3 0 100-6 3 3 0 000 6z"],
    edit: ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7", "M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
    qr: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h3v3h-3zM20 14v3M17 20h3"],
    delete: ["M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"],
};

function menuItems(s: StudentRow): ActionMenuItem<StudentAction>[] {
    return [
        { key: "detail", label: "Lihat detail", icon: ICONS.detail },
        { key: "edit", label: "Edit data", icon: ICONS.edit },
        {
            key: "qr",
            label: s.hasQr ? "Sudah punya QR" : "Generate QR",
            icon: ICONS.qr,
            disabledReason: s.hasQr
                ? "Ganti QR lewat halaman detail"
                : s.status !== "active"
                  ? "Siswa nonaktif tidak bisa dibuatkan QR"
                  : undefined,
        },
        { key: "delete", label: "Hapus siswa", icon: ICONS.delete, danger: true, divider: true },
    ];
}

async function handleAction(action: StudentAction, s: StudentRow) {
    switch (action) {
        case "detail":
            await navigateTo(`/siswa/${s.uuid}`);
            break;
        case "edit":
            await openEdit(s);
            break;
        case "qr":
            await generateOne(s);
            break;
        case "delete":
            await deleteStudent(s);
            break;
    }
}

// --- Tambah / edit
const formOpen = ref(false);
const editingStudent = ref<StudentDetailResponse["student"] | null>(null);

function openAdd() {
    editingStudent.value = null;
    formOpen.value = true;
}

async function openEdit(s: StudentRow) {
    try {
        // Daftar hanya memuat data ringkas -> ambil data lengkap untuk form
        const res = await api<StudentDetailResponse>(`/api/students/${s.uuid}`);
        editingStudent.value = res.student;
        formOpen.value = true;
    } catch (err) {
        toast.error("Gagal memuat data siswa", getErrorMessage(err));
    }
}

async function onSaved(message: string) {
    formOpen.value = false;
    toast.success("Berhasil", message);
    await refresh();
}

// --- Naik kelas
const promoteOpen = ref(false);
async function onPromoteClosed(changed: boolean) {
    promoteOpen.value = false;
    if (changed) await refresh();
}

async function generateOne(s: StudentRow) {
    try {
        const res = await api<{ message: string }>(`/api/students/${s.uuid}/regenerate-qr`, {
            method: "POST",
            body: {},
        });
        toast.success("QR dibuat", `${res.message} Kartu bisa diunduh di halaman detail ${s.nama}.`);
        await refresh();
    } catch (err) {
        toast.error("Gagal generate QR", getErrorMessage(err));
    }
}

async function deleteStudent(s: StudentRow) {
    const ok = await confirm({
        title: "Hapus Siswa",
        message: `Hapus data ${s.nama} (NISN ${s.nisn || "–"})? Siswa tidak tampil lagi dan QR-nya langsung tidak bisa dipakai absen. Riwayat absensi tetap tersimpan.`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;
    try {
        const res = await api<{ message: string }>(`/api/students/${s.uuid}`, { method: "DELETE" });
        toast.success("Siswa dihapus", res.message);
        selectedIds.value.delete(s.id);
        await refresh();
    } catch (err) {
        toast.error("Gagal menghapus siswa", getErrorMessage(err));
    }
}
</script>

<style scoped>
.filter-select {
    @apply border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50 disabled:text-gray-400;
}
.btn-secondary {
    @apply flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm;
}
</style>
