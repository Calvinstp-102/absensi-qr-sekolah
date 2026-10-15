<template>
    <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-medium"
                    :class="!jenis ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                    @click="jenis = ''"
                >
                    Semua
                </button>
                <button
                    v-for="j in data?.jenisList ?? []"
                    :key="j.value"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-medium"
                    :class="jenis === j.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
                    @click="jenis = j.value"
                >
                    {{ j.label }}
                    <span v-if="!jenis && data?.perJenis[j.value]" class="opacity-70">· {{ data.perJenis[j.value] }}</span>
                </button>
            </div>
            <LaporanExportMenu laporan="aktivitas" :query="filterQuery" :disabled="!data?.pagination.total" />
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-md">
            <div v-if="error && !data" class="p-8 text-center text-sm text-red-600">{{ getErrorMessage(error, "Gagal memuat laporan.") }}</div>
            <template v-else>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Waktu</th>
                                <th class="px-4 py-3 font-medium">Aktivitas</th>
                                <th class="px-4 py-3 font-medium">Siswa</th>
                                <th class="px-4 py-3 font-medium">Tgl absensi</th>
                                <th class="px-4 py-3 font-medium">Oleh</th>
                                <th class="px-4 py-3 font-medium">Alasan / catatan</th>
                            </tr>
                        </thead>
                        <tbody :class="{ 'opacity-60': pending && data }">
                            <template v-if="pending && !data">
                                <tr v-for="i in 5" :key="i" class="border-t border-gray-100">
                                    <td v-for="j in 6" :key="j" class="px-4 py-3"><div class="h-4 rounded bg-gray-100 animate-pulse" /></td>
                                </tr>
                            </template>
                            <tr v-else-if="!data?.data.length">
                                <td colspan="6" class="px-4 py-12 text-center text-gray-400">Tidak ada aktivitas pada periode ini.</td>
                            </tr>
                            <tr v-for="r in data?.data ?? []" :key="r.id" class="border-t border-gray-100 align-top">
                                <td class="px-4 py-2.5 whitespace-nowrap text-gray-600">{{ r.jam }}</td>
                                <td class="px-4 py-2.5 whitespace-nowrap">
                                    <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="WARNA[r.jenis] ?? 'bg-gray-100 text-gray-600'">{{ r.aksi }}</span>
                                </td>
                                <td class="px-4 py-2.5">
                                    <NuxtLink :to="`/siswa/${r.student.uuid}`" class="font-medium text-gray-800 hover:text-primary-600">{{ r.student.nama }}</NuxtLink>
                                    <p class="text-xs text-gray-400">{{ r.student.kelasLabel }}</p>
                                </td>
                                <td class="px-4 py-2.5 whitespace-nowrap text-gray-600">{{ tanggalSingkat(r.tanggalAbsensi) }}</td>
                                <td class="px-4 py-2.5 text-gray-600">{{ r.guru }}</td>
                                <td class="px-4 py-2.5 text-xs text-gray-500 max-w-[280px]">{{ r.alasan || "–" }}</td>
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
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ query: Record<string, string | undefined> }>();

const WARNA: Record<string, string> = {
    absen_manual: "bg-indigo-50 text-indigo-700",
    izin_pulang_awal: "bg-orange-50 text-orange-700",
    correct_attendance: "bg-teal-50 text-teal-700",
    keterangan_absensi: "bg-sky-50 text-sky-700",
    batal_absen_masuk: "bg-red-50 text-red-700",
    batal_absen_pulang: "bg-red-50 text-red-700",
};

const jenis = ref("");
const page = ref(1);
const filterQuery = computed(() => ({ ...props.query, jenis: jenis.value || undefined }));
watch(filterQuery, () => (page.value = 1), { deep: true });

const { data, pending, error } = useApiFetch("/api/reports/aktivitas", {
    query: computed(() => ({ ...filterQuery.value, page: page.value, pageSize: 25 })),
});
</script>
