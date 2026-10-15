<template>
    <div class="relative w-full" :style="{ height }">
        <canvas ref="canvas" :aria-label="label" role="img" />
    </div>
</template>

<script setup lang="ts">
import {
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
    type ChartData,
    type ChartOptions,
    type ChartType,
} from "chart.js";

// Grafik Chart.js (hanya di browser). Controller yang dipakai saja yang didaftarkan.
Chart.register(
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
);

const props = withDefaults(
    defineProps<{
        type: Extract<ChartType, "bar" | "line" | "doughnut">;
        data: ChartData;
        options?: ChartOptions;
        height?: string;
        /** Deskripsi grafik untuk pembaca layar */
        label: string;
    }>(),
    { height: "260px", options: () => ({}) },
);

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

function baseOptions(): ChartOptions {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, boxHeight: 12, padding: 14, font: { size: 11 } } },
            tooltip: { padding: 10, cornerRadius: 8, titleFont: { size: 12 }, bodyFont: { size: 12 } },
        },
    };
}

/** Gabung opsi dasar + opsi dari props (plugins digabung per kunci). */
function mergedOptions(): ChartOptions {
    const base = baseOptions();
    const o = props.options as ChartOptions;
    return { ...base, ...o, plugins: { ...base.plugins, ...o.plugins } } as ChartOptions;
}

onMounted(() => {
    if (!canvas.value) return;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = "#6b7280";
    chart = new Chart(canvas.value, {
        type: props.type,
        data: structuredClone(toRaw(props.data)) as ChartData,
        options: mergedOptions(),
    });
});

watch(
    () => [props.data, props.options],
    () => {
        if (!chart) return;
        chart.data = structuredClone(toRaw(props.data)) as ChartData;
        chart.options = mergedOptions();
        chart.update();
    },
    { deep: true },
);

onBeforeUnmount(() => {
    chart?.destroy();
    chart = null;
});
</script>
