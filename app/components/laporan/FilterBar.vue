<template>
    <div class="flex flex-wrap items-center gap-2">
        <LaporanPeriodPicker
            v-if="mode === 'periode'"
            :model-value="{ preset: modelValue.preset, from: modelValue.from, to: modelValue.to }"
            :today="scope.today"
            :tahun-ajaran="scope.tahunAjaran"
            @update:model-value="(p) => update(p)"
        />
        <input
            v-else
            :value="modelValue.bulan"
            type="month"
            :max="scope.today.slice(0, 7)"
            aria-label="Pilih bulan"
            class="border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            @change="(e) => onBulan((e.target as HTMLInputElement).value)"
        />

        <select
            :value="kelasValue"
            aria-label="Filter kelas"
            class="border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            @change="(e) => onKelas((e.target as HTMLSelectElement).value)"
        >
            <option value="">{{ scope.wali ? "Semua kelas saya" : "Semua kelas" }}</option>
            <template v-for="g in kelasGroups" :key="g.jenjang">
                <option v-if="!scope.wali" :value="g.jenjang">Semua {{ g.jenjang }}</option>
                <option v-for="k in g.kelas" :key="k.value" :value="k.value">{{ k.label }}</option>
            </template>
        </select>

        <div class="relative flex-1 min-w-[180px] max-w-xs">
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
                v-model="cari"
                type="search"
                placeholder="Cari nama / NIS / NISN"
                aria-label="Cari siswa"
                class="w-full border border-gray-300 bg-white rounded-lg pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
            <input
                type="checkbox"
                :checked="modelValue.statusSiswa === 'semua'"
                class="accent-primary-600"
                @change="(e) => update({ statusSiswa: (e.target as HTMLInputElement).checked ? 'semua' : 'aktif' })"
            />
            Termasuk siswa nonaktif
        </label>
    </div>
</template>

<script setup lang="ts">
import type { Jenjang } from "#shared/utils/kelas";
import type { LaporanState } from "~/types/report";

const props = defineProps<{
    modelValue: LaporanState;
    mode: "periode" | "bulan";
    scope: {
        wali: boolean;
        kelas: { jenjang: Jenjang; kelas: string; label: string }[];
        today: string;
        tahunAjaran: { label: string; awal: number; akhir: number } | null;
    };
}>();
const emit = defineEmits<{ "update:modelValue": [value: LaporanState] }>();

function update(patch: Partial<LaporanState>) {
    emit("update:modelValue", { ...props.modelValue, ...patch });
}

// Pilihan kelas: wali kelas hanya kelasnya, lainnya semua kelas per jenjang
const kelasGroups = computed(() =>
    JENJANG_LIST.map((j) => ({
        jenjang: j,
        kelas: (props.scope.wali ? props.scope.kelas.filter((k) => k.jenjang === j).map((k) => k.kelas) : KELAS_BY_JENJANG[j]).map(
            (k) => ({ value: `${j}|${k}`, label: formatKelas(j, k) }),
        ),
    })).filter((g) => g.kelas.length),
);
const kelasValue = computed(() =>
    props.modelValue.kelas ? `${props.modelValue.jenjang}|${props.modelValue.kelas}` : props.modelValue.jenjang,
);
function onKelas(v: string) {
    const [jenjang = "", kelas = ""] = v.split("|");
    update({ jenjang, kelas });
}
function onBulan(v: string) {
    if (v) update({ bulan: v });
}

// Pencarian: kirim setelah berhenti mengetik
const cari = ref(props.modelValue.q);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(cari, (v) => {
    clearTimeout(timer);
    timer = setTimeout(() => update({ q: v.trim() }), 350);
});
watch(
    () => props.modelValue.q,
    (v) => {
        if (v !== cari.value.trim()) cari.value = v;
    },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>
