<template>
    <div ref="root" class="relative">
        <button
            type="button"
            class="flex items-center gap-2 border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-gray-400 shadow-sm"
            :aria-expanded="open"
            @click="open = !open"
        >
            <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span class="font-medium">{{ presetLabel }}</span>
            <span class="text-gray-400 hidden sm:inline">· {{ rentangLabel }}</span>
            <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
            </svg>
        </button>

        <div
            v-if="open"
            class="absolute left-0 z-30 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-2"
        >
            <button
                v-for="p in presets"
                :key="p.key"
                type="button"
                class="w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50"
                :class="{ 'bg-primary-50 text-primary-700 font-medium': modelValue.preset === p.key }"
                @click="pilih(p.key)"
            >
                {{ p.label }}
                <span class="text-xs text-gray-400 font-normal">{{ rentang(p.from, p.to) }}</span>
            </button>
            <div class="border-t border-gray-100 mt-1 pt-2 px-1 space-y-2">
                <p class="text-xs font-medium text-gray-500 px-2">Kustom (maks. 366 hari)</p>
                <div class="grid grid-cols-2 gap-2">
                    <input v-model="kustom.from" type="date" :max="today" aria-label="Tanggal awal" class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <input v-model="kustom.to" type="date" :max="today" aria-label="Tanggal akhir" class="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <p v-if="kustomError" class="text-xs text-red-600 px-1">{{ kustomError }}</p>
                <button
                    type="button"
                    class="w-full bg-primary-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-primary-700"
                    @click="terapkanKustom"
                >
                    Terapkan
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Periode } from "~/types/report";

const props = defineProps<{
    modelValue: Periode;
    /** Hari ini WIB "YYYY-MM-DD" */
    today: string;
    tahunAjaran: { label: string; awal: number; akhir: number } | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: Periode] }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const kustom = reactive({ from: props.modelValue.from, to: props.modelValue.to });
const kustomError = ref("");

const presets = computed(() => buatPresetPeriode(props.today, props.tahunAjaran));
const presetLabel = computed(() => presets.value.find((p) => p.key === props.modelValue.preset)?.label ?? "Kustom");
const rentangLabel = computed(() => rentang(props.modelValue.from, props.modelValue.to));

function rentang(from: string, to: string) {
    const fmt = (t: string, tahun: boolean) =>
        new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", {
            timeZone: "UTC",
            day: "numeric",
            month: "short",
            ...(tahun ? { year: "numeric" } : {}),
        });
    if (from === to) return fmt(from, true);
    return `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to, true)}`;
}

function pilih(key: string) {
    const p = presets.value.find((x) => x.key === key)!;
    emit("update:modelValue", { preset: key, from: p.from, to: p.to });
    open.value = false;
}

function terapkanKustom() {
    kustomError.value = "";
    if (!kustom.from || !kustom.to) return (kustomError.value = "Isi tanggal awal dan akhir.");
    if (kustom.from > kustom.to) return (kustomError.value = "Tanggal awal tidak boleh setelah tanggal akhir.");
    if (kustom.to > props.today) return (kustomError.value = "Tanggal akhir tidak boleh setelah hari ini.");
    const hari = Math.round((Date.parse(kustom.to) - Date.parse(kustom.from)) / 86_400_000) + 1;
    if (hari > 366) return (kustomError.value = "Periode maksimal 366 hari.");
    emit("update:modelValue", { preset: "kustom", from: kustom.from, to: kustom.to });
    open.value = false;
}

watch(open, (o) => {
    if (o) {
        kustom.from = props.modelValue.from;
        kustom.to = props.modelValue.to;
        kustomError.value = "";
    }
});

function onClickOutside(e: MouseEvent) {
    if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener("mousedown", onClickOutside));
onBeforeUnmount(() => document.removeEventListener("mousedown", onClickOutside));
</script>
