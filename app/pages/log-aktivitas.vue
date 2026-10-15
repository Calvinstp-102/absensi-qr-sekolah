<template>
    <div class="max-w-7xl">
        <div class="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">Log Aktivitas</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Jejak setiap perubahan data dan aktivitas login. Klik baris untuk melihat rincian sebelum & sesudah.
                </p>
            </div>
            <LaporanExportMenu
                endpoint="/api/audit-logs/export"
                nama-file="log-aktivitas"
                :query="filterQuery"
                :disabled="!data?.pagination.total"
            />
        </div>

        <!-- Ringkasan -->
        <div v-if="data" class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:col-span-2">
                <div class="flex items-baseline justify-between gap-2">
                    <p class="text-xs font-medium text-gray-500">Aktivitas · {{ data.periode.label }}</p>
                    <p class="text-2xl font-heading font-bold text-gray-800">{{ data.ringkasan.total.toLocaleString("id-ID") }}</p>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-3">
                    <button
                        v-for="k in KATEGORI_LIST"
                        :key="k"
                        type="button"
                        class="px-2.5 py-1 rounded-full text-xs font-medium transition-shadow"
                        :class="[KATEGORI_AUDIT[k].badge, state.kategori === k ? 'ring-2 ring-offset-1 ring-primary-400' : 'hover:ring-1 hover:ring-gray-300']"
                        :title="`Tampilkan hanya ${KATEGORI_AUDIT[k].label}`"
                        @click="setKategori(state.kategori === k ? '' : k)"
                    >
                        {{ KATEGORI_AUDIT[k].label }} · {{ (data.ringkasan.perKategori[k] ?? 0).toLocaleString("id-ID") }}
                    </button>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p class="text-xs font-medium text-gray-500 mb-2">Paling aktif</p>
                <p v-if="!data.ringkasan.guruTeraktif.length" class="text-sm text-gray-400">–</p>
                <ul v-else class="space-y-1">
                    <li v-for="g in data.ringkasan.guruTeraktif" :key="g.uuid" class="flex items-center justify-between gap-2 text-sm">
                        <button type="button" class="truncate text-left text-gray-700 hover:text-primary-600" @click="state.guru = g.uuid">
                            {{ g.nama }}
                        </button>
                        <span class="text-xs text-gray-400 tabular-nums">{{ g.jumlah }}</span>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Filter -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
            <LaporanPeriodPicker
                v-if="filters"
                :model-value="{ preset: state.preset, from: state.from, to: state.to }"
                :today="filters.today"
                :tahun-ajaran="null"
                @update:model-value="(p) => Object.assign(state, p)"
            />
            <select :value="state.kategori" aria-label="Kategori" class="filter-select" @change="(e) => setKategori((e.target as HTMLSelectElement).value)">
                <option value="">Semua kategori</option>
                <option v-for="k in filters?.kategori ?? []" :key="k.value" :value="k.value">{{ k.label }}</option>
            </select>
            <select v-model="state.aksi" aria-label="Aktivitas" class="filter-select" :disabled="!aksiOptions.length">
                <option value="">Semua aktivitas</option>
                <option v-for="a in aksiOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
            <select v-model="state.guru" aria-label="Guru" class="filter-select max-w-[200px]">
                <option value="">Semua guru</option>
                <option v-for="g in filters?.guru ?? []" :key="g.uuid" :value="g.uuid">{{ g.nama }}{{ g.deleted ? " (dihapus)" : "" }}</option>
            </select>
            <div class="relative flex-1 min-w-[180px] max-w-xs">
                <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    v-model="cari"
                    type="search"
                    placeholder="Cari nama siswa/guru atau alasan"
                    aria-label="Cari aktivitas"
                    class="w-full border border-gray-300 bg-white rounded-lg pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
            </div>
            <button v-if="adaFilter" type="button" class="text-sm text-gray-500 hover:text-gray-800 px-2 py-2" @click="resetFilter">Reset filter</button>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-md">
            <div v-if="error && !data" class="p-8 text-center">
                <p class="text-sm text-red-600 mb-3">{{ getErrorMessage(error, "Gagal memuat log aktivitas.") }}</p>
                <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="refresh()">Coba lagi</button>
            </div>
            <template v-else>
                <!-- Tabel (desktop) -->
                <div class="hidden md:block overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Waktu</th>
                                <th class="px-4 py-3 font-medium">Oleh</th>
                                <th class="px-4 py-3 font-medium">Aktivitas</th>
                                <th class="px-4 py-3 font-medium">Data</th>
                                <th class="px-4 py-3 font-medium">Perubahan / Alasan</th>
                            </tr>
                        </thead>
                        <tbody :class="{ 'opacity-60': pending && data }">
                            <template v-if="pending && !data">
                                <tr v-for="i in 8" :key="i" class="border-t border-gray-100">
                                    <td v-for="j in 5" :key="j" class="px-4 py-3"><div class="h-4 rounded bg-gray-100 animate-pulse" /></td>
                                </tr>
                            </template>
                            <tr v-else-if="!rows.length">
                                <td colspan="5" class="px-4 py-14 text-center">
                                    <p class="text-gray-600 font-medium">Tidak ada aktivitas</p>
                                    <p class="text-xs text-gray-400 mt-1">Ubah periode atau filter untuk melihat aktivitas lain.</p>
                                </td>
                            </tr>
                            <tr
                                v-for="l in rows"
                                :key="l.id"
                                class="border-t border-gray-100 hover:bg-primary-50/40 cursor-pointer align-top"
                                tabindex="0"
                                @click="detail = l"
                                @keydown.enter="detail = l"
                            >
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <p class="text-gray-700">{{ formatTanggalWaktu(l.waktu) }}</p>
                                    <p class="text-xs text-gray-400">{{ relatif(l.waktu) }}</p>
                                </td>
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2">
                                        <UserAvatar :nama="l.guru.nama" :uuid="l.guru.uuid" :foto-path="l.guru.fotoPath" size="sm" />
                                        <div class="min-w-0">
                                            <p class="font-medium text-gray-800 truncate max-w-[160px]">{{ l.guru.nama }}</p>
                                            <p class="text-xs text-gray-400">{{ ROLE_LABELS[l.guru.role] }}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="badgeAksi(l)">{{ l.label }}</span>
                                </td>
                                <td class="px-4 py-3">
                                    <template v-if="l.target">
                                        <p class="text-gray-800">{{ l.target.label }}</p>
                                        <p v-if="l.target.sub" class="text-xs text-gray-400">{{ l.target.sub }}</p>
                                    </template>
                                    <span v-else class="text-gray-300">–</span>
                                </td>
                                <td class="px-4 py-3 text-xs text-gray-600 max-w-[340px]">
                                    <p v-if="l.ringkasan" class="line-clamp-2">{{ l.ringkasan }}</p>
                                    <p v-if="l.alasan" class="text-gray-500 line-clamp-2" :class="{ 'mt-0.5': l.ringkasan }">
                                        <span class="text-gray-400">Alasan:</span> {{ l.alasan }}
                                    </p>
                                    <p v-if="l.akun" class="text-gray-400">{{ [l.akun.perangkat, l.akun.ip].filter(Boolean).join(" · ") }}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Kartu (mobile) -->
                <ul class="md:hidden divide-y divide-gray-100" :class="{ 'opacity-60': pending && data }">
                    <li v-if="!rows.length && !pending" class="px-4 py-12 text-center text-sm text-gray-400">Tidak ada aktivitas</li>
                    <li v-for="l in rows" :key="l.id">
                        <button type="button" class="w-full text-left px-4 py-3" @click="detail = l">
                            <div class="flex items-center justify-between gap-2">
                                <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="badgeAksi(l)">{{ l.label }}</span>
                                <span class="text-xs text-gray-400">{{ relatif(l.waktu) }}</span>
                            </div>
                            <p class="text-sm text-gray-800 mt-1.5">
                                <span class="font-medium">{{ l.guru.nama }}</span>
                                <template v-if="l.target"> · {{ l.target.label }}</template>
                            </p>
                            <p v-if="l.ringkasan || l.alasan" class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ l.ringkasan || l.alasan }}</p>
                        </button>
                    </li>
                </ul>

                <div v-if="data" class="flex items-center justify-between gap-3 flex-wrap border-t border-gray-100 px-4 py-2">
                    <label class="flex items-center gap-2 text-xs text-gray-500">
                        Tampilkan
                        <select v-model.number="pageSize" class="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                            <option :value="25">25</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                        per halaman
                    </label>
                    <LaporanPagination
                        v-model:page="page"
                        class="!border-t-0 !px-0"
                        :page-size="data.pagination.pageSize"
                        :total="data.pagination.total"
                        :total-pages="data.pagination.totalPages"
                    />
                </div>
            </template>
        </div>

        <LogDetailModal :log="detail" @close="detail = null" />
    </div>
</template>

<script setup lang="ts">
import type { KategoriAudit } from "#shared/utils/audit-labels";
import type { AuditRow } from "~/types/audit";

definePageMeta({ roles: ["superadmin", "admin"] });
useHead({ title: "Log Aktivitas" });

const route = useRoute();
const router = useRouter();

const { data: filters } = await useApiFetch("/api/audit-logs/filters");

const KATEGORI_LIST = Object.keys(KATEGORI_AUDIT) as KategoriAudit[];

// --- State (tersimpan di URL)
const q = (k: string) => (typeof route.query[k] === "string" ? (route.query[k] as string) : "");
const today = filters.value?.today ?? new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const presets = buatPresetPeriode(today, null);

function periodeAwal() {
    const p = presets.find((x) => x.key === (q("preset") || "30_hari"));
    if (p) return { preset: p.key, from: p.from, to: p.to };
    const valid = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && t <= today;
    if (q("preset") === "kustom" && valid(q("from")) && valid(q("to")) && q("from") <= q("to")) {
        return { preset: "kustom", from: q("from"), to: q("to") };
    }
    const d = presets.find((x) => x.key === "30_hari")!;
    return { preset: d.key, from: d.from, to: d.to };
}

const state = reactive({
    ...periodeAwal(),
    kategori: KATEGORI_LIST.includes(q("kategori") as KategoriAudit) ? q("kategori") : "",
    aksi: q("aksi") in AKSI_AUDIT ? q("aksi") : "",
    guru: q("guru"),
    q: q("q"),
});
const page = ref(1);
const pageSize = ref(25);

const aksiOptions = computed(() =>
    state.kategori ? aksiPerKategori(state.kategori as KategoriAudit) : [],
);
function setKategori(k: string) {
    state.kategori = k;
    if (state.aksi && AKSI_AUDIT[state.aksi]?.kategori !== k) state.aksi = "";
}

const filterQuery = computed(() => ({
    from: state.from,
    to: state.to,
    kategori: state.kategori || undefined,
    aksi: state.aksi || undefined,
    guru: state.guru || undefined,
    q: state.q || undefined,
}));
const adaFilter = computed(() => !!(state.kategori || state.aksi || state.guru || state.q));

function resetFilter() {
    Object.assign(state, { kategori: "", aksi: "", guru: "", q: "" });
    cari.value = "";
}

watch(
    [filterQuery, pageSize],
    () => {
        page.value = 1;
        router.replace({
            query: {
                preset: state.preset,
                ...(state.preset === "kustom" && { from: state.from, to: state.to }),
                ...(state.kategori && { kategori: state.kategori }),
                ...(state.aksi && { aksi: state.aksi }),
                ...(state.guru && { guru: state.guru }),
                ...(state.q && { q: state.q }),
            },
        });
    },
    { deep: true },
);

// Pencarian: kirim setelah berhenti mengetik
const cari = ref(state.q);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(cari, (v) => {
    clearTimeout(timer);
    timer = setTimeout(() => (state.q = v.trim()), 350);
});
onBeforeUnmount(() => clearTimeout(timer));

const { data, pending, error, refresh } = await useApiFetch("/api/audit-logs", {
    query: computed(() => ({ ...filterQuery.value, page: page.value, pageSize: pageSize.value })),
});
const rows = computed(() => (data.value?.data ?? []) as unknown as AuditRow[]);

const detail = ref<AuditRow | null>(null);

function badgeAksi(l: AuditRow) {
    return l.tone === "bahaya" ? "bg-red-100 text-red-700" : KATEGORI_AUDIT[l.kategori].badge;
}

function relatif(waktu: string) {
    const menit = Math.floor((Date.now() - new Date(waktu).getTime()) / 60_000);
    if (menit < 1) return "baru saja";
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    const hari = Math.floor(jam / 24);
    return hari < 30 ? `${hari} hari lalu` : `${Math.floor(hari / 30)} bulan lalu`;
}
</script>

<style scoped>
.filter-select {
    @apply border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50 disabled:text-gray-400;
}
</style>
