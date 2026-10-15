<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition-opacity duration-150"
            leave-active-class="transition-opacity duration-150"
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
        >
            <!-- Layar diredupkan & semua klik ditahan selama request ke server berjalan -->
            <div
                v-if="isLoading"
                class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center cursor-wait"
                role="status"
                aria-live="polite"
                @click.stop.prevent
            >
                <div class="flex flex-col items-center gap-3">
                    <div
                        class="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                    <p class="text-sm text-white font-medium drop-shadow">Memuat...</p>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
const { isLoading } = useLoading();
</script>
