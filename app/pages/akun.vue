<template>
    <div class="max-w-3xl">
        <h1 class="text-2xl font-heading font-bold text-gray-800 mb-1">
            Akun Saya
        </h1>
        <p class="text-gray-500 text-sm mb-6">
            Informasi akun dan keamanan login Anda
        </p>

        <div class="space-y-6">
            <!-- Profil -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div v-if="pending" class="flex items-center gap-4 animate-pulse">
                    <div class="w-16 h-16 rounded-full bg-gray-200"></div>
                    <div class="space-y-2 flex-1">
                        <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>

                <div
                    v-else-if="loadError"
                    class="text-sm text-red-600 flex items-center justify-between gap-3"
                >
                    <span>{{ loadError }}</span>
                    <button
                        type="button"
                        class="text-primary-600 font-medium hover:underline"
                        @click="refresh()"
                    >
                        Coba lagi
                    </button>
                </div>

                <div v-else-if="me" class="flex flex-col sm:flex-row gap-5">
                    <div class="flex items-center gap-4 sm:w-1/2">
                        <div class="relative shrink-0">
                            <UserAvatar
                                :nama="me.nama"
                                :uuid="me.uuid"
                                :foto-path="me.fotoPath"
                                size="lg"
                                color-class="bg-primary-600 text-white"
                            />
                            <span
                                v-if="photo.busyUuid.value"
                                class="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center"
                            >
                                <span
                                    class="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"
                                ></span>
                            </span>
                        </div>
                        <div class="min-w-0">
                            <p
                                class="font-heading font-bold text-gray-800 truncate"
                            >
                                {{ me.nama }}
                            </p>
                            <span
                                class="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-600"
                            >
                                {{ me.roleLabel }}
                            </span>
                            <div class="flex items-center gap-3 mt-2 text-xs font-medium">
                                <label
                                    class="text-primary-600 hover:underline cursor-pointer"
                                    :class="{ 'pointer-events-none opacity-50': photo.busyUuid.value }"
                                >
                                    {{ me.fotoPath ? "Ganti foto" : "Unggah foto" }}
                                    <input
                                        type="file"
                                        :accept="PHOTO_ACCEPT"
                                        class="hidden"
                                        @change="onPhotoSelected"
                                    />
                                </label>
                                <button
                                    v-if="me.fotoPath"
                                    type="button"
                                    class="text-red-600 hover:underline disabled:opacity-50"
                                    :disabled="!!photo.busyUuid.value"
                                    @click="removePhoto"
                                >
                                    Hapus foto
                                </button>
                            </div>
                            <p class="text-[11px] text-gray-400 mt-1">
                                JPG, PNG, atau WEBP · maks. 2 MB
                            </p>
                        </div>
                    </div>
                    <dl class="grid grid-cols-1 gap-2 text-sm sm:w-1/2">
                        <div>
                            <dt class="text-gray-400 text-xs">Email</dt>
                            <dd class="text-gray-700 break-all">
                                {{ me.email }}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-gray-400 text-xs">No. HP</dt>
                            <dd class="text-gray-700">{{ me.noHp || "-" }}</dd>
                        </div>
                        <div>
                            <dt class="text-gray-400 text-xs">Login saat ini</dt>
                            <dd class="text-gray-700">
                                {{ formatDateTime(me.session.loggedInAt) }}
                                <span class="text-gray-400">
                                    ({{
                                        me.session.remember
                                            ? "diingat 30 hari"
                                            : "berlaku 12 jam"
                                    }})
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt class="text-gray-400 text-xs">Login terakhir (semua perangkat)</dt>
                            <dd class="text-gray-700">
                                {{ formatDateTime(me.lastLoginAt) }}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            <!-- Ganti Password -->
            <form
                novalidate
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
                @submit.prevent="handleChangePassword"
            >
                <div class="flex items-center gap-2 mb-4">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-4 h-4 text-primary-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            Ganti Password
                        </p>
                        <p class="text-xs text-gray-400">
                            Setelah diganti, login di perangkat lain akan
                            otomatis dikeluarkan
                        </p>
                    </div>
                </div>

                <div class="space-y-4 max-w-md">
                    <PasswordInput
                        id="currentPassword"
                        v-model="pw.currentPassword"
                        label="Password saat ini"
                        autocomplete="current-password"
                        :error="pwErrors.currentPassword"
                    />

                    <PasswordInput
                        id="newPassword"
                        v-model="pw.newPassword"
                        label="Password baru"
                        autocomplete="new-password"
                        :error="pwErrors.newPassword"
                    >
                        <div v-if="pw.newPassword" class="mt-2">
                            <div class="flex gap-1">
                                <div
                                    v-for="i in 4"
                                    :key="i"
                                    class="h-1.5 flex-1 rounded-full"
                                    :class="
                                        i <= strength.score
                                            ? strength.color
                                            : 'bg-gray-200'
                                    "
                                ></div>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">
                                Kekuatan: {{ strength.label }}
                            </p>
                        </div>
                        <ul class="mt-2 space-y-0.5 text-xs">
                            <li
                                v-for="rule in rules"
                                :key="rule.label"
                                class="flex items-center gap-1.5"
                                :class="
                                    rule.ok ? 'text-green-600' : 'text-gray-400'
                                "
                            >
                                <svg
                                    class="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path v-if="rule.ok" d="M5 12l5 5L20 7" />
                                    <circle v-else cx="12" cy="12" r="4" />
                                </svg>
                                {{ rule.label }}
                            </li>
                        </ul>
                    </PasswordInput>

                    <PasswordInput
                        id="confirmPassword"
                        v-model="pw.confirmPassword"
                        label="Ulangi password baru"
                        autocomplete="new-password"
                        :error="pwErrors.confirmPassword"
                    />

                    <div class="pt-1">
                        <button
                            type="submit"
                            :disabled="isSaving"
                            class="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            <span
                                v-if="isSaving"
                                class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                            ></span>
                            {{ isSaving ? "Menyimpan..." : "Simpan Password" }}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
useHead({ title: "Akun Saya" });

const toast = useToast();
const api = useApi();
const { fetch: refreshSession } = useUserSession();

const { data: me, pending, error, refresh } = await useApiFetch("/api/auth/me");
const loadError = computed(() =>
    error.value ? getErrorMessage(error.value, "Gagal memuat data akun.") : "",
);

// --- Foto profil
const photo = useTeacherPhoto();
const { confirm } = useConfirm();

async function onPhotoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ""; // agar file yang sama bisa dipilih lagi
    if (!file || !me.value) return;
    if (await photo.upload(me.value.uuid, file)) await refresh();
}

async function removePhoto() {
    if (!me.value) return;
    const ok = await confirm({
        title: "Hapus Foto",
        message: "Hapus foto profil Anda? Inisial nama akan ditampilkan sebagai gantinya.",
        confirmText: "Ya, Hapus Foto",
        danger: true,
    });
    if (ok && (await photo.remove(me.value.uuid))) await refresh();
}

function formatDateTime(value: number | string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

// --- Ganti password
const pw = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
const pwErrors = ref<Record<string, string>>({});
const isSaving = ref(false);

const rules = computed(() => checkPassword(pw.newPassword));
const strength = computed(() => passwordStrength(pw.newPassword));

// Hapus error field begitu user mulai memperbaiki
watch(
    () => ({ ...pw }),
    (now, prev) => {
        for (const key of Object.keys(now) as (keyof typeof pw)[]) {
            if (now[key] !== prev[key] && pwErrors.value[key]) {
                const { [key]: _, ...rest } = pwErrors.value;
                pwErrors.value = rest;
            }
        }
    },
);

function validateClient() {
    const e: Record<string, string> = {};
    if (!pw.currentPassword) e.currentPassword = "Password saat ini wajib diisi.";
    if (!pw.newPassword) e.newPassword = "Password baru wajib diisi.";
    else if (!rules.value.every((r) => r.ok))
        e.newPassword = "Password baru belum memenuhi semua syarat.";
    else if (pw.newPassword === pw.currentPassword)
        e.newPassword = "Password baru tidak boleh sama dengan password saat ini.";
    if (!pw.confirmPassword)
        e.confirmPassword = "Konfirmasi password wajib diisi.";
    else if (pw.confirmPassword !== pw.newPassword)
        e.confirmPassword = "Konfirmasi password tidak sama dengan password baru.";
    pwErrors.value = e;
    return Object.keys(e).length === 0;
}

async function handleChangePassword() {
    if (!validateClient()) return;
    isSaving.value = true;
    try {
        const res = await api("/api/auth/change-password", {
            method: "POST",
            body: { ...pw },
        });
        toast.success("Password berhasil diganti", res.message);
        pw.currentPassword = "";
        pw.newPassword = "";
        pw.confirmPassword = "";
        await refreshSession();
        await refresh();
    } catch (err: any) {
        pwErrors.value = getFieldErrors(err);
        if (!Object.keys(pwErrors.value).length) {
            toast.error(
                "Gagal mengganti password",
                getErrorMessage(err, "Silakan coba lagi."),
            );
        }
    } finally {
        isSaving.value = false;
    }
}
</script>
