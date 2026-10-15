<template>
    <section class="bg-white rounded-xl border border-gray-100 shadow-md" aria-labelledby="libur-title">
        <div class="flex items-start gap-3 p-4 pb-3 flex-wrap">
            <div class="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <svg class="w-[18px] h-[18px] text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" />
                </svg>
            </div>
            <div class="min-w-0 flex-1">
                <h2 id="libur-title" class="text-sm font-semibold text-gray-800">Hari Libur</h2>
                <p class="text-xs text-gray-500 mt-0.5">
                    Libur sekolah, tanggal merah, atau libur khusus jenjang. Scan ditolak dan siswa tidak ditandai
                    Terlambat/Tidak Hadir.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <select
                    v-model.number="tahun"
                    aria-label="Pilih tahun"
                    class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                    <option v-for="t in tahunList" :key="t" :value="t">{{ t }}</option>
                </select>
                <button
                    type="button"
                    class="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm"
                    @click="openForm(null)"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Tambah Libur
                </button>
            </div>
        </div>

        <!-- Ringkasan -->
        <div v-if="data && data.data.length > 0" class="px-4 pb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
            <span><strong class="text-gray-800">{{ data.summary.total }}</strong> libur di {{ data.tahun }}</span>
            <span><strong class="text-gray-800">{{ data.summary.hariSekolahLibur }}</strong> hari sekolah diliburkan</span>
            <span><strong class="text-gray-800">{{ data.summary.akanDatang }}</strong> akan datang</span>
        </div>

        <div v-if="error && !data" class="p-8 text-center border-t border-gray-100">
            <p class="text-sm text-red-600 mb-3">{{ getErrorMessage(error, "Gagal memuat hari libur.") }}</p>
            <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="refresh()">
                Coba lagi
            </button>
        </div>

        <div v-else-if="rows.length === 0 && !pending" class="px-4 py-10 text-center border-t border-gray-100">
            <p class="text-sm font-medium text-gray-700">Belum ada hari libur di {{ tahun }}</p>
            <p class="text-xs text-gray-500 mt-1">Tambahkan libur semester, tanggal merah, atau cuti bersama.</p>
        </div>

        <ul v-else class="border-t border-gray-100 divide-y divide-gray-100 max-h-[440px] overflow-y-auto" :class="{ 'opacity-60': pending }">
            <li
                v-for="h in rows"
                :key="h.uuid"
                class="flex items-start gap-3 px-4 py-3"
                :class="{ 'bg-amber-50/50': h.status === 'berlangsung' }"
            >
                <div
                    class="w-12 shrink-0 rounded-lg border text-center py-1"
                    :class="h.status === 'selesai' ? 'border-gray-100 text-gray-400' : 'border-primary-100 text-primary-700'"
                >
                    <p class="text-[10px] uppercase leading-tight">{{ bulanPendek(h.tanggalMulai) }}</p>
                    <p class="text-lg font-heading font-bold leading-tight">{{ Number(h.tanggalMulai.slice(8, 10)) }}</p>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-sm font-medium" :class="h.status === 'selesai' ? 'text-gray-500' : 'text-gray-800'">
                            {{ h.keterangan }}
                        </p>
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-medium" :class="HOLIDAY_STATUS[h.status].badge">
                            {{ HOLIDAY_STATUS[h.status].label }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">
                        {{ h.rentang }} · {{ h.jumlahHari }} hari
                        <span v-if="h.jumlahHariSekolah !== h.jumlahHari">({{ h.jumlahHariSekolah }} hari sekolah)</span>
                    </p>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                        <span v-if="!h.jenjang" class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                            Semua jenjang
                        </span>
                        <span
                            v-for="j in h.jenjang ?? []"
                            :key="j"
                            class="px-2 py-0.5 rounded bg-violet-50 text-violet-700 text-[11px] font-medium"
                        >
                            Hanya {{ j }}
                        </span>
                    </div>
                </div>
                <BaseActionMenu :items="menuItems(h)" :label="`Aksi untuk ${h.keterangan}`" @select="(a) => handleAction(a, h)" />
            </li>
        </ul>

        <PengaturanHolidayFormModal
            :open="formOpen"
            :holiday="editing"
            :today="data?.today ?? ''"
            :hari-sekolah="hariSekolah"
            @close="formOpen = false"
            @saved="onSaved"
        />
    </section>
</template>

<script setup lang="ts">
import { HOLIDAY_STATUS, type HolidayRow } from "~/types/holiday";
import type { ActionMenuItem } from "~/types/ui";

const props = defineProps<{
    /** Hari sekolah tersimpan (1 = Senin ... 7 = Minggu) */
    hariSekolah: number[];
}>();

const toast = useToast();
const api = useApi();
const { confirm } = useConfirm();

const tahun = ref(new Date().getFullYear());
const { data, pending, error, refresh } = await useApiFetch("/api/holidays", {
    query: computed(() => ({ tahun: tahun.value })),
});
const rows = computed(() => (data.value?.data ?? []) as HolidayRow[]);
const tahunList = computed(() => data.value?.tahunList ?? [tahun.value]);

// Jumlah hari sekolah per libur dihitung server dari setting tersimpan
watch(() => props.hariSekolah.join(","), () => refresh());

function bulanPendek(tanggal: string) {
    return new Date(`${tanggal}T00:00:00Z`).toLocaleDateString("id-ID", { timeZone: "UTC", month: "short" });
}

const ICONS = {
    edit: ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7", "M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
    hapus: ["M3 6h18", "M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6", "M10 11v6M14 11v6", "M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"],
};
const TERKUNCI = "Libur sudah selesai, absensinya sudah ditetapkan";

function menuItems(h: HolidayRow): ActionMenuItem<"edit" | "hapus">[] {
    const selesai = h.status === "selesai";
    return [
        { key: "edit", label: "Edit", icon: ICONS.edit, disabledReason: selesai ? TERKUNCI : undefined },
        { key: "hapus", label: "Hapus", icon: ICONS.hapus, danger: true, divider: true, disabledReason: selesai ? TERKUNCI : undefined },
    ];
}

const formOpen = ref(false);
const editing = ref<HolidayRow | null>(null);

function openForm(h: HolidayRow | null) {
    editing.value = h;
    formOpen.value = true;
}

async function onSaved(message: string, tanggalMulai: string) {
    formOpen.value = false;
    toast.success("Tersimpan", message);
    // Pindah ke tahun libur yang baru disimpan agar langsung terlihat
    const tahunLibur = Number(tanggalMulai.slice(0, 4));
    if (tahunLibur !== tahun.value) tahun.value = tahunLibur;
    else await refresh();
}

async function handleAction(action: "edit" | "hapus", h: HolidayRow) {
    if (action === "edit") return openForm(h);
    const ok = await confirm({
        title: "Hapus Hari Libur",
        message:
            h.status === "berlangsung"
                ? `Hapus "${h.keterangan}" yang sedang berlangsung? Hari ini langsung menjadi hari sekolah lagi: scan dibuka dan siswa yang belum scan akan ditandai Terlambat/Tidak Hadir sesuai jadwal.`
                : `Hapus "${h.keterangan}" (${h.rentang})? Tanggal tersebut kembali menjadi hari sekolah.`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;
    try {
        const res = await api<{ message: string }>(`/api/holidays/${h.uuid}`, { method: "DELETE" });
        toast.success("Hari libur dihapus", res.message);
        await refresh();
    } catch (err) {
        toast.error("Gagal menghapus hari libur", getErrorMessage(err));
        await refresh();
    }
}
</script>
