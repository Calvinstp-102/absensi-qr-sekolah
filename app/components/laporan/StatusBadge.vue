<template>
    <span
        class="inline-flex items-center justify-center rounded font-semibold"
        :class="[info.badge, compact ? 'w-6 h-6 text-[11px]' : 'px-2 py-0.5 text-xs gap-1']"
        :title="info.keterangan"
    >
        <template v-if="compact">{{ kode === "-" ? "" : kode }}</template>
        <template v-else>{{ info.label }}<span v-if="menit" class="font-normal">· {{ menit }} mnt</span></template>
    </span>
</template>

<script setup lang="ts">
import type { KodeStatus } from "#shared/utils/attendance-status";

const props = defineProps<{
    kode: KodeStatus;
    /** Kotak kecil berisi kode saja (matriks) */
    compact?: boolean;
    /** Menit terlambat (opsional) */
    menit?: number;
}>();

const info = computed(() => KODE_STATUS[props.kode]);
</script>
