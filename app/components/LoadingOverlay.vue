<template>
    <Teleport to="body">
        <div
            v-if="isLoading"
            class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-[200] flex items-center justify-center"
        >
            <div
                class="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3"
            >
                <div
                    class="w-10 h-10 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"
                ></div>
                <p class="text-sm text-gray-500 font-medium">Memproses...</p>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
const { isLoading } = useLoading();
</script>
