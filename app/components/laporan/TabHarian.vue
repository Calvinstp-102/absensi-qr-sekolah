<template>
    <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-1.5">
                <button
                    v-for="s in STATUS_FILTER"
                    :key="s.value"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    :class="status === s.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                    @click="status = s.value"
                >
                    {{ s.label }}
                </button>
                <select v-model="metode" aria-label="Filter metode" class="ml-1 border border-gray-300 bg-white rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                    <option value="">Semua cara absen</option>
                    <option value="manual">Absen manual</option>
                    <option value="pulang_awal">Pulang awal</option>
                    <option value="keterangan">Ada keterangan/koreksi</option>
                </select>
                <select v-model="sort" aria-label="Urutan" class="border border-gray-300 bg-white rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                    <option value="tanggal_desc">Tanggal terbaru</option>
                    <option value="tanggal_asc">Tanggal terlama</option>
                    <option value="kelas">Kelas</option>
                    <option value="nama">Nama</option>
                    <option value="jam_masuk">Jam masuk</option>
                </select>
            </div>
            <LaporanExportMenu laporan="harian" :query="exportQuery" :disabled="!data?.pagination.total" />
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-md">
            <div v-if="error && !data" class="p-8 text-center text-sm text-red-600">{{ getErrorMessage(error, "Gagal memuat laporan.") }}</div>
            <template v-else>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Tanggal</th>
                                <th class="px-4 py-3 font-medium">Siswa</th>
                                <th class="px-4 py-3 font-medium">Status</th>
                                <th class="px-4 py-3 font-medium">Masuk</th>
                                <th class="px-4 py-3 font-medium">Pulang</th>
                                <th class="px-4 py-3 font-medium">Keterangan</th>
                                <th class="px-4 py-3 w-24"><span class="sr-only">Aksi</span></th>
                            </tr>
                        </thead>
                        <tbody :class="{ 'opacity-60': pending && data }">
                            <template v-if="pending && !data">
                                <tr v-for="i in 6" :key="i" class="border-t border-gray-100">
                                    <td v-for="j in 7" :key="j" class="px-4 py-3"><div class="h-4 rounded bg-gray-100 animate-pulse" /></td>
                                </tr>
                            </template>
                            <tr v-else-if="!rows.length">
                                <td colspan="7" class="px-4 py-12 text-center text-gray-400">Tidak ada data absensi pada filter ini.</td>
                            </tr>
                            <tr v-for="r in rows" :key="r.id" class="border-t border-gray-100 hover:bg-gray-50/60 align-top">
                                <td class="px-4 py-2.5 whitespace-nowrap">
                                    <p class="text-gray-700">{{ tanggalSingkat(r.tanggal) }}</p>
                                    <p class="text-xs text-gray-400">{{ namaHari(r.tanggal) }}</p>
                                </td>
                                <td class="px-4 py-2.5">
                                    <NuxtLink :to="`/siswa/${r.student.uuid}`" class="font-medium text-gray-800 hover:text-primary-600">{{ r.student.nama }}</NuxtLink>
                                    <p class="text-xs text-gray-400">{{ r.student.kelasLabel }}<template v-if="r.student.nisn"> · {{ r.student.nisn }}</template></p>
                                </td>
                                <td class="px-4 py-2.5 whitespace-nowrap">
                                    <LaporanStatusBadge :kode="r.kode" :menit="r.menitTerlambat" />
                                    <p v-if="r.hariLibur" class="text-[11px] text-gray-400 mt-1">Hari libur: {{ r.hariLibur }}</p>
                                </td>
                                <td class="px-4 py-2.5 whitespace-nowrap">
                                    <template v-if="r.masuk">
                                        <span class="text-gray-700">{{ r.masuk.jam }}</span>
                                        <span v-if="r.masuk.metode === 'manual'" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">Manual</span>
                                        <p v-if="r.masuk.oleh" class="text-xs text-gray-400">{{ r.masuk.oleh }}</p>
                                    </template>
                                    <span v-else class="text-gray-300">–</span>
                                </td>
                                <td class="px-4 py-2.5 whitespace-nowrap">
                                    <template v-if="r.pulang">
                                        <span class="text-gray-700">{{ r.pulang.jam }}</span>
                                        <span v-if="r.pulang.awal" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">Pulang awal</span>
                                        <span v-else-if="r.pulang.metode === 'manual'" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">Manual</span>
                                    </template>
                                    <span v-else class="text-gray-300">–</span>
                                </td>
                                <td class="px-4 py-2.5 text-xs text-gray-500 max-w-[260px]">
                                    <p v-if="r.keterangan?.alasan">{{ r.keterangan.alasan }}<span v-if="r.keterangan.oleh" class="text-gray-400"> — {{ r.keterangan.oleh }}</span></p>
                                    <p v-if="r.masuk?.catatan">Masuk: {{ r.masuk.catatan }}</p>
                                    <p v-if="r.pulang?.catatan">Pulang: {{ r.pulang.catatan }}</p>
                                </td>
                                <td class="px-4 py-2.5 text-right">
                                    <button
                                        v-if="['A', 'B', 'S', 'I'].includes(r.kode) && !r.hariLibur && r.student.aktif"
                                        type="button"
                                        class="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        @click="openKeterangan(r)"
                                    >
                                        {{ r.kode === "S" || r.kode === "I" ? "Ubah" : "Keterangan" }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <LaporanPagination
                    v-if="data"
                    v-model:page="page"
                    :page-size="data.pagination.pageSize"
                    :total="data.pagination.total"
                    :total-pages="data.pagination.totalPages"
                />
            </template>
        </div>

        <AbsensiKeteranganModal :open="!!keterangan" :target="keterangan" @close="keterangan = null" @saved="onSaved" />
    </div>
</template>

<script setup lang="ts">
import type { KeteranganTarget } from "~/types/report";

const props = defineProps<{ query: Record<string, string | undefined> }>();

const toast = useToast();
const STATUS_FILTER = [
    { value: "", label: "Semua" },
    ...KODE_FILTER.map((k) => ({ value: k, label: KODE_STATUS[k].label })),
];

const status = ref("");
const metode = ref("");
const sort = ref("tanggal_desc");
const page = ref(1);

const filterQuery = computed(() => ({
    ...props.query,
    status: status.value || undefined,
    metode: metode.value || undefined,
    sort: sort.value,
}));
watch(filterQuery, () => (page.value = 1), { deep: true });

const { data, pending, error, refresh } = useApiFetch("/api/reports/harian", {
    query: computed(() => ({ ...filterQuery.value, page: page.value, pageSize: 25 })),
});
type Row = NonNullable<typeof data.value>["data"][number];
const rows = computed(() => data.value?.data ?? []);
const exportQuery = computed(() => filterQuery.value);

function namaHari(t: string) {
    return new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", { timeZone: "UTC", weekday: "long" });
}

const keterangan = ref<KeteranganTarget | null>(null);
function openKeterangan(r: Row) {
    keterangan.value = {
        studentUuid: r.student.uuid,
        nama: r.student.nama,
        kelasLabel: r.student.kelasLabel,
        tanggal: r.tanggal,
        kode: r.kode,
    };
}
async function onSaved(message: string) {
    keterangan.value = null;
    toast.success("Tersimpan", message);
    await refresh();
}
</script>
