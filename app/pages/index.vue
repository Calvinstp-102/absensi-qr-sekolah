<template>
    <div class="max-w-7xl">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">{{ sapaan }}, {{ user?.nama }}</h1>
                <p class="text-sm text-gray-500 mt-1">
                    {{ data?.hari.label ?? "" }}
                    <span v-if="data?.scope.wali && data.scope.kelas.length" class="ml-1">
                        · Kelas Anda:
                        <span class="font-medium text-gray-700">{{ data.scope.kelas.map((k) => k.label).join(", ") }}</span>
                    </span>
                </p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 hidden sm:inline">Diperbarui {{ updatedLabel }}</span>
                <button
                    type="button"
                    class="flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    @click="refresh()"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5" />
                    </svg>
                    Muat ulang
                </button>
                <NuxtLink
                    to="/laporan"
                    class="flex items-center gap-1.5 bg-primary-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-700 shadow-sm"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
                        <path d="M14 3v6h6M8 17v-3M12 17v-6M16 17v-2" />
                    </svg>
                    Laporan
                </NuxtLink>
            </div>
        </div>

        <div v-if="error && !data" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center">
            <p class="text-sm text-red-600 mb-3">{{ getErrorMessage(error, "Gagal memuat dashboard.") }}</p>
            <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="refresh()">Coba lagi</button>
        </div>

        <!-- Wali kelas belum ditugaskan -->
        <div v-else-if="data?.scope.belumDitugaskan" class="bg-white rounded-xl border border-gray-100 shadow-md p-10 text-center">
            <p class="font-medium text-gray-800">Anda belum ditugaskan sebagai wali kelas</p>
            <p class="text-sm text-gray-500 mt-1">Hubungi Admin agar kelas Anda diatur di menu Manajemen Guru.</p>
        </div>

        <template v-else-if="data">
            <!-- Status hari -->
            <div
                v-if="!data.hari.isSchoolDay"
                class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5"
            >
                <svg class="w-5 h-5 text-slate-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <div>
                    <p class="font-medium text-slate-700">{{ data.hari.alasan }}</p>
                    <p class="text-sm text-slate-500">Tidak ada absensi hari ini. Tren & rekap bulan ini tetap ditampilkan.</p>
                </div>
            </div>
            <div
                v-else-if="Object.keys(data.hari.liburJenjang).length"
                class="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 mb-5 text-sm text-violet-700"
            >
                <p v-for="a in Object.values(data.hari.liburJenjang)" :key="a" class="font-medium">{{ a }}</p>
            </div>

            <!-- KPI -->
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <div v-for="k in kpi" :key="k.label" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p class="text-xs font-medium text-gray-500">{{ k.label }}</p>
                    <p class="text-2xl font-heading font-bold mt-1" :class="k.color">{{ k.value }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ k.hint }}</p>
                    <div v-if="k.bar !== undefined" class="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                        <div class="h-full rounded-full bg-green-500 transition-all" :style="{ width: `${k.bar}%` }" />
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                <!-- Status hari ini -->
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h2 class="text-sm font-semibold text-gray-800">Status hari ini</h2>
                    <p class="text-xs text-gray-500 mb-3">
                        Terlambat setelah {{ data.jadwal.batasTelat }} · Tidak hadir setelah {{ data.jadwal.tidakHadir }} WIB
                    </p>
                    <div v-if="data.hariIni.total === 0" class="h-[230px] flex items-center justify-center text-sm text-gray-400">
                        Tidak ada siswa yang wajib hadir hari ini.
                    </div>
                    <ChartsBaseChart
                        v-else
                        type="doughnut"
                        :data="doughnutData"
                        :options="doughnutOptions"
                        height="230px"
                        label="Komposisi status kehadiran hari ini"
                    />
                </section>

                <!-- Per kelas -->
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4 xl:col-span-2">
                    <h2 class="text-sm font-semibold text-gray-800">Kehadiran per kelas hari ini</h2>
                    <p class="text-xs text-gray-500 mb-3">Jumlah siswa per status di setiap kelas</p>
                    <div v-if="!data.perKelas.length" class="h-[230px] flex items-center justify-center text-sm text-gray-400">
                        Belum ada data.
                    </div>
                    <ChartsBaseChart
                        v-else
                        type="bar"
                        :data="kelasData"
                        :options="stackedOptions"
                        height="230px"
                        label="Grafik batang kehadiran per kelas hari ini"
                    />
                </section>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                <!-- Tren -->
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4 xl:col-span-2">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <h2 class="text-sm font-semibold text-gray-800">Tren kehadiran</h2>
                            <p class="text-xs text-gray-500 mb-3">{{ data.tren.length }} hari efektif terakhir (% hadir dari siswa yang wajib hadir)</p>
                        </div>
                        <NuxtLink to="/laporan?tab=kelas" class="text-xs font-medium text-primary-600 hover:underline shrink-0">Detail</NuxtLink>
                    </div>
                    <div v-if="data.tren.length < 2" class="h-[220px] flex items-center justify-center text-sm text-gray-400">
                        Tren muncul setelah ada minimal 2 hari efektif.
                    </div>
                    <ChartsBaseChart
                        v-else
                        type="line"
                        :data="trenData"
                        :options="trenOptions"
                        height="220px"
                        label="Grafik garis persentase kehadiran harian"
                    />
                </section>

                <!-- Bulan ini -->
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h2 class="text-sm font-semibold text-gray-800">Bulan ini · {{ data.bulanIni.label }}</h2>
                    <div class="grid grid-cols-3 gap-2 mt-3">
                        <div v-for="b in bulanIni" :key="b.label" class="rounded-lg bg-gray-50 px-2.5 py-2">
                            <p class="text-[11px] text-gray-500">{{ b.label }}</p>
                            <p class="text-base font-heading font-bold" :class="b.color">{{ b.value }}</p>
                        </div>
                    </div>
                    <h3 class="text-xs font-semibold text-gray-600 mt-4 mb-2">Paling sering terlambat</h3>
                    <p v-if="!data.bulanIni.topTerlambat.length" class="text-sm text-gray-400">Belum ada yang terlambat. 👍</p>
                    <ul v-else class="space-y-1.5">
                        <li v-for="(s, i) in data.bulanIni.topTerlambat" :key="s.student.uuid" class="flex items-center gap-2 text-sm">
                            <span class="w-5 text-xs text-gray-400">{{ i + 1 }}.</span>
                            <NuxtLink :to="`/siswa/${s.student.uuid}`" class="flex-1 min-w-0 truncate text-gray-700 hover:text-primary-600">
                                {{ s.student.nama }}
                                <span class="text-xs text-gray-400">· {{ s.student.kelasLabel }}</span>
                            </NuxtLink>
                            <span class="text-xs font-medium text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">{{ s.jumlah }}×</span>
                        </li>
                    </ul>
                </section>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <!-- Belum / tidak hadir -->
                <section class="bg-white rounded-xl border border-gray-100 shadow-md xl:col-span-2">
                    <div class="flex items-center justify-between gap-2 p-4 pb-3 flex-wrap">
                        <div>
                            <h2 class="text-sm font-semibold text-gray-800">Belum / tidak hadir hari ini</h2>
                            <p class="text-xs text-gray-500">Beri keterangan Sakit/Izin bila ada kabar dari orang tua</p>
                        </div>
                        <div class="flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
                            <button
                                v-for="t in TIDAK_HADIR_TABS"
                                :key="t.value"
                                type="button"
                                class="px-2.5 py-1 rounded-md"
                                :class="tidakHadirTab === t.value ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'"
                                @click="tidakHadirTab = t.value"
                            >
                                {{ t.label }} · {{ jumlahTab(t.value) }}
                            </button>
                        </div>
                    </div>
                    <p v-if="!tidakHadirList.length" class="px-4 pb-8 pt-4 text-center text-sm text-gray-400">
                        {{ data.hariIni.total ? "Tidak ada siswa di daftar ini. 🎉" : "Tidak ada absensi hari ini." }}
                    </p>
                    <ul v-else class="divide-y divide-gray-100 border-t border-gray-100 max-h-[420px] overflow-y-auto">
                        <li v-for="t in tidakHadirList" :key="t.student.uuid" class="flex items-center gap-3 px-4 py-2.5">
                            <UserAvatar :nama="t.student.nama" :uuid="t.student.uuid" :foto-path="t.student.fotoPath" kind="students" size="sm" />
                            <div class="flex-1 min-w-0">
                                <NuxtLink :to="`/siswa/${t.student.uuid}`" class="block text-sm font-medium text-gray-800 truncate hover:text-primary-600">
                                    {{ t.student.nama }}
                                </NuxtLink>
                                <p class="text-xs text-gray-400 truncate">
                                    {{ t.student.kelasLabel }}
                                    <template v-if="t.alasan"> · {{ t.alasan }}</template>
                                    <template v-else-if="t.noHpOrtu"> · Ortu: {{ t.noHpOrtu }}</template>
                                </p>
                            </div>
                            <LaporanStatusBadge :kode="t.kode" />
                            <button
                                v-if="t.kode !== '?'"
                                type="button"
                                class="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                                @click="openKeterangan(t)"
                            >
                                {{ t.kode === "S" || t.kode === "I" ? "Ubah" : "Keterangan" }}
                            </button>
                        </li>
                    </ul>
                </section>

                <!-- Libur mendatang -->
                <section class="bg-white rounded-xl border border-gray-100 shadow-md p-4">
                    <h2 class="text-sm font-semibold text-gray-800">Libur 30 hari ke depan</h2>
                    <p v-if="!data.liburMendatang.length" class="text-sm text-gray-400 mt-3">Tidak ada libur terjadwal.</p>
                    <ul v-else class="mt-3 space-y-2.5">
                        <li v-for="h in data.liburMendatang" :key="h.uuid" class="flex items-start gap-3">
                            <div class="w-11 shrink-0 rounded-lg border border-primary-100 text-center py-0.5 text-primary-700">
                                <p class="text-[10px] uppercase leading-tight">{{ bulanPendek(h.tanggalMulai) }}</p>
                                <p class="text-base font-heading font-bold leading-tight">{{ Number(h.tanggalMulai.slice(8, 10)) }}</p>
                            </div>
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-gray-800">{{ h.keterangan }}</p>
                                <p class="text-xs text-gray-500">
                                    {{ h.rentang }} · {{ h.jenjang ? `Hanya ${h.jenjang.join(", ")}` : "Semua jenjang" }}
                                </p>
                            </div>
                        </li>
                    </ul>
                </section>
            </div>
        </template>

        <!-- Skeleton -->
        <div v-else class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div v-for="i in 5" :key="i" class="h-24 rounded-xl bg-gray-100 animate-pulse" />
        </div>

        <AbsensiKeteranganModal :open="!!keterangan" :target="keterangan" @close="keterangan = null" @saved="onKeteranganSaved" />
    </div>
</template>

<script setup lang="ts">
import type { KodeStatus } from "#shared/utils/attendance-status";
import type { KeteranganTarget } from "~/types/report";

useHead({ title: "Dashboard" });

const { user } = useUserSession();
const toast = useToast();
const apiSilent = useApi({ silent: true });

const { data, error, refresh } = await useApiFetch("/api/reports/dashboard");
type Dashboard = NonNullable<typeof data.value>;

// Diperbarui otomatis tiap 60 detik tanpa layar redup
const updatedAt = ref(Date.now());
watch(data, () => (updatedAt.value = Date.now()));
const updatedLabel = ref("baru saja");
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
    timer = setInterval(async () => {
        const menit = Math.floor((Date.now() - updatedAt.value) / 60_000);
        updatedLabel.value = menit < 1 ? "baru saja" : `${menit} menit lalu`;
        if (Date.now() - updatedAt.value >= 60_000 && document.visibilityState === "visible") {
            try {
                data.value = await apiSilent<Dashboard>("/api/reports/dashboard");
                updatedLabel.value = "baru saja";
            } catch {
                // Gagal sementara: coba lagi di putaran berikutnya
            }
        }
    }, 15_000);
});
onBeforeUnmount(() => clearInterval(timer));

const sapaan = computed(() => {
    const jam = Number(new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 13));
    return jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
});

const angka = (n: number) => n.toLocaleString("id-ID");
const persen = (v: number | null) => (v === null ? "–" : `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);

const kpi = computed(() => {
    const h = data.value!.hariIni;
    return [
        { label: "Wajib hadir hari ini", value: angka(h.total), hint: h.libur ? `${h.libur} siswa libur` : "siswa aktif", color: "text-gray-800" },
        { label: "Sudah hadir", value: angka(h.hadir), hint: `${persen(h.persen)} dari wajib hadir`, color: "text-green-600", bar: h.persen ?? 0 },
        { label: "Terlambat", value: angka(h.T + h.D), hint: h.D ? `${h.D} dimaklumi` : "termasuk hadir", color: "text-amber-600" },
        {
            label: data.value!.jadwal.sudahLewatBatasTidakHadir ? "Alpa" : "Belum hadir",
            value: angka(h.B + h.A + h.tidakTercatat),
            hint: data.value!.jadwal.sudahLewatBatasTidakHadir ? "tanpa keterangan" : `batas ${data.value!.jadwal.tidakHadir} WIB`,
            color: "text-red-600",
        },
        { label: "Sakit / Izin", value: `${h.S} / ${h.I}`, hint: "dengan keterangan", color: "text-sky-600" },
    ];
});

// --- Grafik
const KODE_GRAFIK: KodeStatus[] = ["H", "T", "D", "S", "I", "A", "B"];

const doughnutData = computed(() => {
    const h = data.value!.hariIni;
    const kodes = KODE_GRAFIK.filter((k) => h[k as keyof typeof h] as number);
    return {
        labels: kodes.map((k) => KODE_STATUS[k].label),
        datasets: [
            {
                data: kodes.map((k) => h[k as keyof typeof h] as number),
                backgroundColor: kodes.map((k) => KODE_STATUS[k].chart),
                borderWidth: 2,
                borderColor: "#fff",
            },
        ],
    };
});
const doughnutOptions = { cutout: "62%", plugins: { legend: { position: "right" as const } } };

const kelasData = computed(() => {
    const rows = data.value!.perKelas;
    const series: { label: string; kodes: KodeStatus[]; color: string }[] = [
        { label: "Hadir", kodes: ["H", "D"], color: KODE_STATUS.H.chart },
        { label: "Terlambat", kodes: ["T"], color: KODE_STATUS.T.chart },
        { label: "Sakit/Izin", kodes: ["S", "I"], color: KODE_STATUS.S.chart },
        { label: "Alpa", kodes: ["A"], color: KODE_STATUS.A.chart },
        { label: "Belum hadir", kodes: ["B"], color: KODE_STATUS.B.chart },
    ];
    return {
        labels: rows.map((r) => r.kelasLabel.replace(" · Kelas ", " ")),
        datasets: series.map((s) => ({
            label: s.label,
            data: rows.map((r) => s.kodes.reduce((n, k) => n + (r[k as keyof typeof r] as number), 0)),
            backgroundColor: s.color,
            borderRadius: 3,
            maxBarThickness: 36,
        })),
    };
});
const stackedOptions = {
    scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
};

const trenData = computed(() => {
    const t = data.value!.tren;
    return {
        labels: t.map((d) => `${Number(d.tanggal.slice(8, 10))}/${Number(d.tanggal.slice(5, 7))}`),
        datasets: [
            {
                label: "% Kehadiran",
                data: t.map((d) => d.persen),
                borderColor: "#1E3A5F",
                backgroundColor: "rgba(30, 58, 95, 0.08)",
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5,
            },
        ],
    };
});
const trenOptions = {
    scales: {
        y: { min: 0, max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
        x: { grid: { display: false } },
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx: { dataIndex: number }) => {
                    const d = data.value!.tren[ctx.dataIndex]!;
                    return [`Kehadiran ${persen(d.persen)} (${d.hadir}/${d.pembagi})`, `Terlambat ${d.T} · Sakit ${d.S} · Izin ${d.I} · Alpa ${d.A}`];
                },
            },
        },
    },
};

const bulanIni = computed(() => {
    const r = data.value!.bulanIni.ringkasan;
    return [
        { label: "Kehadiran", value: persen(r.persen), color: "text-green-600" },
        { label: "Terlambat", value: angka(r.T + r.D), color: "text-amber-600" },
        { label: "Alpa", value: angka(r.A), color: "text-red-600" },
        { label: "Sakit", value: angka(r.S), color: "text-sky-600" },
        { label: "Izin", value: angka(r.I), color: "text-violet-600" },
        { label: "Pulang awal", value: angka(r.pulangAwal), color: "text-orange-600" },
    ];
});

// --- Belum / tidak hadir
const TIDAK_HADIR_TABS = [
    { value: "belum" as const, label: "Tanpa keterangan" },
    { value: "keterangan" as const, label: "Sakit/Izin" },
];
const tidakHadirTab = ref<"belum" | "keterangan">("belum");
const isKet = (k: KodeStatus) => k === "S" || k === "I";
const jumlahTab = (tab: "belum" | "keterangan") =>
    data.value!.tidakHadir.filter((t) => (tab === "keterangan" ? isKet(t.kode) : !isKet(t.kode))).length;
const tidakHadirList = computed(() =>
    data.value!.tidakHadir.filter((t) => (tidakHadirTab.value === "keterangan" ? isKet(t.kode) : !isKet(t.kode))),
);

const keterangan = ref<KeteranganTarget | null>(null);
function openKeterangan(t: Dashboard["tidakHadir"][number]) {
    keterangan.value = {
        studentUuid: t.student.uuid,
        nama: t.student.nama,
        kelasLabel: t.student.kelasLabel,
        tanggal: data.value!.hari.tanggal,
        kode: t.kode,
    };
}
async function onKeteranganSaved(message: string) {
    keterangan.value = null;
    toast.success("Tersimpan", message);
    await refresh();
}

function bulanPendek(tanggal: string) {
    return new Date(`${tanggal}T00:00:00Z`).toLocaleDateString("id-ID", { timeZone: "UTC", month: "short" });
}
</script>
