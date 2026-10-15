<template>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" :class="items.length >= 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'">
        <div v-for="it in items" :key="it.label" class="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p class="text-xs font-medium text-gray-500">{{ it.label }}</p>
            <p class="text-xl font-heading font-bold mt-0.5" :class="it.color ?? 'text-gray-800'">{{ it.value }}</p>
            <p v-if="it.hint" class="text-[11px] text-gray-400 mt-0.5">{{ it.hint }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ items: { label: string; value: string; hint?: string; color?: string }[] }>();
</script>
