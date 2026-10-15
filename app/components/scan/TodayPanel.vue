<template>
    <div class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden">
        <!-- Judul + jenjang -->
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
            <div>
                <p class="font-heading font-bold text-gray-800">Kehadiran Hari Ini</p>
                <p class="text-xs text-gray-400">
                    <span class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1" :class="error ? 'bg-red-500' : 'bg-green-500 animate-pulse'"></span>
                    {{ error ? "Gagal memperbarui, mencoba lagi…" : `Diperbarui otomatis · ${updatedLabel}` }}
                </p>
            </div>
            <div class="flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
                <button
                    v-for="t in JENJANG_TABS"
                    :key="t.value"
                    type="button"
                    class="px-3 py-1.5 rounded-md"
                    :class="jenjang === t.value ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'"
                    @click="jenjang = t.value"
                >
                    {{ t.label }}
                    <span v-if="tabLibur(t.value)" class="text-violet-600">· Libur</span>
                </button>
            </div>
        </div>

        <!-- Ringkasan -->
        <div v-if="!data" class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
            <div v-for="i in 4" :key="i" class="h-20 rounded-lg bg-gray-100 animate-pulse"></div>
        </div>
        <div v-else class="p-4">
            <p
                v-if="summary.libur"
                class="mb-3 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-sm text-violet-700"
            >
                {{ summary.libur }} Siswa jenjang ini tidak perlu absen.
            </p>
            <div class="mb-3">
                <div class="flex items-end justify-between mb-1">
                    <p class="text-sm text-gray-600">
                        <b class="text-2xl font-heading text-gray-800 tabular-nums">{{ summary.sudahMasuk }}</b>
                        / {{ summary.totalSiswa }} siswa sudah masuk
                    </p>
                    <p class="text-sm font-bold text-primary-600 tabular-nums">{{ pct(summary.sudahMasuk) }}%</p>
                </div>
                <div class="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                    <div class="bg-green-500" :style="{ width: `${pct(summary.tepatWaktu)}%` }"></div>
                    <div class="bg-amber-400" :style="{ width: `${pct(summary.terlambat)}%` }"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div class="rounded-lg bg-green-50 px-3 py-2">
                    <p class="text-xs text-green-700">Tepat waktu</p>
                    <p class="text-xl font-heading font-bold text-green-700 tabular-nums">{{ summary.tepatWaktu }}</p>
                </div>
                <div class="rounded-lg bg-amber-50 px-3 py-2">
                    <p class="text-xs text-amber-700">Terlambat</p>
                    <p class="text-xl font-heading font-bold text-amber-700 tabular-nums">{{ summary.terlambat }}</p>
                </div>
                <button
                    type="button"
                    class="rounded-lg bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
                    title="Lihat daftar siswa yang belum masuk"
                    @click="tab = 'belum'"
                >
                    <p class="text-xs text-gray-500">Belum masuk</p>
                    <p class="text-xl font-heading font-bold text-gray-700 tabular-nums">
                        {{ summary.belumMasuk }}
                        <span v-if="summary.tidakHadir" class="text-xs font-medium text-red-500">({{ summary.tidakHadir }} tidak hadir)</span>
                    </p>
                </button>
                <div class="rounded-lg bg-sky-50 px-3 py-2">
                    <p class="text-xs text-sky-700">Sudah pulang</p>
                    <p class="text-xl font-heading font-bold text-sky-700 tabular-nums">
                        {{ summary.sudahPulang }}
                        <span v-if="summary.pulangAwal" class="text-xs font-medium text-orange-600">({{ summary.pulangAwal }} awal)</span>
                    </p>
                </div>
            </div>
        </div>

        <!-- Tab -->
        <div class="flex border-b border-gray-100 px-4 text-sm">
            <button
                v-for="t in TABS"
                :key="t.value"
                type="button"
                class="px-3 py-2 -mb-px border-b-2 font-medium"
                :class="tab === t.value ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                @click="tab = t.value"
            >
                {{ t.label }}
            </button>
        </div>

        <!-- Aktivitas -->
        <div v-if="tab === 'aktivitas'" class="max-h-[420px] overflow-y-auto">
            <p v-if="data && !feed.length" class="p-8 text-center text-sm text-gray-400">Belum ada scan hari ini.</p>
            <ul v-else class="divide-y divide-gray-50">
                <li v-for="item in feed" :key="item.key" class="flex items-center gap-3 px-4 py-2.5">
                    <UserAvatar
                        :nama="item.student.nama"
                        :uuid="item.student.uuid"
                        :foto-path="item.student.fotoPath"
                        kind="students"
                        size="sm"
                    />
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 truncate">{{ item.student.nama }}</p>
                        <p class="text-xs text-gray-400 truncate">
                            {{ item.student.kelasLabel }}<span v-if="item.oleh"> · oleh {{ item.oleh }}</span>
                            <span v-if="item.catatan" :title="item.catatan"> · "{{ item.catatan }}"</span>
                        </p>
                    </div>
                    <div class="flex flex-wrap justify-end gap-1 shrink-0 max-w-[45%]">
                        <span
                            class="text-[11px] font-medium px-1.5 py-0.5 rounded"
                            :class="item.jenis === 'masuk' ? 'bg-green-50 text-green-700' : 'bg-sky-50 text-sky-700'"
                        >
                            {{ item.jenis === "masuk" ? "Masuk" : "Pulang" }}
                        </span>
                        <span v-if="item.jenis === 'masuk' && item.status === 'terlambat'" class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                            Telat {{ item.menitTerlambat }} mnt
                        </span>
                        <span v-if="item.pulangAwal" class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">Pulang awal</span>
                        <span v-if="item.metode === 'manual'" class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Manual</span>
                    </div>
                    <p class="text-sm text-gray-600 tabular-nums w-11 text-right shrink-0">{{ formatJam(item.waktu) }}</p>
                    <button
                        v-if="item.batal.boleh"
                        type="button"
                        class="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        :title="`Batalkan absen ${item.jenis}`"
                        @click="emit('cancel', { attendanceId: item.attendanceId, jenis: item.jenis, student: item.student, waktu: item.waktu })"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 7v6h6M3 13a9 9 0 103-7.7L3 8" />
                        </svg>
                    </button>
                    <span v-else class="w-6 shrink-0"></span>
                </li>
            </ul>
        </div>

        <!-- Belum masuk -->
        <div v-else>
            <div class="flex flex-wrap gap-2 px-4 pt-3">
                <select
                    v-if="jenjang !== 'all'"
                    v-model="kelas"
                    class="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                    <option value="">Semua kelas</option>
                    <option v-for="k in KELAS_BY_JENJANG[jenjang]" :key="k" :value="k">
                        {{ formatKelas(jenjang, k) }}
                    </option>
                </select>
                <input
                    v-model="q"
                    type="search"
                    placeholder="Cari nama / NISN"
                    class="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
            </div>
            <div class="max-h-[380px] overflow-y-auto mt-2">
                <div v-if="belumLoading && !belum.length" class="space-y-2 p-4">
                    <div v-for="i in 4" :key="i" class="h-10 rounded-lg bg-gray-100 animate-pulse"></div>
                </div>
                <p v-else-if="!belum.length" class="p-8 text-center text-sm text-gray-400">
                    {{ q || kelas ? "Tidak ada siswa yang cocok." : "Semua siswa sudah absen masuk. 🎉" }}
                </p>
                <ul v-else class="divide-y divide-gray-50">
                    <li v-for="row in belum" :key="row.student.uuid" class="flex items-center gap-3 px-4 py-2">
                        <UserAvatar
                            :nama="row.student.nama"
                            :uuid="row.student.uuid"
                            :foto-path="row.student.fotoPath"
                            kind="students"
                            size="sm"
                        />
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-800 truncate">{{ row.student.nama }}</p>
                            <p class="text-xs text-gray-400">{{ row.student.kelasLabel }}</p>
                        </div>
                        <span
                            v-if="row.today?.statusKoreksi === 'sakit' || row.today?.statusKoreksi === 'izin'"
                            class="text-[11px] font-medium px-1.5 py-0.5 rounded"
                            :class="row.today.statusKoreksi === 'sakit' ? KODE_STATUS.S.badge : KODE_STATUS.I.badge"
                        >
                            {{ row.today.statusKoreksi === "sakit" ? "Sakit" : "Izin" }}
                        </span>
                        <span
                            v-else-if="row.today?.statusUtama === 'tidak_hadir'"
                            class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600"
                        >
                            Tidak hadir
                        </span>
                        <span
                            v-else-if="row.today?.statusUtama === 'terlambat'"
                            class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"
                        >
                            Terlambat
                        </span>
                        <button
                            type="button"
                            :disabled="!data?.hari.isSchoolDay || !!row.libur"
                            :title="row.libur ?? undefined"
                            class="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                            @click="emit('manual', row)"
                        >
                            Absen manual
                        </button>
                    </li>
                </ul>
                <p v-if="belumTotal > belum.length" class="text-xs text-gray-400 text-center py-2">
                    Menampilkan {{ belum.length }} dari {{ belumTotal }} siswa.
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Jenjang } from "#shared/utils/kelas";
import type { CancelTarget, TodayResponse, TodayStudentRow, TodayStudentsResponse } from "~/types/scan";

const props = defineProps<{ data: TodayResponse | null; error?: boolean }>();
const emit = defineEmits<{ cancel: [target: CancelTarget]; manual: [row: TodayStudentRow] }>();

const JENJANG_TABS: { value: "all" | Jenjang; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "TK", label: "TK" },
    { value: "SD", label: "SD" },
    { value: "SMP", label: "SMP" },
];
const TABS = [
    { value: "aktivitas" as const, label: "Aktivitas terbaru" },
    { value: "belum" as const, label: "Belum masuk" },
];

const api = useApi({ silent: true });
const jenjang = ref<"all" | Jenjang>("all");
const tab = ref<"aktivitas" | "belum">("aktivitas");

const summary = computed(() => props.data!.summary[jenjang.value === "all" ? "total" : jenjang.value]);
const tabLibur = (value: "all" | Jenjang) => value !== "all" && !!props.data?.summary[value]?.libur;
const feed = computed(() => {
    const items = props.data?.feed ?? [];
    return jenjang.value === "all" ? items : items.filter((f) => f.student.jenjang === jenjang.value);
});
const updatedLabel = computed(() => (props.data ? formatJam(props.data.serverTime) : "…"));

function pct(n: number) {
    const total = summary.value.totalSiswa;
    return total ? Math.round((n / total) * 100) : 0;
}

// --- Daftar belum masuk
const kelas = ref("");
const q = ref("");
const belum = ref<TodayStudentRow[]>([]);
const belumTotal = ref(0);
const belumLoading = ref(false);
let seq = 0;

async function loadBelum() {
    if (tab.value !== "belum") return;
    const current = ++seq;
    belumLoading.value = true;
    try {
        const res = await api<TodayStudentsResponse>("/api/attendance/today/students", {
            query: {
                filter: "belum_masuk",
                jenjang: jenjang.value === "all" ? undefined : jenjang.value,
                kelas: jenjang.value === "all" ? undefined : kelas.value || undefined,
                q: q.value.trim() || undefined,
                pageSize: 100,
            },
        });
        if (current !== seq) return;
        belum.value = res.data;
        belumTotal.value = res.total;
    } catch {
        // Diam saja: panel mencoba lagi pada pembaruan berikutnya
    } finally {
        if (current === seq) belumLoading.value = false;
    }
}

watch(jenjang, () => {
    kelas.value = "";
    void loadBelum();
});
watch([tab, kelas], () => void loadBelum());
let qTimer: ReturnType<typeof setTimeout> | undefined;
watch(q, () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(loadBelum, 300);
});
// Ikut diperbarui setiap panel diperbarui (polling / setelah scan)
watch(() => props.data?.serverTime, () => void loadBelum());
</script>
