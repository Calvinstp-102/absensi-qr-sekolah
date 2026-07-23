<template>
    <div>
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800 mb-1">
                    Dashboard
                </h1>
                <p class="text-gray-500 text-sm">
                    Selamat datang, {{ user?.nama }} — menampilkan data
                    <span class="font-medium text-gray-700">{{
                        rangeLabel
                    }}</span>
                </p>
            </div>
            <DateRangePicker @change="handleRangeChange" />
        </div>

        <div class="grid grid-cols-4 gap-4 mb-6">
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5 flex items-center gap-4"
            >
                <StatRing
                    :value="data?.summary.total ?? 0"
                    :total="data?.summary.total ?? 1"
                    color="#1E3A5F"
                />
                <div>
                    <p
                        class="text-xs text-gray-400 font-medium uppercase tracking-wide"
                    >
                        Total Murid
                    </p>
                    <p class="text-2xl font-heading font-bold text-gray-800">
                        {{ data?.summary.total ?? "-" }}
                    </p>
                </div>
            </div>
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5 flex items-center gap-4"
            >
                <StatRing
                    :value="data?.summary.hadir ?? 0"
                    :total="data?.summary.total ?? 1"
                    color="#16a34a"
                />
                <div>
                    <p
                        class="text-xs text-gray-400 font-medium uppercase tracking-wide"
                    >
                        Hadir
                    </p>
                    <p class="text-2xl font-heading font-bold text-green-600">
                        {{ data?.summary.hadir ?? "-" }}
                    </p>
                </div>
            </div>
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5 flex items-center gap-4"
            >
                <StatRing
                    :value="data?.summary.terlambat ?? 0"
                    :total="data?.summary.total ?? 1"
                    color="#d97706"
                />
                <div>
                    <p
                        class="text-xs text-gray-400 font-medium uppercase tracking-wide"
                    >
                        Terlambat
                    </p>
                    <p class="text-2xl font-heading font-bold text-amber-600">
                        {{ data?.summary.terlambat ?? "-" }}
                    </p>
                </div>
            </div>
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5 flex items-center gap-4"
            >
                <StatRing
                    :value="data?.summary.tidakHadir ?? 0"
                    :total="data?.summary.total ?? 1"
                    color="#dc2626"
                />
                <div>
                    <p
                        class="text-xs text-gray-400 font-medium uppercase tracking-wide"
                    >
                        Tidak Hadir
                    </p>
                    <p class="text-2xl font-heading font-bold text-red-600">
                        {{ data?.summary.tidakHadir ?? "-" }}
                    </p>
                </div>
            </div>
        </div>

        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md p-4 mb-6"
        >
            <div class="flex items-center mb-3">
                <div class="relative flex items-center group">
                    <svg
                        class="w-4 h-4 text-gray-400 cursor-help"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <div
                        class="absolute left-0 top-full mt-2 z-30 w-72 bg-gray-800 text-white text-xs leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 pointer-events-none"
                    >
                        <div
                            class="absolute -top-1 left-2 w-2 h-2 bg-gray-800 rotate-45"
                        ></div>
                        Filter <b>Jenjang</b> memengaruhi kartu ringkasan dan
                        listing sekaligus. Filter <b>Status</b> hanya
                        memengaruhi listing di bawah — kartu ringkasan tetap
                        menghitung semua status. <br /><br />
                        Siswa dengan status <b>Tidak Hadir</b> tidak otomatis
                        muncul di listing. Klik filter status "Tidak Hadir"
                        untuk melihatnya.
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-2 flex-wrap">
                    <span
                        class="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1"
                        >Jenjang</span
                    >
                    <button
                        v-for="opt in jenjangOptions"
                        :key="opt.value"
                        @click="
                            filterJenjang = opt.value;
                            currentPage = 1;
                        "
                        class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        :class="
                            filterJenjang === opt.value
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        "
                    >
                        {{ opt.label }}
                    </button>

                    <span class="w-px h-5 bg-gray-200 mx-1"></span>

                    <span
                        class="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1"
                        >Status</span
                    >
                    <button
                        v-for="opt in statusOptions"
                        :key="opt.value"
                        @click="
                            filterStatus = opt.value;
                            currentPage = 1;
                        "
                        class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        :class="
                            filterStatus === opt.value
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        "
                    >
                        {{ opt.label }}
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <a
                        :href="exportUrl('excel')"
                        class="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                        <svg
                            class="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
                        </svg>
                        Excel
                    </a>
                    <a
                        :href="exportUrl('pdf')"
                        class="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                        <svg
                            class="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
                        </svg>
                        PDF
                    </a>
                </div>
            </div>
        </div>

        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden"
        >
            <table class="w-full text-sm">
                <thead
                    class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                    <tr>
                        <th class="p-3">Tanggal</th>
                        <th class="p-3">Nama</th>
                        <th class="p-3">Kelas</th>
                        <th class="p-3">Jam Masuk</th>
                        <th class="p-3">Jam Pulang</th>
                        <th class="p-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="pending">
                        <td colspan="6" class="p-4 text-center text-gray-400">
                            Memuat...
                        </td>
                    </tr>
                    <tr v-else-if="!data?.attendances?.length">
                        <td colspan="6" class="p-4 text-center text-gray-400">
                            Tidak ada data pada rentang ini.
                        </td>
                    </tr>
                    <tr
                        v-for="(a, idx) in data?.attendances"
                        :key="a.id"
                        class="border-t border-gray-100 hover:bg-primary-50/50 transition-colors"
                        :class="idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'"
                    >
                        <td class="p-3 text-gray-500">
                            {{ formatDate(a.tanggal) }}
                        </td>
                        <td class="p-3 font-medium text-gray-700">
                            {{ a.student.nama }}
                        </td>
                        <td class="p-3">{{ a.student.kelasSekarang }}</td>
                        <td class="p-3">
                            {{
                                a.jamMasukAsli
                                    ? formatTime(a.jamMasukAsli)
                                    : "-"
                            }}
                        </td>
                        <td class="p-3">
                            {{
                                a.jamPulangAsli
                                    ? formatTime(a.jamPulangAsli)
                                    : "-"
                            }}
                        </td>
                        <td class="p-3">
                            <span
                                :class="statusClass(a)"
                                class="px-2 py-1 rounded-full text-xs font-medium"
                            >
                                {{ statusLabel(a) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div
                v-if="data?.pagination && data.pagination.totalPages > 1"
                class="flex items-center justify-between p-3 border-t border-gray-100 text-sm"
            >
                <p class="text-gray-400 text-xs">
                    Halaman {{ data.pagination.page }} dari
                    {{ data.pagination.totalPages }} ({{
                        data.pagination.total
                    }}
                    data)
                </p>
                <div class="flex gap-1">
                    <button
                        :disabled="currentPage <= 1"
                        @click="currentPage--"
                        class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                    >
                        Sebelumnya
                    </button>
                    <button
                        :disabled="currentPage >= data.pagination.totalPages"
                        @click="currentPage++"
                        class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                    >
                        Berikutnya
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";

const { user } = useUserSession();

const filterJenjang = ref("");
const filterStatus = ref("");
const currentPage = ref(1);
const dateRange = ref({
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
});
const rangeLabel = ref("Hari Ini");

const jenjangOptions = [
    { value: "", label: "Semua" },
    { value: "TK", label: "TK" },
    { value: "SD", label: "SD" },
    { value: "SMP", label: "SMP" },
];

const statusOptions = [
    { value: "", label: "Semua" },
    { value: "hadir", label: "Tepat Waktu" },
    { value: "terlambat", label: "Terlambat" },
    { value: "tidak_hadir", label: "Tidak Hadir" },
];

function handleRangeChange(range: { from: string; to: string; label: string }) {
    dateRange.value = { from: range.from, to: range.to };
    rangeLabel.value = range.label;
    currentPage.value = 1;
}

const { data, pending } = await useFetch("/api/attendance/report", {
    query: computed(() => ({
        from: dateRange.value.from,
        to: dateRange.value.to,
        jenjang: filterJenjang.value || undefined,
        status: filterStatus.value || undefined,
        page: currentPage.value,
        pageSize: 10,
    })),
});

function formatDate(d: string) {
    return dayjs(d).format("DD MMM YYYY");
}
function formatTime(dt: string) {
    return dayjs(dt).format("HH:mm");
}

function statusLabel(a: any) {
    const map: Record<string, string> = {
        hadir: "Hadir",
        terlambat: "Terlambat",
        tidak_hadir: "Tidak Hadir",
    };
    let label = map[a.statusUtama];
    if (a.statusKoreksi === "dimaklumi") label += " (Dimaklumi)";
    return label;
}

function statusClass(a: any) {
    if (a.statusKoreksi === "dimaklumi") return "bg-green-100 text-green-700";
    if (a.statusUtama === "hadir") return "bg-green-100 text-green-700";
    if (a.statusUtama === "terlambat") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
}

function exportUrl(type: "excel" | "pdf") {
    const params = new URLSearchParams();
    params.set("from", dateRange.value.from);
    params.set("to", dateRange.value.to);
    if (filterJenjang.value) params.set("jenjang", filterJenjang.value);
    if (filterStatus.value) params.set("status", filterStatus.value);
    return `/api/attendance/export-${type}?${params.toString()}`;
}
</script>
