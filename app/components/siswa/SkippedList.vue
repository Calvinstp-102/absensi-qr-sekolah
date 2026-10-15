<template>
    <!-- Daftar siswa yang dilewati pada aksi massal, beserta alasannya -->
    <div v-if="items.length" class="border border-amber-200 bg-amber-50 rounded-lg">
        <p class="px-3 py-2 text-sm font-medium text-amber-800 border-b border-amber-200">
            {{ items.length }} siswa dilewati
        </p>
        <ul class="max-h-48 overflow-y-auto divide-y divide-amber-100 text-sm">
            <li v-for="s in items" :key="s.id" class="px-3 py-2">
                <span class="font-medium text-gray-800">{{ s.nama }}</span>
                <span class="block text-xs text-amber-700">{{ s.alasan }}</span>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import type { SkippedStudent } from "~/types/student";

defineProps<{ items: SkippedStudent[] }>();
</script>
