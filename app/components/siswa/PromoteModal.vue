<template>
    <BaseModal :open="open" title="Naik Kelas" :subtitle="subtitle" :busy="isSaving" size="xl" @close="close">
        <!-- Langkah -->
        <ol class="flex items-center gap-2 text-xs mb-5">
            <li
                v-for="(label, i) in STEPS"
                :key="label"
                class="flex items-center gap-2"
                :class="i + 1 <= stepNumber ? 'text-primary-700 font-medium' : 'text-gray-400'"
            >
                <span
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                    :class="i + 1 <= stepNumber ? 'bg-primary-600 text-white' : 'bg-gray-100'"
                >
                    {{ i + 1 }}
                </span>
                {{ label }}
                <span v-if="i < STEPS.length - 1" class="w-6 h-px bg-gray-200"></span>
            </li>
        </ol>

        <!-- 1. Pilih kelas asal -->
        <div v-if="step === 'pilih'" class="space-y-4">
            <p class="text-sm text-gray-600">Pilih kelas yang akan dinaikkan.</p>
            <div v-for="j in JENJANG_LIST" :key="j">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{{ j }}</p>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="k in KELAS_BY_JENJANG[j]"
                        :key="k"
                        type="button"
                        class="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-primary-400 hover:bg-primary-50"
                        @click="pickKelas(j, k)"
                    >
                        {{ j === "TK" ? k : `Kelas ${k}` }}
                        <span class="text-xs text-gray-400">→ {{ targetLabel(j, k) }}</span>
                    </button>
                </div>
            </div>
            <p class="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                Saran: proses dari kelas tertinggi (SMP 9) ke terendah. Siswa yang sudah naik kelas di
                tahun ajaran aktif otomatis dilewati, jadi tidak akan naik dua kali.
            </p>
        </div>

        <!-- 2. Pilih siswa -->
        <div v-else-if="step === 'siswa' && preview" class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2.5">
                <p class="text-sm text-primary-800">
                    <span class="font-semibold">{{ preview.asal }}</span>
                    →
                    <span class="font-semibold">{{ preview.target.label }}</span>
                    <span v-if="preview.target.lulus" class="block text-xs text-primary-700">
                        Siswa yang lulus menjadi nonaktif dan tidak bisa absen lagi.
                    </span>
                </p>
                <p class="text-xs text-primary-700">Tahun ajaran aktif: <b>{{ preview.tahunAjaran }}</b></p>
            </div>
            <p class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Pastikan tahun ajaran aktif sudah diganti ke tahun ajaran baru di menu Pengaturan sebelum
                memproses naik kelas.
            </p>

            <div v-if="!preview.students.length" class="py-8 text-center text-sm text-gray-500">
                Tidak ada siswa aktif di {{ preview.asal }}.
            </div>
            <template v-else>
                <div class="flex items-center justify-between text-sm">
                    <label class="flex items-center gap-2 text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                            :checked="allSelected"
                            :indeterminate="someSelected"
                            :disabled="!eligible.length"
                            @change="toggleAll"
                        />
                        Pilih semua
                    </label>
                    <span class="text-gray-500">
                        {{ selected.size }} dipilih · {{ eligible.length - selected.size }} tinggal kelas
                    </span>
                </div>
                <ul class="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    <li v-for="s in preview.students" :key="s.id">
                        <label
                            class="flex items-center gap-3 px-3 py-2"
                            :class="s.sudahNaik ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'"
                        >
                            <input
                                type="checkbox"
                                class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                                :checked="selected.has(s.id)"
                                :disabled="s.sudahNaik"
                                @change="toggle(s.id)"
                            />
                            <UserAvatar :nama="s.nama" :uuid="s.uuid" :foto-path="s.fotoPath" kind="students" size="sm" />
                            <span class="min-w-0 flex-1">
                                <span class="block text-sm font-medium text-gray-800 truncate">{{ s.nama }}</span>
                                <span class="block text-xs text-gray-500">NISN {{ s.nisn || "–" }}</span>
                            </span>
                            <span v-if="s.sudahNaik" class="text-[11px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                Sudah diproses {{ preview.tahunAjaran }}
                            </span>
                            <span v-else-if="!selected.has(s.id)" class="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                                Tinggal kelas
                            </span>
                        </label>
                    </li>
                </ul>
            </template>
        </div>

        <!-- 3. Konfirmasi -->
        <form v-else-if="step === 'konfirmasi' && preview" novalidate class="space-y-4" @submit.prevent="submit">
            <div class="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700 space-y-1">
                <p>
                    <b>{{ selected.size }} siswa</b> {{ preview.asal }}
                    {{ preview.target.lulus ? "akan diluluskan (status menjadi nonaktif)" : `akan naik ke ${preview.target.label}` }}.
                </p>
                <p v-if="eligible.length - selected.size > 0" class="text-amber-700">
                    {{ eligible.length - selected.size }} siswa tinggal kelas (tidak diproses).
                </p>
                <p class="text-xs text-gray-500">Tercatat di histori kelas tahun ajaran {{ preview.tahunAjaran }}.</p>
            </div>
            <div>
                <label for="pm-reason" class="block text-sm font-medium mb-1 text-gray-600">Alasan / keterangan *</label>
                <input
                    id="pm-reason"
                    v-model="reason"
                    maxlength="255"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    :class="reasonError ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-400'"
                />
                <p v-if="reasonError" class="text-red-600 text-xs mt-1">{{ reasonError }}</p>
            </div>
        </form>

        <!-- Hasil -->
        <div v-else-if="step === 'hasil' && result" class="space-y-4">
            <div
                class="rounded-lg px-4 py-3 text-sm"
                :class="result.processed ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-50 border border-gray-200 text-gray-700'"
            >
                {{ result.message }}
            </div>
            <SiswaSkippedList :items="result.skipped" />
        </div>

        <!-- Tombol -->
        <div class="flex justify-between gap-2 pt-4 mt-5 border-t border-gray-100">
            <button
                v-if="step === 'siswa' || step === 'konfirmasi'"
                type="button"
                :disabled="isSaving"
                class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                @click="back"
            >
                Kembali
            </button>
            <button
                v-else-if="step === 'hasil'"
                type="button"
                class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                @click="reset"
            >
                Proses kelas lain
            </button>
            <span v-else></span>

            <button
                v-if="step === 'siswa'"
                type="button"
                :disabled="!selected.size"
                class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                @click="step = 'konfirmasi'"
            >
                Lanjut ({{ selected.size }} siswa)
            </button>
            <button
                v-else-if="step === 'konfirmasi'"
                type="button"
                :disabled="isSaving"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                :class="preview?.target.lulus ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'"
                @click="submit"
            >
                <span v-if="isSaving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ isSaving ? "Memproses..." : preview?.target.lulus ? "Luluskan Siswa" : "Proses Naik Kelas" }}
            </button>
            <button
                v-else-if="step === 'hasil'"
                type="button"
                class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                @click="close"
            >
                Selesai
            </button>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import type { Gender, Jenjang, SkippedStudent } from "~/types/student";

interface PromotePreview {
    tahunAjaran: string;
    asal: string;
    target: { lulus: boolean; label: string };
    students: {
        id: number;
        uuid: string;
        nama: string;
        nisn: string | null;
        gender: Gender;
        fotoPath: string | null;
        sudahNaik: boolean;
    }[];
}
interface PromoteResult {
    processed: number;
    skipped: SkippedStudent[];
    message: string;
}

const props = defineProps<{ open: boolean }>();
// done = ada siswa yang diproses -> daftar perlu dimuat ulang
const emit = defineEmits<{ close: [changed: boolean] }>();

const toast = useToast();
const api = useApi();

const STEPS = ["Pilih kelas", "Pilih siswa", "Konfirmasi"];
type Step = "pilih" | "siswa" | "konfirmasi" | "hasil";
const step = ref<Step>("pilih");
const stepNumber = computed(() => ({ pilih: 1, siswa: 2, konfirmasi: 3, hasil: 3 })[step.value]);

const source = ref<{ jenjang: Jenjang; kelas: string } | null>(null);
const preview = ref<PromotePreview | null>(null);
const selected = ref(new Set<number>());
const reason = ref("");
const reasonError = ref("");
const isSaving = ref(false);
const result = ref<PromoteResult | null>(null);
const changed = ref(false);

const subtitle = computed(() =>
    preview.value && step.value !== "pilih"
        ? `${preview.value.asal} → ${preview.value.target.label}`
        : "Naikkan siswa satu kelas sekaligus",
);

const eligible = computed(() => preview.value?.students.filter((s) => !s.sudahNaik) ?? []);
const allSelected = computed(() => eligible.value.length > 0 && selected.value.size === eligible.value.length);
const someSelected = computed(() => selected.value.size > 0 && !allSelected.value);

function targetLabel(jenjang: Jenjang, kelas: string) {
    const next = nextKelas(jenjang, kelas);
    return next === "lulus" ? "Lulus" : next ? formatKelas(next.jenjang, next.kelas) : "";
}

function reset() {
    step.value = "pilih";
    source.value = null;
    preview.value = null;
    selected.value = new Set();
    reason.value = "";
    reasonError.value = "";
    result.value = null;
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            reset();
            changed.value = false;
        }
    },
);

async function pickKelas(jenjang: Jenjang, kelas: string) {
    try {
        const res = await api<PromotePreview>("/api/students/promote-preview", {
            query: { jenjang, kelas },
        });
        source.value = { jenjang, kelas };
        preview.value = res;
        selected.value = new Set(res.students.filter((s) => !s.sudahNaik).map((s) => s.id));
        reason.value = res.target.lulus
            ? `Lulus tahun ajaran ${res.tahunAjaran}`
            : `Kenaikan kelas tahun ajaran ${res.tahunAjaran}`;
        step.value = "siswa";
    } catch (err) {
        toast.error("Gagal memuat siswa", getErrorMessage(err));
    }
}

function toggle(id: number) {
    const next = new Set(selected.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected.value = next;
}

function toggleAll() {
    selected.value = allSelected.value ? new Set() : new Set(eligible.value.map((s) => s.id));
}

function back() {
    step.value = step.value === "konfirmasi" ? "siswa" : "pilih";
}

async function submit() {
    if (!source.value || isSaving.value) return;
    reasonError.value = reason.value.trim().length < 3 ? "Alasan wajib diisi (minimal 3 karakter)." : "";
    if (reasonError.value) return;

    isSaving.value = true;
    try {
        const res = await api<PromoteResult>("/api/students/promote", {
            method: "POST",
            body: { ...source.value, studentIds: [...selected.value], reason: reason.value },
        });
        result.value = res;
        step.value = "hasil";
        if (res.processed) {
            changed.value = true;
            toast.success("Naik kelas selesai", res.message);
        }
    } catch (err) {
        reasonError.value = getFieldErrors(err).reason ?? "";
        if (!reasonError.value) toast.error("Gagal memproses naik kelas", getErrorMessage(err));
    } finally {
        isSaving.value = false;
    }
}

function close() {
    if (!isSaving.value) emit("close", changed.value);
}
</script>
