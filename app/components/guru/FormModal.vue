<template>
    <BaseModal
        :open="open"
        :title="isEdit ? 'Edit Data Guru' : 'Tambah Guru'"
        :subtitle="
            isEdit
                ? 'Perbarui profil, role, dan status akun'
                : 'Buat akun login baru untuk guru'
        "
        :busy="isSaving"
        size="lg"
        @close="emit('close')"
    >
        <form novalidate class="space-y-4" @submit.prevent="submit">
            <div>
                <label for="gf-nama" class="field-label">Nama Lengkap</label>
                <input
                    id="gf-nama"
                    ref="namaInput"
                    v-model="form.nama"
                    autocomplete="off"
                    maxlength="100"
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    class="field-input"
                    :class="errors.nama ? 'field-invalid' : 'field-valid'"
                />
                <p v-if="errors.nama" class="field-error">{{ errors.nama }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="gf-email" class="field-label">Email (untuk login)</label>
                    <input
                        id="gf-email"
                        v-model="form.email"
                        type="email"
                        autocomplete="off"
                        placeholder="nama@sekolah.com"
                        class="field-input"
                        :class="errors.email ? 'field-invalid' : 'field-valid'"
                    />
                    <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
                </div>
                <div>
                    <label for="gf-hp" class="field-label">
                        No HP <span class="text-gray-400 text-xs font-normal">(opsional)</span>
                    </label>
                    <input
                        id="gf-hp"
                        v-model="form.noHp"
                        type="tel"
                        inputmode="tel"
                        autocomplete="off"
                        placeholder="081234567890"
                        class="field-input"
                        :class="errors.noHp ? 'field-invalid' : 'field-valid'"
                    />
                    <p v-if="errors.noHp" class="field-error">{{ errors.noHp }}</p>
                </div>
            </div>

            <!-- Role -->
            <div>
                <span class="field-label">Role</span>
                <div
                    v-if="roleLocked"
                    class="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600"
                >
                    <svg class="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span class="font-medium">{{ ROLE_LABELS[form.role as TeacherRole] }}</span>
                    <span class="text-xs text-gray-400">· {{ roleLockedReason }}</span>
                </div>
                <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label
                        v-for="r in ASSIGNABLE_ROLES"
                        :key="r.value"
                        class="border rounded-lg px-3 py-2 cursor-pointer transition-colors"
                        :class="
                            form.role === r.value
                                ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                                : errors.role
                                  ? 'border-red-300 hover:bg-gray-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                        "
                    >
                        <input v-model="form.role" type="radio" :value="r.value" class="sr-only" />
                        <span class="block text-sm font-medium text-gray-800">{{ r.label }}</span>
                        <span class="block text-xs text-gray-500 mt-0.5">{{ r.desc }}</span>
                    </label>
                </div>
                <p v-if="errors.role" class="field-error">{{ errors.role }}</p>
            </div>

            <!-- Kelas wali (Modul 5) -->
            <div v-if="form.role === 'wali_kelas'">
                <span class="field-label">
                    Kelas yang Dipegang <span class="text-gray-400 text-xs font-normal">(boleh lebih dari satu)</span>
                </span>
                <div class="space-y-2 rounded-lg border px-3 py-2.5" :class="errors.kelasWali ? 'border-red-300' : 'border-gray-200'">
                    <div v-for="j in JENJANG_LIST" :key="j" class="flex flex-wrap items-center gap-1.5">
                        <span class="w-10 text-xs font-medium text-gray-500">{{ j }}</span>
                        <button
                            v-for="k in KELAS_BY_JENJANG[j]"
                            :key="k"
                            type="button"
                            :disabled="!!dipegangLain(j, k)"
                            :title="dipegangLain(j, k) ? `Dipegang ${dipegangLain(j, k)}` : formatKelas(j, k)"
                            :aria-pressed="kelasWali.includes(`${j}|${k}`)"
                            class="min-w-[2.25rem] px-2 py-1 rounded-md border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through"
                            :class="kelasWali.includes(`${j}|${k}`) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
                            @click="toggleKelasWali(j, k)"
                        >
                            {{ k }}
                        </button>
                    </div>
                </div>
                <p v-if="errors.kelasWali" class="field-error">{{ errors.kelasWali }}</p>
                <p v-else class="text-xs text-gray-500 mt-1.5">
                    Wali kelas hanya dapat melihat dashboard & laporan kelas yang dipilih. Kelas bercoret sudah dipegang wali lain.
                </p>
            </div>

            <!-- Status (edit) -->
            <div v-if="isEdit">
                <span class="field-label">Status Akun</span>
                <label
                    class="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2.5"
                    :class="isSelf ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'"
                >
                    <span class="text-sm">
                        <span class="font-medium text-gray-800">
                            {{ form.isActive ? "Aktif" : "Nonaktif" }}
                        </span>
                        <span class="block text-xs text-gray-500">
                            {{
                                isSelf
                                    ? "Anda tidak dapat menonaktifkan akun sendiri."
                                    : form.isActive
                                      ? "Guru dapat login dan menggunakan aplikasi."
                                      : "Guru tidak dapat login sampai diaktifkan kembali."
                            }}
                        </span>
                    </span>
                    <input v-model="form.isActive" type="checkbox" class="sr-only peer" :disabled="isSelf" />
                    <span
                        class="relative w-10 h-6 rounded-full transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-400"
                        :class="form.isActive ? 'bg-green-500' : 'bg-gray-300'"
                    >
                        <span
                            class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                            :class="form.isActive ? 'translate-x-4' : ''"
                        ></span>
                    </span>
                </label>
                <p v-if="errors.isActive" class="field-error">{{ errors.isActive }}</p>
                <p
                    v-if="willRevokeSessions"
                    class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                >
                    Perubahan role/status akan membuat guru ini keluar dari semua perangkat
                    dan perlu login ulang.
                </p>
            </div>

            <!-- Password (tambah) -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PasswordInput
                    id="gf-password"
                    v-model="form.password"
                    label="Password"
                    autocomplete="new-password"
                    :error="errors.password"
                />
                <PasswordInput
                    id="gf-confirm"
                    v-model="form.confirmPassword"
                    label="Ulangi Password"
                    autocomplete="new-password"
                    :error="errors.confirmPassword"
                />
                <div class="sm:col-span-2 -mt-2 flex flex-wrap items-center justify-between gap-2">
                    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <li
                            v-for="rule in passwordRules"
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
                        @click="fillRandomPassword"
                    >
                        Buat password acak
                    </button>
                </div>
                <p
                    v-if="generatedPassword"
                    class="sm:col-span-2 -mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                >
                    <span>
                        Password: <code class="font-mono font-semibold text-gray-800">{{ generatedPassword }}</code>
                        — catat dan berikan ke guru.
                    </span>
                    <button type="button" class="text-primary-600 font-medium hover:underline shrink-0" @click="copy(generatedPassword)">
                        Salin
                    </button>
                </p>
            </div>

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
                    {{ isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Guru" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { Jenjang } from "#shared/utils/kelas";
import { ASSIGNABLE_ROLES, type TeacherRole, type TeacherRow } from "~/types/teacher";

const props = defineProps<{
    open: boolean;
    /** null = mode tambah */
    teacher: TeacherRow | null;
    currentUserId?: number;
}>();
const emit = defineEmits<{ close: []; saved: [message: string] }>();

const toast = useToast();
const api = useApi();

const isEdit = computed(() => !!props.teacher);
const isSelf = computed(() => !!props.teacher && props.teacher.id === props.currentUserId);
const roleLocked = computed(() => props.teacher?.role === "superadmin" || isSelf.value);
const roleLockedReason = computed(() =>
    props.teacher?.role === "superadmin"
        ? "Role Superadmin tidak dapat diubah"
        : "Anda tidak dapat mengubah role sendiri",
);

const emptyForm = () => ({
    nama: "",
    email: "",
    noHp: "",
    role: "" as TeacherRole | "",
    isActive: true,
    password: "",
    confirmPassword: "",
});
const form = reactive(emptyForm());
const errors = ref<Record<string, string>>({});
const isSaving = ref(false);
const generatedPassword = ref("");

// Kelas wali yang dipilih ("SD|3") + kelas yang sudah dipegang guru lain
const kelasWali = ref<string[]>([]);
const penugasan = ref<{ jenjang: string; kelas: string; teacher: { uuid: string; nama: string } }[]>([]);
function dipegangLain(jenjang: string, kelas: string) {
    const p = penugasan.value.find((x) => x.jenjang === jenjang && x.kelas === kelas);
    return p && p.teacher.uuid !== props.teacher?.uuid ? p.teacher.nama : null;
}
function toggleKelasWali(jenjang: string, kelas: string) {
    const key = `${jenjang}|${kelas}`;
    kelasWali.value = kelasWali.value.includes(key) ? kelasWali.value.filter((k) => k !== key) : [...kelasWali.value, key];
    delete errors.value.kelasWali;
}
const namaInput = ref<HTMLInputElement | null>(null);

// Isi ulang form setiap modal dibuka
watch(
    () => props.open,
    async (open) => {
        if (!open) return;
        Object.assign(form, emptyForm());
        if (props.teacher) {
            Object.assign(form, {
                nama: props.teacher.nama,
                email: props.teacher.email,
                noHp: props.teacher.noHp ?? "",
                role: props.teacher.role,
                isActive: props.teacher.isActive,
            });
        }
        errors.value = {};
        generatedPassword.value = "";
        kelasWali.value = (props.teacher?.waliKelas ?? []).map((k) => `${k.jenjang}|${k.kelas}`);
        penugasan.value = [];
        api<typeof penugasan.value>("/api/teachers/wali-kelas")
            .then((list) => (penugasan.value = list))
            .catch(() => {});
        await nextTick();
        namaInput.value?.focus();
    },
);

// Hapus error field begitu user mulai memperbaiki
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

const passwordRules = computed(() => checkPassword(form.password));

const willRevokeSessions = computed(
    () =>
        !!props.teacher &&
        (form.role !== props.teacher.role || form.isActive !== props.teacher.isActive),
);

function fillRandomPassword() {
    const pw = generatePassword();
    form.password = pw;
    form.confirmPassword = pw;
    generatedPassword.value = pw;
}

async function copy(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Disalin", "Password disalin ke clipboard.");
    } catch {
        toast.warning("Gagal menyalin", "Salin password secara manual.");
    }
}

function validateClient() {
    const e: Record<string, string> = {};
    const nama = form.nama.trim();
    if (!nama) e.nama = "Nama wajib diisi.";
    else if (nama.length < 2) e.nama = "Nama minimal 2 karakter.";

    const email = form.email.trim();
    if (!email) e.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        e.email = "Format email tidak valid. Contoh: nama@sekolah.com";

    if (form.noHp.trim() && !isValidPhone(form.noHp)) e.noHp = PHONE_ERROR;
    if (!form.role) e.role = "Pilih role guru.";

    if (!isEdit.value) {
        if (!form.password) e.password = "Password wajib diisi.";
        else if (!passwordRules.value.every((r) => r.ok))
            e.password = "Password belum memenuhi semua syarat.";
        if (!form.confirmPassword) e.confirmPassword = "Konfirmasi password wajib diisi.";
        else if (form.confirmPassword !== form.password)
            e.confirmPassword = "Konfirmasi password tidak sama dengan password.";
    }
    errors.value = e;
    return Object.keys(e).length === 0;
}

async function submit() {
    if (!validateClient()) return;
    isSaving.value = true;
    const profile = {
        nama: form.nama,
        email: form.email,
        noHp: form.noHp,
        role: form.role,
        // Kelas wali hanya dikirim untuk role Wali Kelas (role lain: server mengosongkan)
        kelasWali:
            form.role === "wali_kelas"
                ? kelasWali.value.map((k) => {
                      const [jenjang, kelas] = k.split("|") as [Jenjang, string];
                      return { jenjang, kelas };
                  })
                : undefined,
    };
    try {
        if (props.teacher) {
            const res = await api<{ message: string }>(`/api/teachers/${props.teacher.uuid}`, {
                method: "PATCH",
                body: { ...profile, isActive: form.isActive },
            });
            emit("saved", res.message);
        } else {
            const res = await api("/api/teachers", {
                method: "POST",
                body: {
                    ...profile,
                    password: form.password,
                    confirmPassword: form.confirmPassword,
                },
            });
            emit("saved", `Akun ${res.nama} berhasil dibuat.`);
        }
    } catch (err: any) {
        errors.value = getFieldErrors(err);
        if (!Object.keys(errors.value).length) {
            toast.error(
                isEdit.value ? "Gagal menyimpan perubahan" : "Gagal menambah guru",
                getErrorMessage(err, "Silakan coba lagi."),
            );
        }
    } finally {
        isSaving.value = false;
    }
}
</script>

<style scoped>
.field-label {
    @apply block text-sm font-medium mb-1 text-gray-600;
}
.field-input {
    @apply w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2;
}
.field-valid {
    @apply border-gray-200 focus:ring-primary-400;
}
.field-invalid {
    @apply border-red-400 focus:ring-red-300;
}
.field-error {
    @apply text-red-600 text-xs mt-1;
}
</style>
