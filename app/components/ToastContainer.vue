<template>
    <Teleport to="body">
        <div
            class="fixed top-4 right-4 left-4 sm:left-auto z-[300] flex flex-col gap-2 sm:w-96 pointer-events-none"
            aria-live="polite"
        >
            <TransitionGroup name="toast">
                <div
                    v-for="t in toasts"
                    :key="t.id"
                    :role="t.type === 'error' ? 'alert' : 'status'"
                    class="pointer-events-auto bg-white rounded-xl shadow-lg border-l-4 px-4 py-3 flex items-start gap-3"
                    :class="styles[t.type].border"
                >
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        :class="styles[t.type].iconBg"
                    >
                        <svg
                            class="w-4 h-4"
                            :class="styles[t.type].iconText"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path v-if="t.type === 'success'" d="M5 12l5 5L20 7" />
                            <path
                                v-else-if="t.type === 'error'"
                                d="M18 6L6 18M6 6l12 12"
                            />
                            <path
                                v-else-if="t.type === 'warning'"
                                d="M12 9v4M12 17h.01"
                            />
                            <path v-else d="M12 16v-4M12 8h.01" />
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0 pt-0.5">
                        <p class="text-sm font-semibold text-gray-800">
                            {{ t.title }}
                        </p>
                        <p
                            v-if="t.message"
                            class="text-sm text-gray-500 mt-0.5 break-words"
                        >
                            {{ t.message }}
                        </p>
                    </div>
                    <button
                        type="button"
                        class="text-gray-400 hover:text-gray-600 p-1 -mr-1"
                        aria-label="Tutup notifikasi"
                        @click="dismiss(t.id)"
                    >
                        <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import type { ToastType } from "~/composables/useToast";

const { toasts, dismiss } = useToast();

const styles: Record<
    ToastType,
    { border: string; iconBg: string; iconText: string }
> = {
    success: {
        border: "border-green-500",
        iconBg: "bg-green-100",
        iconText: "text-green-600",
    },
    error: {
        border: "border-red-500",
        iconBg: "bg-red-100",
        iconText: "text-red-600",
    },
    warning: {
        border: "border-accent-500",
        iconBg: "bg-orange-100",
        iconText: "text-accent-600",
    },
    info: {
        border: "border-primary-600",
        iconBg: "bg-primary-100",
        iconText: "text-primary-600",
    },
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateX(1rem);
}
</style>
