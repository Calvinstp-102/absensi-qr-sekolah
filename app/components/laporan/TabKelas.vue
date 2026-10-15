<template>
    <div class="space-y-4">
        <LaporanSummaryCards v-if="data" :items="ringkasan" />

        <div class="flex justify-end">
            <LaporanExportMenu laporan="kelas" :query="query" :disabled="!kelas.length" />
        </div>

        <div v-if="error && !data" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center text-sm text-red-600">
            {{ getErrorMessage(error, "Gagal memuat laporan.") }}
        </div>
        <template v-else-if="data">
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h3 class="text-sm font-semibold text-gray-800">% Kehadiran per kelas</h3>
                    <p class="text-xs text-gray-500 mb-3">Garis putus = rata-rata semua kelas ({{ fmtPersen(data.ringkasan.persen) }})</p>
                    <p v-if="!kelas.length" class="h-[260px] flex items-center justify-center text-sm text-gray-400">Belum ada data.</p>
                    <ChartsBaseChart v-else type="bar" :data="kelasChart" :options="kelasOptions" height="260px" label="Grafik persentase kehadiran per kelas" />
                </section>
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h3 class="text-sm font-semibold text-gray-800">Tren harian</h3>
                    <p class="text-xs text-gray-500 mb-3">% kehadiran dan jumlah tidak hadir per hari efektif</p>
                    <p v-if="tren.length < 2" class="h-[260px] flex items-center justify-center text-sm text-gray-400">
                        Tren muncul setelah ada minimal 2 hari efektif.
                    </p>
                    <ChartsBaseChart v-else type="bar" :data="trenChart" :options="trenOptions" height="260px" label="Grafik tren kehadiran harian" />
                </section>
            </div>

            <div class="bg-white rounded-xl border border-gray-100 shadow-md overflow-x-auto">
                <table class="w-full text-sm" :class="{ 'opacity-60': pending }">
                    <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th class="px-4 py-3 font-medium text-left">Kelas</th>
                            <th class="px-3 py-3 font-medium text-right">Siswa</th>
                            <th class="px-3 py-3 font-medium text-right" title="Jumlah hari efektif seluruh siswa">Hari-siswa</th>
                            <th v-for="k in KOLOM" :key="k" class="px-2 py-3 font-medium text-center" :title="KODE_STATUS[k].label">{{ k }}</th>
                            <th class="px-4 py-3 font-medium text-left w-48">Kehadiran</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="!kelas.length">
                            <td colspan="10" class="px-4 py-12 text-center text-gray-400">Tidak ada kelas pada filter ini.</td>
                        </tr>
                        <tr v-for="k in kelas" :key="k.kelasLabel" class="border-t border-gray-100">
                            <td class="px-4 py-2.5 font-medium text-gray-800">{{ k.kelasLabel }}</td>
                            <td class="px-3 py-2.5 text-right tabular-nums">{{ k.siswa }}</td>
                            <td class="px-3 py-2.5 text-right tabular-nums text-gray-500">{{ k.efektif.toLocaleString("id-ID") }}</td>
                            <td v-for="c in KOLOM" :key="c" class="px-2 py-2.5 text-center tabular-nums" :class="k[c] ? 'text-gray-700' : 'text-gray-300'">
                                {{ k[c].toLocaleString("id-ID") }}
                            </td>
                            <td class="px-4 py-2.5">
                                <div v-if="k.persen !== null" class="flex items-center gap-2">
                                    <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                        <div class="h-full rounded-full" :class="barColor(k.persen)" :style="{ width: `${k.persen}%` }" />
                                    </div>
                                    <span class="w-12 text-right text-xs font-semibold tabular-nums" :class="textColor(k.persen)">{{ fmtPersen(k.persen) }}</span>
                                </div>
                                <span v-else class="text-xs text-gray-300">–</span>
                            </td>
                        </tr>
                        <tr v-if="kelas.length > 1" class="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                            <td class="px-4 py-2.5">Total</td>
                            <td class="px-3 py-2.5 text-right tabular-nums">{{ data.ringkasan.siswa }}</td>
                            <td class="px-3 py-2.5 text-right tabular-nums">{{ data.ringkasan.efektif.toLocaleString("id-ID") }}</td>
                            <td v-for="c in KOLOM" :key="c" class="px-2 py-2.5 text-center tabular-nums">{{ data.ringkasan[c].toLocaleString("id-ID") }}</td>
                            <td class="px-4 py-2.5 text-xs">{{ fmtPersen(data.ringkasan.persen) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ query: Record<string, string | undefined> }>();

const KOLOM = ["H", "T", "D", "S", "I", "A"] as const;

const { data, pending, error } = useApiFetch("/api/reports/kelas", { query: computed(() => props.query) });
const kelas = computed(() => data.value?.data ?? []);
const tren = computed(() => (data.value?.tren ?? []).filter((d) => d.pembagi > 0));

const ringkasan = computed(() => {
    const r = data.value!.ringkasan;
    return [
        { label: "Jumlah kelas", value: String(kelas.value.length) },
        { label: "Jumlah siswa", value: r.siswa.toLocaleString("id-ID") },
        { label: "Hari efektif", value: `${data.value!.periode.hariEfektif ?? 0} hari` },
        { label: "Rata-rata kehadiran", value: fmtPersen(r.persen), color: "text-green-600" },
    ];
});

const kelasChart = computed(() => ({
    labels: kelas.value.map((k) => k.kelasLabel.replace(" · Kelas ", " ")),
    datasets: [
        {
            type: "bar" as const,
            label: "% Kehadiran",
            data: kelas.value.map((k) => k.persen),
            backgroundColor: kelas.value.map((k) => (k.persen === null ? "#e5e7eb" : k.persen >= 90 ? "#22c55e" : k.persen >= 80 ? "#fbbf24" : "#ef4444")),
            borderRadius: 4,
            maxBarThickness: 40,
        },
        {
            type: "line" as const,
            label: "Rata-rata",
            data: kelas.value.map(() => data.value!.ringkasan.persen),
            borderColor: "#1E3A5F",
            borderDash: [5, 4],
            borderWidth: 1.5,
            pointRadius: 0,
        },
    ],
}));
const kelasOptions = {
    scales: { y: { min: 0, max: 100, ticks: { callback: (v: string | number) => `${v}%` } }, x: { grid: { display: false } } },
    plugins: { legend: { display: false } },
};

const trenChart = computed(() => ({
    labels: tren.value.map((d) => `${Number(d.tanggal.slice(8, 10))}/${Number(d.tanggal.slice(5, 7))}`),
    datasets: [
        {
            type: "line" as const,
            label: "% Kehadiran",
            data: tren.value.map((d) => d.persen),
            borderColor: "#1E3A5F",
            backgroundColor: "rgba(30, 58, 95, 0.08)",
            fill: true,
            tension: 0.3,
            yAxisID: "y",
            pointRadius: 2,
        },
        {
            type: "bar" as const,
            label: "Tidak hadir (S+I+A)",
            data: tren.value.map((d) => d.S + d.I + d.A),
            backgroundColor: "rgba(220, 38, 38, 0.35)",
            yAxisID: "y1",
            maxBarThickness: 14,
        },
    ],
}));
const trenOptions = {
    scales: {
        y: { min: 0, max: 100, position: "left" as const, ticks: { callback: (v: string | number) => `${v}%` } },
        y1: { beginAtZero: true, position: "right" as const, grid: { display: false }, ticks: { precision: 0 } },
        x: { grid: { display: false } },
    },
};
</script>
