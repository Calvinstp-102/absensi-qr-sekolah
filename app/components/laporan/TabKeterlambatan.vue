<template>
    <div class="space-y-4">
        <LaporanSummaryCards v-if="data" :items="ringkasan" />

        <div class="flex justify-end">
            <LaporanExportMenu laporan="keterlambatan" :query="query" :disabled="!data?.siswa.length" />
        </div>

        <div v-if="error && !data" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center text-sm text-red-600">
            {{ getErrorMessage(error, "Gagal memuat laporan.") }}
        </div>
        <template v-else-if="data">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h3 class="text-sm font-semibold text-gray-800">Terlambat per hari</h3>
                    <p class="text-xs text-gray-500 mb-3">Hari apa yang paling sering terlambat</p>
                    <ChartsBaseChart type="bar" :data="perHariChart" :options="countOptions" height="220px" label="Grafik keterlambatan per hari" />
                </section>
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h3 class="text-sm font-semibold text-gray-800">Lama keterlambatan</h3>
                    <p class="text-xs text-gray-500 mb-3">Sebaran menit terlambat dari jam masuk</p>
                    <ChartsBaseChart type="bar" :data="bucketChart" :options="countOptions" height="220px" label="Grafik sebaran lama keterlambatan" />
                </section>
            </div>

            <div class="bg-white rounded-xl border border-gray-100 shadow-md">
                <div class="px-4 py-3 border-b border-gray-100">
                    <h3 class="text-sm font-semibold text-gray-800">Siswa paling sering terlambat</h3>
                </div>
                <div class="overflow-auto max-h-[560px]">
                    <table class="w-full text-sm" :class="{ 'opacity-60': pending }">
                        <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 sticky top-0">
                            <tr>
                                <th class="px-4 py-3 font-medium text-left w-10">#</th>
                                <th class="px-4 py-3 font-medium text-left">Siswa</th>
                                <th class="px-3 py-3 font-medium text-right">Jumlah</th>
                                <th class="px-3 py-3 font-medium text-right">Dimaklumi</th>
                                <th class="px-3 py-3 font-medium text-right">Total menit</th>
                                <th class="px-3 py-3 font-medium text-right">Rata-rata</th>
                                <th class="px-3 py-3 font-medium text-right">Terlama</th>
                                <th class="px-4 py-3 font-medium text-left">Terakhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!data.siswa.length">
                                <td colspan="8" class="px-4 py-12 text-center text-gray-400">Tidak ada siswa yang terlambat pada periode ini. 👍</td>
                            </tr>
                            <tr v-for="(s, i) in data.siswa" :key="s.student.uuid" class="border-t border-gray-100 hover:bg-gray-50/60">
                                <td class="px-4 py-2 text-gray-400">{{ i + 1 }}</td>
                                <td class="px-4 py-2">
                                    <NuxtLink :to="`/siswa/${s.student.uuid}`" class="font-medium text-gray-800 hover:text-primary-600">{{ s.student.nama }}</NuxtLink>
                                    <p class="text-xs text-gray-400">{{ s.student.kelasLabel }}</p>
                                </td>
                                <td class="px-3 py-2 text-right">
                                    <span class="font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 tabular-nums">{{ s.jumlah }}×</span>
                                </td>
                                <td class="px-3 py-2 text-right tabular-nums" :class="s.dimaklumi ? 'text-teal-700' : 'text-gray-300'">{{ s.dimaklumi }}</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ s.totalMenit }}</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ s.rataMenit }} mnt</td>
                                <td class="px-3 py-2 text-right tabular-nums">{{ s.maksMenit }} mnt</td>
                                <td class="px-4 py-2 text-gray-500">{{ s.terakhir ? tanggalSingkat(s.terakhir) : "–" }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
        <div v-else class="h-64 rounded-xl bg-gray-100 animate-pulse" />
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ query: Record<string, string | undefined> }>();

const { data, pending, error } = useApiFetch("/api/reports/keterlambatan", { query: computed(() => props.query) });

const ringkasan = computed(() => {
    const r = data.value!.ringkasan;
    return [
        { label: "Kejadian terlambat", value: r.kejadian.toLocaleString("id-ID"), color: "text-amber-600" },
        { label: "Siswa pernah terlambat", value: `${r.siswaTerlambat} / ${r.totalSiswa}` },
        { label: "Rata-rata terlambat", value: `${r.rataMenit} menit` },
        { label: "Dimaklumi", value: r.dimaklumi.toLocaleString("id-ID"), color: "text-teal-600" },
    ];
});

const perHariChart = computed(() => ({
    labels: data.value!.perHari.map((h) => h.hari),
    datasets: [{ label: "Kejadian", data: data.value!.perHari.map((h) => h.jumlah), backgroundColor: KODE_STATUS.T.chart, borderRadius: 4, maxBarThickness: 44 }],
}));
const bucketChart = computed(() => ({
    labels: data.value!.bucket.map((b) => b.label),
    datasets: [{ label: "Kejadian", data: data.value!.bucket.map((b) => b.jumlah), backgroundColor: "#fb923c", borderRadius: 4, maxBarThickness: 44 }],
}));
const countOptions = {
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
    plugins: { legend: { display: false } },
};
</script>
