<template>
    <BaseModal
        :open="!!teacher"
        title="Reset Password"
        :subtitle="teacher ? `Buat password baru untuk ${teacher.nama}` : ''"
        :busy="isSaving"
        @close="emit('close')"
    >
        <form novalidate class="space-y-4" @submit.prevent="submit">
            <div
                class="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5"
            >
                <svg class="w-4 h-4 shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.14A2 2 0 004 21h16a2 2 0 001.89-2.99L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>
                    Guru ini akan <b>keluar dari semua perangkat</b> dan harus login
                    dengan password baru. Berikan password baru secara langsung kepada guru.
                </span>
            </div>

            <PasswordInput
                id="rp-new"
                v-model="form.newPassword"
                label="Password baru"
                autocomplete="new-password"
                :error="errors.newPassword"
            >
                <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <li
                            v-for="rule in rules"
                            :key="rule.label"
                            class="flex items-center gap-1"
                            :class="rule.ok ? 'text-green-600' : 'text-gray-400'"
                        >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path v-if="rule.ok" d="M5 12l5 5L20 7" />
                                <circle v-else cx="12" cy="12" r="4" />
                            </svg>
                            {{ rule.label }}
                        </li>
                    </ul>
                    <button
                        type="button"
                        class="text-xs font-medium text-primary-600 hover:underline"
                        @click="fillRandom"
                    >
                        Buat password acak
                    </button>
                </div>
            </PasswordInput>

            <PasswordInput
                id="rp-confirm"
                v-model="form.confirmPassword"
                label="Ulangi password baru"
                autocomplete="new-password"
                :error="errors.confirmPassword"
            />

            <p
                v-if="generated"
                class="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
            >
                <span>
                    Password: <code class="font-mono font-semibold text-gray-800">{{ generated }}</code>
                </span>
                <button type="button" class="text-primary-600 font-medium hover:underline shrink-0" @click="copy">
                    Salin
                </button>
            </p>

            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                    type="button"
                    :disabled="isSaving"
                    class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    @click="emit('close')"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
                >
                    <span
                        v-if="isSaving"
                        class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    ></span>
                    {{ isSaving ? "Menyimpan..." : "Reset Password" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { TeacherRow } from "~/types/teacher";

const props = defineProps<{ teacher: TeacherRow | null }>();
const emit = defineEmits<{ close: []; saved: [message: string] }>();

const toast = useToast();
const api = useApi();
const form = reactive({ newPassword: "", confirmPassword: "" });
const errors = ref<Record<string, string>>({});
const isSaving = ref(false);
const generated = ref("");

watch(
    () => props.teacher,
    () => {
        form.newPassword = "";
        form.confirmPassword = "";
        errors.value = {};
        generated.value = "";
    },
);

watch(
    () => ({ ...form }),
    (now, prev) => {
        for (const key of Object.keys(now) as (keyof typeof form)[]) {
            if (now[key] !== prev[key] && errors.value[key]) {
                const { [key]: _, ...rest } = errors.value;
                errors.value = rest;
            }
        }
    },
);

const rules = computed(() => checkPassword(form.newPassword));

function fillRandom() {
    const pw = generatePassword();
    form.newPassword = pw;
    form.confirmPassword = pw;
    generated.value = pw;
}

async function copy() {
    try {
        await navigator.clipboard.writeText(generated.value);
        toast.success("Disalin", "Password disalin ke clipboard.");
    } catch {
        toast.warning("Gagal menyalin", "Salin password secara manual.");
    }
}

function validateClient() {
    const e: Record<string, string> = {};
    if (!form.newPassword) e.newPassword = "Password baru wajib diisi.";
    else if (!rules.value.every((r) => r.ok))
        e.newPassword = "Password baru belum memenuhi semua syarat.";
    if (!form.confirmPassword) e.confirmPassword = "Konfirmasi password wajib diisi.";
    else if (form.confirmPassword !== form.newPassword)
        e.confirmPassword = "Konfirmasi password tidak sama dengan password baru.";
    errors.value = e;
    return Object.keys(e).length === 0;
}

async function submit() {
    if (!props.teacher || !validateClient()) return;
    isSaving.value = true;
    try {
        const res = await api(`/api/teachers/${props.teacher.uuid}/reset-password`, {
            method: "POST",
            body: { ...form },
        });
        emit("saved", res.message);
    } catch (err: any) {
        errors.value = getFieldErrors(err);
        if (!Object.keys(errors.value).length) {
            toast.error("Gagal reset password", getErrorMessage(err, "Silakan coba lagi."));
        }
    } finally {
        isSaving.value = false;
    }
}
</script>
