<template>
    <div class="max-w-7xl">
        <div class="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">Laporan</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Rekap kehadiran, daftar hadir bulanan, keterlambatan, dan aktivitas absensi. Semua laporan bisa diunduh ke Excel & PDF.
                    <template v-if="scope?.wali && scope.kelas.length">
                        Kelas Anda: <span class="font-medium text-gray-700">{{ scope.kelas.map((k) => k.label).join(", ") }}</span>
                    </template>
                </p>
            </div>
        </div>

        <div v-if="scopeError && !scope" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center text-sm text-red-600">
            {{ getErrorMessage(scopeError, "Gagal memuat laporan.") }}
        </div>
        <div v-else-if="scope?.belumDitugaskan" class="bg-white rounded-xl border border-gray-100 shadow-md p-10 text-center">
            <p class="font-medium text-gray-800">Anda belum ditugaskan sebagai wali kelas</p>
            <p class="text-sm text-gray-500 mt-1">Hubungi Admin agar kelas Anda diatur di menu Manajemen Guru.</p>
        </div>

        <template v-else-if="scope">
            <!-- Tab -->
            <div class="border-b border-gray-200 mb-4 overflow-x-auto">
                <nav class="flex gap-1 min-w-max" aria-label="Jenis laporan">
                    <button
                        v-for="t in TABS"
                        :key="t.key"
                        type="button"
                        class="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
                        :class="tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        :aria-current="tab === t.key ? 'page' : undefined"
                        @click="tab = t.key"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path v-for="d in t.icon" :key="d" :d="d" />
                        </svg>
                        {{ t.label }}
                    </button>
                </nav>
            </div>
            <p class="text-xs text-gray-500 mb-3">{{ TABS.find((t) => t.key === tab)?.desc }}</p>

            <div class="mb-4">
                <LaporanFilterBar v-model="state" :mode="tab === 'bulanan' ? 'bulan' : 'periode'" :scope="scope" />
            </div>

            <LaporanTabHarian v-if="tab === 'harian'" :query="baseQuery" />
            <LaporanTabSiswa v-else-if="tab === 'siswa'" :query="baseQuery" />
            <LaporanTabKelas v-else-if="tab === 'kelas'" :query="baseQuery" />
            <LaporanTabBulanan v-else-if="tab === 'bulanan'" :query="bulananQuery" />
            <LaporanTabKeterlambatan v-else-if="tab === 'keterlambatan'" :query="baseQuery" />
            <LaporanTabPerhatian v-else-if="tab === 'perhatian'" :query="baseQuery" />
            <LaporanTabAktivitas v-else-if="tab === 'aktivitas'" :query="baseQuery" />
        </template>
    </div>
</template>

<script setup lang="ts">
import type { LaporanState } from "~/types/report";

useHead({ title: "Laporan" });

const route = useRoute();
const router = useRouter();

const { data: scope, error: scopeError } = await useApiFetch("/api/reports/scope");

const TABS = [
    { key: "siswa", label: "Rekap Siswa", desc: "Jumlah hadir, terlambat, sakit, izin, alpa, dan % kehadiran setiap siswa.", icon: ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"] },
    { key: "kelas", label: "Rekap Kelas", desc: "Perbandingan kehadiran antar kelas dan tren harian.", icon: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"] },
    { key: "bulanan", label: "Daftar Hadir Bulanan", desc: "Buku absen: siswa × tanggal dalam satu bulan, siap dicetak per kelas.", icon: ["M3 4h18v18H3z", "M16 2v4M8 2v4M3 10h18", "M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"] },
    { key: "harian", label: "Harian", desc: "Setiap catatan absensi: jam masuk/pulang, cara absen, pencatat, dan keterangan.", icon: ["M8 6h13M8 12h13M8 18h13", "M3 6h.01M3 12h.01M3 18h.01"] },
    { key: "keterlambatan", label: "Keterlambatan", desc: "Siswa paling sering terlambat, hari & lama keterlambatan.", icon: ["M12 22a10 10 0 100-20 10 10 0 000 20z", "M12 6v6l4 2"] },
    { key: "perhatian", label: "Perlu Perhatian", desc: "Siswa dengan kehadiran rendah, sering alpa, atau sering terlambat — untuk ditindaklanjuti.", icon: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"] },
    { key: "aktivitas", label: "Aktivitas", desc: "Absen manual, izin pulang awal, dimaklumi, keterangan sakit/izin, dan pembatalan — siapa & kapan.", icon: ["M22 12h-4l-3 9L9 3l-3 9H2"] },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// --- State dari URL (refresh/bagikan link tetap sama)
const q = (k: string) => (typeof route.query[k] === "string" ? (route.query[k] as string) : "");
const today = scope.value?.today ?? new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const presetList = buatPresetPeriode(today, scope.value?.tahunAjaran ?? null);

function periodeAwal(): Pick<LaporanState, "preset" | "from" | "to"> {
    const preset = q("preset");
    const p = presetList.find((x) => x.key === preset);
    if (p) return { preset: p.key, from: p.from, to: p.to };
    const valid = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && t <= today;
    if (preset === "kustom" && valid(q("from")) && valid(q("to")) && q("from") <= q("to")) {
        return { preset: "kustom", from: q("from"), to: q("to") };
    }
    const bulanIni = presetList.find((x) => x.key === "bulan_ini")!;
    return { preset: bulanIni.key, from: bulanIni.from, to: bulanIni.to };
}

const tab = ref<TabKey>(TABS.some((t) => t.key === q("tab")) ? (q("tab") as TabKey) : "siswa");
const state = ref<LaporanState>({
    ...periodeAwal(),
    bulan: /^\d{4}-\d{2}$/.test(q("bulan")) && q("bulan") <= today.slice(0, 7) ? q("bulan") : today.slice(0, 7),
    jenjang: q("jenjang"),
    kelas: q("kelas"),
    q: q("q"),
    statusSiswa: q("statusSiswa") === "semua" ? "semua" : "aktif",
});

watch(
    [tab, state],
    () => {
        const s = state.value;
        router.replace({
            query: {
                tab: tab.value,
                preset: s.preset,
                ...(s.preset === "kustom" && { from: s.from, to: s.to }),
                ...(tab.value === "bulanan" && { bulan: s.bulan }),
                ...(s.jenjang && { jenjang: s.jenjang }),
                ...(s.kelas && { kelas: s.kelas }),
                ...(s.q && { q: s.q }),
                ...(s.statusSiswa === "semua" && { statusSiswa: "semua" }),
            },
        });
    },
    { deep: true },
);

const filterUmum = computed(() => ({
    jenjang: state.value.jenjang || undefined,
    kelas: state.value.kelas || undefined,
    q: state.value.q || undefined,
    statusSiswa: state.value.statusSiswa,
}));
const baseQuery = computed(() => ({ from: state.value.from, to: state.value.to, ...filterUmum.value }));
const bulananQuery = computed(() => ({ bulan: state.value.bulan, ...filterUmum.value }));
</script>
