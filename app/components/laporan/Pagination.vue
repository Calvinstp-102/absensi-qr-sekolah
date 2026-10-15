<template>
    <div v-if="total > 0" class="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-gray-100 text-sm">
        <p class="text-xs text-gray-500">
            {{ ((page - 1) * pageSize + 1).toLocaleString("id-ID") }}–{{ Math.min(page * pageSize, total).toLocaleString("id-ID") }}
            dari {{ total.toLocaleString("id-ID") }} baris
        </p>
        <div class="flex items-center gap-1">
            <button
                type="button"
                :disabled="page <= 1"
                class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                @click="emit('update:page', page - 1)"
            >
                Sebelumnya
            </button>
            <span class="px-2 text-xs text-gray-500">{{ page }} / {{ totalPages }}</span>
            <button
                type="button"
                :disabled="page >= totalPages"
                class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                @click="emit('update:page', page + 1)"
            >
                Berikutnya
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ page: number; pageSize: number; total: number; totalPages: number }>();
const emit = defineEmits<{ "update:page": [page: number] }>();
</script>
