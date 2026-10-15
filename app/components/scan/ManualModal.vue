<template>
    <BaseModal
        :open="open"
        title="Absen Manual"
        subtitle="Untuk siswa yang kartunya tertinggal, rusak, atau hilang"
        size="lg"
        :busy="isSaving"
        @close="emit('close')"
    >
        <!-- Langkah 1: cari siswa -->
        <div v-if="!selected">
            <div class="relative">
                <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                    ref="searchRef"
                    v-model="q"
                    type="search"
                    autocomplete="off"
                    placeholder="Cari nama, NIS, atau NISN siswa"
                    class="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
            </div>

            <div class="mt-3 min-h-[200px]">
                <div v-if="isSearching" class="space-y-2">
                    <div v-for="i in 4" :key="i" class="h-14 rounded-lg bg-gray-100 animate-pulse"></div>
                </div>
                <p v-else-if="searchError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ searchError }}</p>
                <p v-else-if="!rows.length" class="text-sm text-gray-400 text-center py-10">
                    {{ q.trim() ? "Tidak ada siswa aktif yang cocok." : "Ketik nama atau NISN untuk mencari siswa." }}
                </p>
                <ul v-else class="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    <li v-for="row in rows" :key="row.student.uuid">
                        <button
                            type="button"
                            :disabled="!!row.libur"
                            :title="row.libur ?? undefined"
                            class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            @click="select(row)"
                        >
                            <UserAvatar
                                :nama="row.student.nama"
                                :uuid="row.student.uuid"
                                :foto-path="row.student.fotoPath"
                                kind="students"
                                size="sm"
                            />
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-800 truncate">{{ row.student.nama }}</p>
                                <p class="text-xs text-gray-400">
                                    {{ row.student.kelasLabel }}<span v-if="row.student.nisn"> · {{ row.student.nisn }}</span>
                                </p>
                            </div>
                            <span class="text-xs px-2 py-0.5 rounded-full shrink-0" :class="statusBadge(row).class">
                                {{ statusBadge(row).label }}
                            </span>
                        </button>
                    </li>
                </ul>
                <p v-if="total > rows.length" class="text-xs text-gray-400 mt-2 text-center">
                    Menampilkan {{ rows.length }} dari {{ total }} siswa, persempit pencarian.
                </p>
            </div>
        </div>

        <!-- Langkah 2: jenis & alasan -->
        <form v-else class="space-y-4" @submit.prevent="submit">
            <div class="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <UserAvatar
                    :nama="selected.student.nama"
                    :uuid="selected.student.uuid"
                    :foto-path="selected.student.fotoPath"
                    kind="students"
                    size="lg"
                />
                <div class="flex-1 min-w-0">
                    <p class="font-heading font-bold text-gray-800 text-lg leading-tight">{{ selected.student.nama }}</p>
                    <p class="text-sm text-gray-500">{{ selected.student.kelasLabel }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        Masuk <b>{{ formatJam(selected.today?.masuk?.waktu) }}</b> · Pulang
                        <b>{{ formatJam(selected.today?.pulang?.waktu) }}</b>
                    </p>
                </div>
                <button
                    v-if="!props.student"
                    type="button"
                    class="text-xs text-primary-600 hover:underline shrink-0"
                    :disabled="isSaving"
                    @click="selected = null"
                >
                    Ganti siswa
                </button>
            </div>

            <div>
                <p class="block text-sm font-medium text-gray-700 mb-1.5">Jenis absen</p>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        v-for="opt in jenisOptions"
                        :key="opt.value"
                        type="button"
                        :disabled="!!opt.disabled"
                        class="rounded-lg border-2 px-3 py-2.5 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="jenis === opt.value ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
                        @click="jenis = opt.value"
                    >
                        <p class="text-sm font-bold text-gray-800">{{ opt.label }}</p>
                        <p class="text-xs text-gray-500 mt-0.5">{{ opt.disabled || opt.hint }}</p>
                    </button>
                </div>
                <p v-if="isPulangAwal" class="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mt-2">
                    Jam pulang {{ selected.student.jenjang }} belum dibuka (mulai {{ selected.bukaPulang }}), jadi dicatat sebagai
                    <b>pulang awal</b>.
                </p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                    Alasan <span class="text-red-500">*</span>
                </label>
                <div class="flex flex-wrap gap-1.5 mb-2">
                    <button
                        v-for="item in quickReasons"
                        :key="item"
                        type="button"
                        class="px-2.5 py-1 rounded-full border text-xs"
                        :class="alasan === item ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                        @click="pickReason(item)"
                    >
                        {{ item }}
                    </button>
                </div>
                <textarea
                    ref="textareaRef"
                    v-model="alasan"
                    rows="2"
                    maxlength="255"
                    class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    :class="fieldErrors.alasan ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-primary-100'"
                    placeholder="Contoh: kartu tertinggal di rumah"
                    @input="fieldErrors.alasan = ''"
                ></textarea>
                <p v-if="fieldErrors.alasan" class="text-xs text-red-600 mt-1">{{ fieldErrors.alasan }}</p>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                    type="button"
                    :disabled="isSaving"
                    class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    @click="emit('close')"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    :disabled="isSaving || !jenis"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                    <span v-if="isSaving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    {{ isSaving ? "Menyimpan..." : `Catat Absen ${jenis === "pulang" ? "Pulang" : "Masuk"}` }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { ScanJenis, ScanResponse, TodayStudentRow, TodayStudentsResponse } from "~/types/scan";

const props = defineProps<{
    open: boolean;
    /** Siswa yang langsung dipilih (dari daftar Belum hadir) */
    student?: TodayStudentRow | null;
}>();
const emit = defineEmits<{ close: []; saved: [res: ScanResponse]; failed: [err: unknown] }>();

const REASONS: Record<ScanJenis, string[]> = {
    masuk: ["Kartu tertinggal", "Kartu rusak", "Kartu hilang", "Kamera/scanner bermasalah"],
    pulang: ["Kartu tertinggal", "Kartu rusak", "Dijemput orang tua", "Sakit"],
};

const searchApi = useApi({ silent: true });
const api = useApi();
const toast = useToast();

const q = ref("");
const rows = ref<TodayStudentRow[]>([]);
const total = ref(0);
const isSearching = ref(false);
const searchError = ref("");
const selected = ref<TodayStudentRow | null>(null);
const jenis = ref<ScanJenis | null>(null);
const alasan = ref("");
const fieldErrors = ref<Record<string, string>>({});
const isSaving = ref(false);
const searchRef = ref<HTMLInputElement>();
const textareaRef = ref<HTMLTextAreaElement>();

const jenisOptions = computed(() => {
    const t = selected.value?.today;
    return [
        {
            value: "masuk" as const,
            label: "Absen Masuk",
            hint: "Dicatat dengan jam sekarang",
            disabled: t?.masuk ? `Sudah masuk ${formatJam(t.masuk.waktu)}` : null,
        },
        {
            value: "pulang" as const,
            label: "Absen Pulang",
            hint: "Dicatat dengan jam sekarang",
            disabled: !t?.masuk ? "Belum absen masuk" : t.pulang ? `Sudah pulang ${formatJam(t.pulang.waktu)}` : null,
        },
    ];
});

const isPulangAwal = computed(() => {
    if (jenis.value !== "pulang" || !selected.value) return false;
    const [h, m] = selected.value.bukaPulang.split(":").map(Number);
    // Jam sekarang versi WIB (UTC+7), apa pun timezone perangkat
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return wib.getUTCHours() * 60 + wib.getUTCMinutes() < (h ?? 0) * 60 + (m ?? 0);
});

const quickReasons = computed(() => REASONS[jenis.value ?? "masuk"]);

function statusBadge(row: TodayStudentRow) {
    const t = row.today;
    if (row.libur) return { label: `${row.student.jenjang} libur`, class: "bg-violet-50 text-violet-700" };
    if (t?.pulang) return { label: "Sudah pulang", class: "bg-sky-50 text-sky-700" };
    if (t?.masuk) return { label: `Masuk ${formatJam(t.masuk.waktu)}`, class: "bg-green-50 text-green-700" };
    if (t?.statusUtama === "tidak_hadir") return { label: "Tidak hadir", class: "bg-red-50 text-red-600" };
    return { label: "Belum masuk", class: "bg-gray-100 text-gray-500" };
}

function select(row: TodayStudentRow) {
    selected.value = row;
    const t = row.today;
    jenis.value = !t?.masuk ? "masuk" : !t.pulang ? "pulang" : null;
    alasan.value = "";
    fieldErrors.value = {};
}

function pickReason(item: string) {
    alasan.value = item;
    fieldErrors.value.alasan = "";
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSeq = 0;
async function search() {
    const seq = ++searchSeq;
    isSearching.value = true;
    searchError.value = "";
    try {
        const res = await searchApi<TodayStudentsResponse>("/api/attendance/today/students", {
            query: { q: q.value.trim() || undefined, pageSize: 8 },
        });
        if (seq !== searchSeq) return;
        rows.value = res.data;
        total.value = res.total;
    } catch (err) {
        if (seq !== searchSeq) return;
        searchError.value = getErrorMessage(err, "Gagal mencari siswa.");
    } finally {
        if (seq === searchSeq) isSearching.value = false;
    }
}
watch(q, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(search, 300);
});

watch(
    () => props.open,
    async (open) => {
        if (!open) return;
        q.value = "";
        rows.value = [];
        selected.value = null;
        fieldErrors.value = {};
        if (props.student) {
            select(props.student);
        } else {
            await nextTick();
            searchRef.value?.focus();
            void search();
        }
    },
);

async function submit() {
    if (!selected.value || !jenis.value) return;
    if (alasan.value.trim().length < 3) {
        fieldErrors.value = { alasan: "Alasan wajib diisi (minimal 3 karakter)." };
        textareaRef.value?.focus();
        return;
    }
    isSaving.value = true;
    try {
        const res = await api<ScanResponse>("/api/attendance/manual", {
            method: "POST",
            body: { studentUuid: selected.value.student.uuid, jenis: jenis.value, alasan: alasan.value.trim() },
        });
        emit("saved", res);
    } catch (err) {
        const fe = getFieldErrors(err);
        if (Object.keys(fe).length) {
            fieldErrors.value = fe;
            if (!fe.alasan) toast.error("Gagal menyimpan", getErrorMessage(err));
        } else {
            emit("failed", err);
        }
    } finally {
        isSaving.value = false;
    }
}
</script>
