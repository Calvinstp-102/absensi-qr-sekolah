<template>
    <div
        class="min-h-screen relative flex items-center justify-center bg-primary-700 px-4 overflow-hidden"
    >
        <div
            class="absolute inset-0 bg-cover bg-center opacity-15"
            style="background-image: url(&quot;/images/bg-yayasan.png&quot;)"
        ></div>

        <div class="relative z-10 w-full max-w-sm">
            <div class="text-center mb-6">
                <img
                    src="/images/logo-advent.png"
                    alt="Logo Pendidikan Advent"
                    class="w-16 h-16 mx-auto mb-3"
                />
                <p
                    class="text-white font-heading font-bold text-lg leading-snug"
                >
                    Yayasan Pendidikan Adventus Serang
                </p>
            </div>

            <form
                @submit.prevent="handleLogin"
                class="bg-white p-8 rounded-xl shadow-lg w-full"
            >
                <h1 class="text-xl font-heading font-bold mb-6 text-gray-800">
                    Login Guru
                </h1>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1 text-gray-600"
                        >Email</label
                    >
                    <input
                        v-model="email"
                        type="email"
                        required
                        class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1 text-gray-600"
                        >Password</label
                    >
                    <input
                        v-model="password"
                        type="password"
                        required
                        class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>

                <p v-if="errorMessage" class="text-red-600 text-sm mb-4">
                    {{ errorMessage }}
                </p>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {{ isLoading ? "Memproses..." : "Login" }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);

async function handleLogin() {
    errorMessage.value = "";
    isLoading.value = true;

    try {
        await $fetch("/api/auth/login", {
            method: "POST",
            body: { email: email.value, password: password.value },
        });
        await navigateTo("/");
    } catch (err: any) {
        errorMessage.value = err?.data?.statusMessage || "Login gagal";
    } finally {
        isLoading.value = false;
    }
}
</script>
