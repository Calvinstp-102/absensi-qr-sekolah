<template>
    <div
        class="relative w-14 h-14 shrink-0 rounded-full"
        :style="{ background: ringBackground }"
    >
        <div
            class="absolute inset-[3px] rounded-full bg-white flex items-center justify-center"
        >
            <span class="text-[11px] font-bold font-heading" :style="{ color }"
                >{{ percent }}%</span
            >
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ value: number; total: number; color: string }>();

const percent = computed(() =>
    props.total > 0 ? Math.round((props.value / props.total) * 100) : 0,
);
const ringBackground = computed(() => {
    const deg = percent.value * 3.6;
    return `conic-gradient(${props.color} ${deg}deg, #e5e7eb ${deg}deg 360deg)`;
});
</script>
