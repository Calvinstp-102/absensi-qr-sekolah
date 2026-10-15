<template>
    <div
        class="min-h-screen relative flex flex-col items-center justify-center bg-primary-700 px-4 py-10 overflow-hidden"
    >
        <div
            class="absolute inset-0 bg-cover bg-center opacity-15"
            style="background-image: url('/images/bg-yayasan.png')"
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
                <p class="text-primary-100 text-sm mt-1">Sistem Absensi QR</p>
            </div>

            <form
                novalidate
                class="bg-white p-8 rounded-xl shadow-lg w-full"
                @submit.prevent="handleLogin"
            >
                <h1 class="text-xl font-heading font-bold text-gray-800">
                    Login Guru
                </h1>
                <p class="text-sm text-gray-500 mb-6">
                    Masuk menggunakan akun yang diberikan sekolah.
                </p>

                <!-- Info: datang dari sesi yang berakhir -->
                <div
                    v-if="infoMessage && !errorMessage"
                    class="flex gap-2 items-start bg-primary-50 text-primary-600 text-sm rounded-lg px-3 py-2.5 mb-4"
                    role="status"
                >
                    <svg
                        class="w-4 h-4 mt-0.5 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span>{{ infoMessage }}</span>
                </div>

                <!-- Error umum -->
                <div
                    v-if="errorMessage"
                    class="flex gap-2 items-start bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4"
                    role="alert"
                >
                    <svg
                        class="w-4 h-4 mt-0.5 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <span>{{ errorMessage }}</span>
                </div>

                <div class="mb-4">
                    <label
                        for="email"
                        class="block text-sm font-medium mb-1 text-gray-600"
                        >Email</label
                    >
                    <input
                        id="email"
                        ref="emailInput"
                        v-model="form.email"
                        type="email"
                        inputmode="email"
                        autocomplete="username"
                        placeholder="nama@sekolah.com"
                        :aria-invalid="!!fieldErrors.email"
                        :aria-describedby="
                            fieldErrors.email ? 'email-error' : undefined
                        "
                        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                        :class="
                            fieldErrors.email
                                ? 'border-red-400 focus:ring-red-300'
                                : 'border-gray-200 focus:ring-primary-400'
                        "
                        @input="clearFieldError('email')"
                    />
                    <p
                        v-if="fieldErrors.email"
                        id="email-error"
                        class="text-red-600 text-xs mt-1"
                    >
                        {{ fieldErrors.email }}
                    </p>
                </div>

                <div class="mb-4">
                    <label
                        for="password"
                        class="block text-sm font-medium mb-1 text-gray-600"
                        >Password</label
                    >
                    <div class="relative">
                        <input
                            id="password"
                            v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="current-password"
                            :aria-invalid="!!fieldErrors.password"
                            :aria-describedby="
                                fieldErrors.password
                                    ? 'password-error'
                                    : undefined
                            "
                            class="w-full border rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2"
                            :class="
                                fieldErrors.password
                                    ? 'border-red-400 focus:ring-red-300'
                                    : 'border-gray-200 focus:ring-primary-400'
                            "
                            @input="clearFieldError('password')"
                            @keydown="detectCapsLock"
                            @keyup="detectCapsLock"
                            @blur="capsLockOn = false"
                        />
                        <button
                            type="button"
                            class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                            :aria-label="
                                showPassword
                                    ? 'Sembunyikan password'
                                    : 'Tampilkan password'
                            "
                            @click="showPassword = !showPassword"
                        >
                            <svg
                                class="w-[18px] h-[18px]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <template v-if="showPassword">
                                    <path
                                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24"
                                    />
                                    <path d="M1 1l22 22" />
                                </template>
                                <template v-else>
                                    <path
                                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                    />
                                    <circle cx="12" cy="12" r="3" />
                                </template>
                            </svg>
                        </button>
                    </div>
                    <p
                        v-if="fieldErrors.password"
                        id="password-error"
                        class="text-red-600 text-xs mt-1"
                    >
                        {{ fieldErrors.password }}
                    </p>
                    <p
                        v-else-if="capsLockOn"
                        class="text-accent-600 text-xs mt-1 flex items-center gap-1"
                    >
                        <svg
                            class="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M12 9v4M12 17h.01" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                        Caps Lock sedang aktif
                    </p>
                </div>

                <div class="flex items-center justify-between mb-6">
                    <label
                        class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none"
                    >
                        <input
                            v-model="form.remember"
                            type="checkbox"
                            class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                        />
                        Ingat saya (30 hari)
                    </label>
                </div>

                <button
                    type="submit"
                    :disabled="isSubmitting || lockSeconds > 0"
                    class="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed font-medium transition-colors"
                >
                    <span
                        v-if="isSubmitting"
                        class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    ></span>
                    <template v-if="lockSeconds > 0">
                        Coba lagi dalam {{ lockCountdown }}
                    </template>
                    <template v-else>
                        {{ isSubmitting ? "Memproses..." : "Masuk" }}
                    </template>
                </button>

                <p class="text-xs text-gray-500 text-center mt-5">
                    Lupa password? Hubungi admin atau superadmin sekolah untuk
                    mengatur ulang password Anda.
                </p>
            </form>

            <p class="text-center text-xs text-primary-100/80 mt-6">
                &copy; {{ new Date().getFullYear() }} Yayasan Pendidikan Adventus
                Serang
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });
useHead({ title: "Login" });

const route = useRoute();
const { fetch: refreshSession } = useUserSession();
const api = useApi();

const form = reactive({ email: "", password: "", remember: false });
const fieldErrors = ref<Record<string, string>>({});
const errorMessage = ref("");
const isSubmitting = ref(false);
const showPassword = ref(false);
const capsLockOn = ref(false);
const emailInput = ref<HTMLInputElement | null>(null);

const infoMessage = computed(() =>
    route.query.reason === "expired"
        ? "Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan."
        : route.query.redirect
          ? "Silakan login terlebih dahulu untuk membuka halaman tersebut."
          : "",
);

// --- Hitung mundur saat login dikunci sementara (429)
const lockSeconds = ref(0);
let lockTimer: ReturnType<typeof setInterval> | null = null;
const lockCountdown = computed(() => {
    const m = Math.floor(lockSeconds.value / 60);
    const s = lockSeconds.value % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
});

function startLockCountdown(seconds: number) {
    lockSeconds.value = seconds;
    if (lockTimer) clearInterval(lockTimer);
    lockTimer = setInterval(() => {
        lockSeconds.value--;
        if (lockSeconds.value <= 0) {
            clearInterval(lockTimer!);
            lockTimer = null;
            errorMessage.value = "";
        }
    }, 1000);
}

onMounted(() => emailInput.value?.focus());
onBeforeUnmount(() => lockTimer && clearInterval(lockTimer));

function clearFieldError(field: string) {
    if (fieldErrors.value[field]) {
        const { [field]: _, ...rest } = fieldErrors.value;
        fieldErrors.value = rest;
    }
}

function detectCapsLock(e: KeyboardEvent) {
    capsLockOn.value = e.getModifierState?.("CapsLock") ?? false;
}

function validateClient(): boolean {
    const errors: Record<string, string> = {};
    const email = form.email.trim();
    if (!email) errors.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.email = "Format email tidak valid. Contoh: nama@sekolah.com";
    if (!form.password) errors.password = "Password wajib diisi.";
    fieldErrors.value = errors;
    return Object.keys(errors).length === 0;
}

async function handleLogin() {
    errorMessage.value = "";
    if (!validateClient()) return;

    isSubmitting.value = true;
    try {
        await api("/api/auth/login", {
            method: "POST",
            body: {
                email: form.email.trim(),
                password: form.password,
                remember: form.remember,
            },
        });
        await refreshSession();
        await navigateTo(safeRedirect(route.query.redirect), { replace: true });
    } catch (err: any) {
        fieldErrors.value = getFieldErrors(err);
        // Kalau error sudah tampil di bawah field, tidak perlu banner ganda
        errorMessage.value = Object.keys(fieldErrors.value).length
            ? ""
            : getErrorMessage(err, "Login gagal. Silakan coba lagi.");
        const retryAfter = getRetryAfter(err);
        if (retryAfter) startLockCountdown(retryAfter);
        form.password = "";
    } finally {
        isSubmitting.value = false;
    }
}
</script>
