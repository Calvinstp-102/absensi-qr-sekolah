<template>
    <div class="space-y-4">
        <LaporanSummaryCards v-if="data" :items="ringkasan" />

        <div class="flex flex-wrap items-center justify-between gap-3">
            <select v-model="sort" aria-label="Urutan" class="border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm">
                <option value="kelas">Urut kelas & nama</option>
                <option value="nama">Urut nama</option>
                <option value="persen_asc">Kehadiran terendah</option>
                <option value="persen_desc">Kehadiran tertinggi</option>
                <option value="alpa">Alpa terbanyak</option>
                <option value="terlambat">Terlambat terbanyak</option>
            </select>
            <LaporanExportMenu laporan="siswa" :query="{ ...query, sort }" :disabled="!rows.length" />
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-md">
            <div v-if="error && !data" class="p-8 text-center text-sm text-red-600">{{ getErrorMessage(error, "Gagal memuat laporan.") }}</div>
            <div v-else class="overflow-auto max-h-[640px]">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 sticky top-0 z-10">
                        <tr>
                            <th class="px-3 py-3 font-medium text-left w-10">No</th>
                            <th class="px-3 py-3 font-medium text-left">Siswa</th>
                            <th class="px-3 py-3 font-medium text-right" title="Hari efektif">Efektif</th>
                            <th v-for="k in KOLOM" :key="k" class="px-2 py-3 font-medium text-center" :title="KODE_STATUS[k].label">{{ k }}</th>
                            <th class="px-3 py-3 font-medium text-right" title="Total menit terlambat">Mnt telat</th>
                            <th class="px-3 py-3 font-medium text-right" title="Pulang awal">Pulang awal</th>
                            <th class="px-3 py-3 font-medium text-left w-44">Kehadiran</th>
                        </tr>
                    </thead>
                    <tbody :class="{ 'opacity-60': pending && data }">
                        <template v-if="pending && !data">
                            <tr v-for="i in 8" :key="i" class="border-t border-gray-100">
                                <td v-for="j in 12" :key="j" class="px-3 py-3"><div class="h-4 rounded bg-gray-100 animate-pulse" /></td>
                            </tr>
                        </template>
                        <tr v-else-if="!rows.length">
                            <td colspan="12" class="px-4 py-12 text-center text-gray-400">Tidak ada siswa pada filter ini.</td>
                        </tr>
                        <tr v-for="(r, i) in rows" :key="r.student.uuid" class="border-t border-gray-100 hover:bg-gray-50/60">
                            <td class="px-3 py-2 text-gray-400">{{ i + 1 }}</td>
                            <td class="px-3 py-2">
                                <NuxtLink :to="`/siswa/${r.student.uuid}`" class="font-medium text-gray-800 hover:text-primary-600">{{ r.student.nama }}</NuxtLink>
                                <span v-if="!r.student.aktif" class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Nonaktif</span>
                                <p class="text-xs text-gray-400">{{ r.student.kelasLabel }}</p>
                            </td>
                            <td class="px-3 py-2 text-right tabular-nums text-gray-600">{{ r.efektif }}</td>
                            <td v-for="k in KOLOM" :key="k" class="px-2 py-2 text-center tabular-nums">
                                <span :class="r[k] ? KODE_STATUS[k].badge + ' rounded px-1.5 py-0.5 font-semibold' : 'text-gray-300'">{{ r[k] }}</span>
                            </td>
                            <td class="px-3 py-2 text-right tabular-nums text-gray-600">{{ r.menitTerlambat || "–" }}</td>
                            <td class="px-3 py-2 text-right tabular-nums text-gray-600">{{ r.pulangAwal || "–" }}</td>
                            <td class="px-3 py-2">
                                <div v-if="r.persen !== null" class="flex items-center gap-2">
                                    <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                        <div class="h-full rounded-full" :class="barColor(r.persen)" :style="{ width: `${r.persen}%` }" />
                                    </div>
                                    <span class="w-12 text-right text-xs font-semibold tabular-nums" :class="textColor(r.persen)">{{ fmtPersen(r.persen) }}</span>
                                </div>
                                <span v-else class="text-xs text-gray-300">Belum ada data</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <p class="text-xs text-gray-400">
            H Hadir · T Terlambat · D Dimaklumi · S Sakit · I Izin · A Alpa. Kelas = kelas siswa saat ini.
        </p>
    </div>
</template>

<script setup lang="ts">
import type { KodeStatus } from "#shared/utils/attendance-status";

const props = defineProps<{ query: Record<string, string | undefined> }>();

const KOLOM = ["H", "T", "D", "S", "I", "A"] as const satisfies readonly KodeStatus[];
const sort = ref("kelas");

const { data, pending, error } = useApiFetch("/api/reports/siswa", {
    query: computed(() => ({ ...props.query, sort: sort.value })),
});
const rows = computed(() => data.value?.data ?? []);

const ringkasan = computed(() => {
    const r = data.value!.ringkasan;
    return [
        { label: "Jumlah siswa", value: r.siswa.toLocaleString("id-ID") },
        { label: "Hari efektif", value: `${data.value!.periode.hariEfektif ?? 0} hari` },
        { label: "Rata-rata kehadiran", value: fmtPersen(r.persen), color: "text-green-600" },
        { label: "Terlambat", value: (r.T + r.D).toLocaleString("id-ID"), hint: `${r.menitTerlambat.toLocaleString("id-ID")} menit total`, color: "text-amber-600" },
        { label: "Sakit / Izin", value: `${r.S} / ${r.I}`, color: "text-sky-600" },
        { label: "Alpa", value: r.A.toLocaleString("id-ID"), color: "text-red-600" },
    ];
});
</script>
