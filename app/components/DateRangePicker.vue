<template>
    <div class="relative">
        <button
            @click="open = !open"
            class="flex items-center gap-2 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm hover:border-gray-300 shadow-sm"
        >
            <svg
                class="w-4 h-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
            >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {{ label }}
            <svg
                class="w-3.5 h-3.5 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path d="M6 9l6 6 6-6" />
            </svg>
        </button>

        <div
            v-if="open"
            class="absolute right-0 z-20 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-60"
        >
            <button
                v-for="opt in presets"
                :key="opt.key"
                @click="selectPreset(opt)"
                class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50"
                :class="{
                    'bg-primary-50 text-primary-700 font-medium':
                        activePreset === opt.key,
                }"
            >
                {{ opt.label }}
            </button>
            <button
                @click="
                    activePreset = 'custom';
                    showCustom = true;
                "
                class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50"
                :class="{
                    'bg-primary-50 text-primary-700 font-medium':
                        activePreset === 'custom',
                }"
            >
                Custom
            </button>

            <div v-if="showCustom" class="p-2 border-t mt-1 space-y-2">
                <input
                    type="date"
                    v-model="customFrom"
                    class="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                />
                <input
                    type="date"
                    v-model="customTo"
                    class="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                />
                <button
                    @click="applyCustom"
                    class="w-full bg-primary-600 text-white rounded py-1.5 text-sm hover:bg-primary-700"
                >
                    Terapkan
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";

const emit = defineEmits<{
    change: [{ from: string; to: string; label: string }];
}>();

const open = ref(false);
const showCustom = ref(false);
const activePreset = ref("today");
const label = ref("Hari Ini");
const customFrom = ref(dayjs().format("YYYY-MM-DD"));
const customTo = ref(dayjs().format("YYYY-MM-DD"));

const presets = [
    { key: "today", label: "Hari Ini" },
    { key: "yesterday", label: "Kemarin" },
    { key: "last_week", label: "Minggu Lalu" },
    { key: "this_month", label: "Bulan Ini" },
    { key: "last_month", label: "Bulan Lalu" },
    { key: "this_year", label: "Tahun Ini" },
    { key: "last_year", label: "Tahun Lalu" },
];

function rangeFor(key: string) {
    const now = dayjs();
    switch (key) {
        case "today":
            return [now.startOf("day"), now.endOf("day")];
        case "yesterday": {
            const y = now.subtract(1, "day");
            return [y.startOf("day"), y.endOf("day")];
        }
        case "last_week": {
            const lw = now.subtract(1, "week");
            return [lw.startOf("week"), lw.endOf("week")];
        }
        case "this_month":
            return [now.startOf("month"), now.endOf("month")];
        case "last_month": {
            const lm = now.subtract(1, "month");
            return [lm.startOf("month"), lm.endOf("month")];
        }
        case "this_year":
            return [now.startOf("year"), now.endOf("year")];
        case "last_year": {
            const ly = now.subtract(1, "year");
            return [ly.startOf("year"), ly.endOf("year")];
        }
        default:
            return [now.startOf("day"), now.endOf("day")];
    }
}

function selectPreset(opt: { key: string; label: string }) {
    activePreset.value = opt.key;
    showCustom.value = false;
    label.value = opt.label;
    const [from, to] = rangeFor(opt.key);
    open.value = false;
    emit("change", {
        from: from.format("YYYY-MM-DD"),
        to: to.format("YYYY-MM-DD"),
        label: opt.label,
    });
}

function applyCustom() {
    label.value = `${dayjs(customFrom.value).format("DD MMM")} - ${dayjs(customTo.value).format("DD MMM YYYY")}`;
    open.value = false;
    emit("change", {
        from: customFrom.value,
        to: customTo.value,
        label: label.value,
    });
}

onMounted(() => selectPreset(presets[0]));
</script>
