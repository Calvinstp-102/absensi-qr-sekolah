<template>
    <div class="font-body text-gray-800">
        <NuxtLoadingIndicator color="#1E3A5F" :height="3" />
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
        <ConfirmDialog />
        <LoadingOverlay />
        <ToastContainer />
    </div>
</template>

<script setup lang="ts">
useHead({
    titleTemplate: (title) =>
        title ? `${title} - Absensi QR Sekolah` : "Absensi QR Sekolah",
});
</script>
