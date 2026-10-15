<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0"
        >
            <div
                v-if="open"
                class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                @mousedown.self="requestClose"
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="`${id}-title`"
                    class="bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col"
                    :class="widthClass"
                >
                    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
                        <div class="min-w-0">
                            <h2
                                :id="`${id}-title`"
                                class="text-lg font-heading font-bold text-gray-800"
                            >
                                {{ title }}
                            </h2>
                            <p v-if="subtitle" class="text-sm text-gray-500 mt-0.5">
                                {{ subtitle }}
                            </p>
                        </div>
                        <button
                            type="button"
                            class="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                            aria-label="Tutup"
                            :disabled="busy"
                            @click="requestClose"
                        >
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="px-6 pb-6 overflow-y-auto">
                        <slot />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        open: boolean;
        title: string;
        subtitle?: string;
        /** Sedang menyimpan -> modal tidak bisa ditutup */
        busy?: boolean;
        size?: "md" | "lg" | "xl";
    }>(),
    { busy: false, size: "md" },
);
const emit = defineEmits<{ close: [] }>();

const id = useId();
const widthClass = computed(
    () => ({ md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" })[props.size],
);

function requestClose() {
    if (!props.busy) emit("close");
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && props.open) requestClose();
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>
