<template>
    <Teleport to="body">
        <div
            v-if="state.show"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        >
            <div
                class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
            >
                <div
                    class="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
                    :class="state.danger ? 'bg-red-100' : 'bg-primary-100'"
                >
                    <svg
                        v-if="state.danger"
                        class="w-6 h-6 text-red-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.14A2 2 0 004 21h16a2 2 0 001.89-2.99L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                    </svg>
                    <svg
                        v-else
                        class="w-6 h-6 text-primary-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                    </svg>
                </div>
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-1">
                    {{ state.title }}
                </h2>
                <p class="text-sm text-gray-500 mb-5">{{ state.message }}</p>
                <div class="flex gap-2">
                    <button
                        @click="handleCancel"
                        class="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Batal
                    </button>
                    <button
                        @click="handleConfirm"
                        class="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
                        :class="
                            state.danger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-primary-600 hover:bg-primary-700'
                        "
                    >
                        {{ state.confirmText }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
const { state } = useConfirm();

function handleConfirm() {
    state.value.resolve?.(true);
    state.value.show = false;
}
function handleCancel() {
    state.value.resolve?.(false);
    state.value.show = false;
}
</script>
