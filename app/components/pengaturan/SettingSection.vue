<template>
    <section
        class="bg-white rounded-xl border shadow-md transition-colors flex flex-col"
        :class="dirty ? 'border-amber-300' : 'border-gray-100'"
        :aria-labelledby="`${id}-title`"
    >
        <form novalidate class="flex flex-col flex-1" @submit.prevent="emit('save')">
            <div class="flex items-start gap-3 p-4 pb-3">
                <div class="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <svg
                        class="w-[18px] h-[18px] text-primary-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path v-for="d in icon" :key="d" :d="d" />
                    </svg>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 :id="`${id}-title`" class="text-sm font-semibold text-gray-800">{{ title }}</h2>
                        <span
                            v-if="dirty"
                            class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium"
                        >
                            Belum disimpan
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">{{ subtitle }}</p>
                </div>
            </div>

            <div class="px-4 pb-4 flex-1">
                <slot />
            </div>

            <div
                class="flex items-center justify-between gap-2 flex-wrap px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 rounded-b-xl"
            >
                <p class="text-xs text-gray-400">
                    <template v-if="meta?.dateModified">
                        Terakhir diubah
                        <template v-if="meta.updatedBy">oleh <span class="text-gray-500">{{ meta.updatedBy }}</span></template>
                        · {{ formatTanggalWaktu(meta.dateModified) }}
                    </template>
                    <template v-else>Belum pernah diubah</template>
                </p>
                <div class="flex items-center gap-2 ml-auto">
                    <button
                        type="button"
                        :disabled="!dirty || saving"
                        class="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                        @click="emit('reset')"
                    >
                        Batalkan
                    </button>
                    <button
                        type="submit"
                        :disabled="!dirty || saving"
                        class="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-40 shadow-sm flex items-center gap-1.5"
                    >
                        <svg
                            v-if="saving"
                            class="w-4 h-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M21 12a9 9 0 11-6.2-8.56" />
                        </svg>
                        {{ saving ? "Menyimpan..." : "Simpan" }}
                    </button>
                </div>
            </div>
        </form>
    </section>
</template>

<script setup lang="ts">
defineProps<{
    title: string;
    subtitle: string;
    /** Path SVG ikon (viewBox 24) */
    icon: string[];
    dirty: boolean;
    saving: boolean;
    meta?: { updatedBy: string | null; dateModified: string | null } | null;
}>();
const emit = defineEmits<{ save: []; reset: [] }>();
const id = useId();
</script>
