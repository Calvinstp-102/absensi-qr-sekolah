<template>
    <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-gray-600">
                Daftar hadir <strong>{{ data?.periode.label ?? "" }}</strong>
                <span v-if="data" class="text-gray-400">· {{ data.periode.hariEfektif ?? 0 }} hari efektif · {{ data.kelas.length }} kelas</span>
            </p>
            <LaporanExportMenu laporan="bulanan" :query="query" :disabled="!data?.kelas.length" />
        </div>

        <!-- Legenda -->
        <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <span v-for="k in LEGENDA" :key="k" class="flex items-center gap-1.5">
                <LaporanStatusBadge :kode="k" compact />
                {{ KODE_STATUS[k].label }}
            </span>
            <span class="flex items-center gap-1.5"><span class="w-6 h-6 rounded border border-gray-200 bg-white" />Tidak dihitung / belum terjadi</span>
        </div>

        <div v-if="error && !data" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center text-sm text-red-600">
            {{ getErrorMessage(error, "Gagal memuat laporan.") }}
        </div>
        <div v-else-if="pending && !data" class="h-64 rounded-xl bg-gray-100 animate-pulse" />
        <div v-else-if="!data?.kelas.length" class="bg-white rounded-xl border border-gray-100 shadow-md p-12 text-center text-sm text-gray-400">
            Tidak ada siswa pada filter ini.
        </div>

        <template v-else>
            <section
                v-for="k in data?.kelas ?? []"
                :key="k.kelasLabel"
                class="bg-white rounded-xl border border-gray-100 shadow-md"
                :class="{ 'opacity-60': pending }"
            >
                <div class="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800">{{ k.kelasLabel }}</h3>
                    <p class="text-xs text-gray-500">
                        {{ k.siswa.length }} siswa · rata-rata kehadiran
                        <span class="font-semibold" :class="k.total.persen !== null ? textColor(k.total.persen) : ''">{{ fmtPersen(k.total.persen) }}</span>
                    </p>
                </div>
                <div class="overflow-x-auto">
                    <table class="text-xs border-separate border-spacing-0">
                        <thead>
                            <tr class="text-gray-500">
                                <th class="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium min-w-[200px] border-b border-gray-100">Nama</th>
                                <th
                                    v-for="h in k.hari"
                                    :key="h.tanggal"
                                    class="px-0.5 py-1.5 text-center font-medium border-b border-gray-100 min-w-[28px]"
                                    :class="h.status === 'libur' ? 'bg-slate-100' : 'bg-gray-50'"
                                    :title="h.libur ? `${h.tanggal}: ${h.libur}` : h.tanggal"
                                >
                                    <div class="text-gray-700">{{ h.tgl }}</div>
                                    <div class="text-[10px] font-normal">{{ h.hari }}</div>
                                </th>
                                <th v-for="c in TOTAL" :key="c" class="bg-gray-50 px-1.5 py-2 text-center font-medium border-b border-gray-100" :title="KODE_STATUS[c].label">{{ c }}</th>
                                <th class="bg-gray-50 px-2 py-2 text-right font-medium border-b border-gray-100">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in k.siswa" :key="s.student.uuid" class="hover:bg-primary-50/40">
                                <td class="sticky left-0 z-10 bg-white px-3 py-1 border-b border-gray-50 whitespace-nowrap">
                                    <NuxtLink :to="`/siswa/${s.student.uuid}`" class="text-gray-800 hover:text-primary-600">{{ s.student.nama }}</NuxtLink>
                                </td>
                                <td v-for="(kd, i) in s.kode" :key="i" class="px-0.5 py-0.5 text-center border-b border-gray-50">
                                    <LaporanStatusBadge v-if="kd && kd !== '-'" :kode="kd" compact />
                                </td>
                                <td v-for="c in TOTAL" :key="c" class="px-1.5 py-1 text-center tabular-nums border-b border-gray-50" :class="s[c] ? 'text-gray-700' : 'text-gray-300'">{{ s[c] }}</td>
                                <td class="px-2 py-1 text-right tabular-nums font-semibold border-b border-gray-50" :class="s.persen !== null ? textColor(s.persen) : 'text-gray-300'">
                                    {{ fmtPersen(s.persen) }}
                                </td>
                            </tr>
                            <tr class="bg-gray-50 font-semibold text-gray-600">
                                <td class="sticky left-0 z-10 bg-gray-50 px-3 py-1.5">Jumlah hadir</td>
                                <td v-for="(p, i) in k.perTanggal" :key="i" class="text-center tabular-nums py-1.5">
                                    {{ k.hari[i]!.status === "efektif" ? p.hadir : "" }}
                                </td>
                                <td v-for="c in TOTAL" :key="c" class="text-center tabular-nums">{{ k.total[c] }}</td>
                                <td class="px-2 text-right">{{ fmtPersen(k.total.persen) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { KodeStatus } from "#shared/utils/attendance-status";

const props = defineProps<{ query: Record<string, string | undefined> }>();

const LEGENDA: KodeStatus[] = ["H", "T", "D", "S", "I", "A", "B", "L", "?"];
const TOTAL = ["H", "T", "D", "S", "I", "A"] as const;

const { data, pending, error } = useApiFetch("/api/reports/bulanan", { query: computed(() => props.query) });
</script>
