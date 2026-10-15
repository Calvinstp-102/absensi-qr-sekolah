<template>
    <BaseModal
        :open="open"
        :title="isEdit ? 'Edit Data Siswa' : 'Tambah Siswa'"
        :subtitle="isEdit ? student?.nama : 'Isi data siswa baru. Kolom bertanda * wajib diisi.'"
        :busy="isSaving"
        size="xl"
        @close="emit('close')"
    >
        <form novalidate class="space-y-5" @submit.prevent="submit">
            <!-- Identitas -->
            <section class="space-y-4">
                <h3 class="section-title">Identitas</h3>
                <div>
                    <label for="sf-nama" class="field-label">Nama Lengkap *</label>
                    <input
                        id="sf-nama"
                        ref="namaInput"
                        v-model="form.nama"
                        autocomplete="off"
                        maxlength="100"
                        placeholder="Contoh: Siti Rahayu"
                        class="field-input"
                        :class="errors.nama ? 'field-invalid' : 'field-valid'"
                    />
                    <p v-if="errors.nama" class="field-error">{{ errors.nama }}</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="sf-nisn" class="field-label">NISN *</label>
                        <input
                            id="sf-nisn"
                            v-model="form.nisn"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="10"
                            placeholder="10 digit angka"
                            class="field-input"
                            :class="errors.nisn ? 'field-invalid' : 'field-valid'"
                        />
                        <p v-if="errors.nisn" class="field-error">{{ errors.nisn }}</p>
                    </div>
                    <div>
                        <label for="sf-nis" class="field-label">NIS <span class="optional">(opsional)</span></label>
                        <input
                            id="sf-nis"
                            v-model="form.nis"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="20"
                            placeholder="Nomor induk sekolah"
                            class="field-input"
                            :class="errors.nis ? 'field-invalid' : 'field-valid'"
                        />
                        <p v-if="errors.nis" class="field-error">{{ errors.nis }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <span class="field-label">Jenis Kelamin *</span>
                        <div class="grid grid-cols-2 gap-2">
                            <label
                                v-for="g in genders"
                                :key="g.value"
                                class="border rounded-lg px-3 py-2 text-sm text-center cursor-pointer transition-colors"
                                :class="
                                    form.gender === g.value
                                        ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600 text-primary-700 font-medium'
                                        : errors.gender
                                          ? 'border-red-300 hover:bg-gray-50 text-gray-600'
                                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                "
                            >
                                <input v-model="form.gender" type="radio" :value="g.value" class="sr-only" />
                                {{ g.label }}
                            </label>
                        </div>
                        <p v-if="errors.gender" class="field-error">{{ errors.gender }}</p>
                    </div>
                    <div>
                        <label for="sf-lahir" class="field-label">Tanggal Lahir <span class="optional">(opsional)</span></label>
                        <input
                            id="sf-lahir"
                            v-model="form.tanggalLahir"
                            type="date"
                            :max="today"
                            min="1950-01-01"
                            class="field-input"
                            :class="errors.tanggalLahir ? 'field-invalid' : 'field-valid'"
                        />
                        <p v-if="errors.tanggalLahir" class="field-error">{{ errors.tanggalLahir }}</p>
                    </div>
                </div>
            </section>

            <!-- Kelas -->
            <section class="space-y-4">
                <h3 class="section-title">Kelas</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="sf-jenjang" class="field-label">Jenjang *</label>
                        <select
                            id="sf-jenjang"
                            v-model="form.jenjang"
                            class="field-input bg-white"
                            :class="errors.jenjang ? 'field-invalid' : 'field-valid'"
                            @change="onJenjangChange"
                        >
                            <option value="">Pilih jenjang</option>
                            <option v-for="j in JENJANG_LIST" :key="j" :value="j">{{ j }}</option>
                        </select>
                        <p v-if="errors.jenjang" class="field-error">{{ errors.jenjang }}</p>
                    </div>
                    <div>
                        <label for="sf-kelas" class="field-label">Kelas *</label>
                        <select
                            id="sf-kelas"
                            v-model="form.kelasSekarang"
                            :disabled="!form.jenjang"
                            class="field-input bg-white disabled:bg-gray-50 disabled:text-gray-400"
                            :class="errors.kelasSekarang ? 'field-invalid' : 'field-valid'"
                        >
                            <option value="">{{ form.jenjang ? "Pilih kelas" : "Pilih jenjang dulu" }}</option>
                            <option v-for="k in kelasOptions" :key="k" :value="k">
                                {{ form.jenjang === "TK" ? k : `Kelas ${k}` }}
                            </option>
                        </select>
                        <p v-if="errors.kelasSekarang" class="field-error">{{ errors.kelasSekarang }}</p>
                    </div>
                </div>
                <div v-if="kelasBerubah" class="reason-box">
                    <label for="sf-kelas-alasan" class="block text-sm font-medium mb-1 text-amber-800">
                        Alasan perubahan kelas *
                        <span class="block text-xs font-normal text-amber-700">
                            {{ formatKelas(student!.jenjang, student!.kelasSekarang) }} →
                            {{ form.kelasSekarang ? formatKelas(form.jenjang, form.kelasSekarang) : "?" }}.
                            Untuk kenaikan kelas tahunan, gunakan fitur Naik Kelas.
                        </span>
                    </label>
                    <input
                        id="sf-kelas-alasan"
                        v-model="form.kelasChangeReason"
                        maxlength="255"
                        placeholder="Contoh: Salah input kelas saat pendaftaran"
                        class="field-input bg-white"
                        :class="errors.kelasChangeReason ? 'field-invalid' : 'border-amber-200 focus:ring-amber-300'"
                    />
                    <p v-if="errors.kelasChangeReason" class="field-error">{{ errors.kelasChangeReason }}</p>
                </div>
            </section>

            <!-- Orang tua & alamat -->
            <section class="space-y-4">
                <h3 class="section-title">Orang Tua & Alamat</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="sf-ortu" class="field-label">Nama Orang Tua/Wali <span class="optional">(opsional)</span></label>
                        <input
                            id="sf-ortu"
                            v-model="form.namaOrtu"
                            autocomplete="off"
                            maxlength="100"
                            class="field-input"
                            :class="errors.namaOrtu ? 'field-invalid' : 'field-valid'"
                        />
                        <p v-if="errors.namaOrtu" class="field-error">{{ errors.namaOrtu }}</p>
                    </div>
                    <div>
                        <label for="sf-hp" class="field-label">No HP Orang Tua/Wali <span class="optional">(opsional)</span></label>
                        <input
                            id="sf-hp"
                            v-model="form.noHpOrtu"
                            type="tel"
                            inputmode="tel"
                            autocomplete="off"
                            placeholder="081234567890"
                            class="field-input"
                            :class="errors.noHpOrtu ? 'field-invalid' : 'field-valid'"
                        />
                        <p v-if="errors.noHpOrtu" class="field-error">{{ errors.noHpOrtu }}</p>
                    </div>
                </div>
                <div>
                    <label for="sf-alamat" class="field-label">Alamat <span class="optional">(opsional)</span></label>
                    <textarea
                        id="sf-alamat"
                        v-model="form.alamat"
                        rows="2"
                        maxlength="255"
                        class="field-input resize-none"
                        :class="errors.alamat ? 'field-invalid' : 'field-valid'"
                    ></textarea>
                    <p v-if="errors.alamat" class="field-error">{{ errors.alamat }}</p>
                </div>
            </section>

            <!-- Status (edit) -->
            <section v-if="isEdit" class="space-y-3">
                <h3 class="section-title">Status</h3>
                <label class="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer">
                    <span class="text-sm">
                        <span class="font-medium text-gray-800">{{ form.status === "active" ? "Aktif" : "Nonaktif" }}</span>
                        <span class="block text-xs text-gray-500">
                            {{
                                form.status === "active"
                                    ? "Siswa dapat absen dengan QR."
                                    : "Siswa tidak dapat absen (mis. pindah sekolah atau lulus)."
                            }}
                        </span>
                    </span>
                    <input v-model="isActive" type="checkbox" class="sr-only peer" />
                    <span
                        class="relative w-10 h-6 rounded-full transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-400"
                        :class="isActive ? 'bg-green-500' : 'bg-gray-300'"
                    >
                        <span
                            class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                            :class="isActive ? 'translate-x-4' : ''"
                        ></span>
                    </span>
                </label>
                <div v-if="statusBerubah" class="reason-box">
                    <label for="sf-status-alasan" class="block text-sm font-medium mb-1 text-amber-800">
                        Alasan {{ form.status === "active" ? "mengaktifkan kembali" : "menonaktifkan" }} *
                    </label>
                    <input
                        id="sf-status-alasan"
                        v-model="form.statusReason"
                        maxlength="255"
                        :placeholder="form.status === 'active' ? 'Contoh: Kembali bersekolah' : 'Contoh: Pindah ke sekolah lain'"
                        class="field-input bg-white"
                        :class="errors.statusReason ? 'field-invalid' : 'border-amber-200 focus:ring-amber-300'"
                    />
                    <p v-if="errors.statusReason" class="field-error">{{ errors.statusReason }}</p>
                </div>
            </section>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
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
                    <span v-if="isSaving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    {{ isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Siswa" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { Jenjang, StudentDetail } from "~/types/student";

const props = defineProps<{
    open: boolean;
    /** null = mode tambah */
    student: StudentDetail | null;
}>();
const emit = defineEmits<{ close: []; saved: [message: string] }>();

const toast = useToast();
const api = useApi();

const genders = [
    { value: "L", label: "Laki-laki" },
    { value: "P", label: "Perempuan" },
] as const;

const isEdit = computed(() => !!props.student);
const today = new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
    nama: "",
    nis: "",
    nisn: "",
    gender: "" as "L" | "P" | "",
    tanggalLahir: "",
    jenjang: "" as Jenjang | "",
    kelasSekarang: "",
    alamat: "",
    namaOrtu: "",
    noHpOrtu: "",
    status: "active" as "active" | "inactive",
    statusReason: "",
    kelasChangeReason: "",
});
const form = reactive(emptyForm());
const errors = ref<Record<string, string>>({});
const isSaving = ref(false);
const namaInput = ref<HTMLInputElement | null>(null);

const kelasOptions = computed(() => (form.jenjang ? KELAS_BY_JENJANG[form.jenjang] : []));
const isActive = computed({
    get: () => form.status === "active",
    set: (v) => (form.status = v ? "active" : "inactive"),
});

const kelasBerubah = computed(
    () =>
        !!props.student &&
        (form.jenjang !== props.student.jenjang || form.kelasSekarang !== props.student.kelasSekarang),
);
const statusBerubah = computed(() => !!props.student && form.status !== props.student.status);

function onJenjangChange() {
    if (!kelasOptions.value.includes(form.kelasSekarang)) form.kelasSekarang = "";
}

// Isi ulang form setiap modal dibuka
watch(
    () => props.open,
    async (open) => {
        if (!open) return;
        Object.assign(form, emptyForm());
        const s = props.student;
        if (s) {
            Object.assign(form, {
                nama: s.nama,
                nis: s.nis ?? "",
                nisn: s.nisn ?? "",
                gender: s.gender,
                tanggalLahir: s.tanggalLahir ? s.tanggalLahir.slice(0, 10) : "",
                jenjang: s.jenjang,
                kelasSekarang: s.kelasSekarang,
                alamat: s.alamat ?? "",
                namaOrtu: s.namaOrtu ?? "",
                noHpOrtu: s.noHpOrtu ?? "",
                status: s.status,
            });
        }
        errors.value = {};
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

// Aturan sama dengan server (server/utils/student.ts)
function validateClient() {
    const e: Record<string, string> = {};
    const nama = form.nama.trim();
    if (!nama) e.nama = "Nama wajib diisi.";
    else if (nama.length < 2) e.nama = "Nama minimal 2 karakter.";

    const nisn = form.nisn.trim();
    if (!nisn) e.nisn = "NISN wajib diisi.";
    else if (!/^\d{10}$/.test(nisn)) e.nisn = "NISN harus tepat 10 digit angka.";
    if (form.nis.trim() && !/^\d+$/.test(form.nis.trim())) e.nis = "NIS hanya boleh berisi angka.";

    if (!form.gender) e.gender = "Pilih jenis kelamin.";
    if (form.tanggalLahir && form.tanggalLahir > today) {
        e.tanggalLahir = "Tanggal lahir tidak boleh di masa depan.";
    }
    if (!form.jenjang) e.jenjang = "Pilih jenjang.";
    if (!form.kelasSekarang) e.kelasSekarang = "Pilih kelas.";
    if (form.noHpOrtu.trim() && !isValidPhone(form.noHpOrtu)) e.noHpOrtu = PHONE_ERROR;

    if (kelasBerubah.value && form.kelasChangeReason.trim().length < 3) {
        e.kelasChangeReason = "Alasan perubahan kelas wajib diisi (minimal 3 karakter).";
    }
    if (statusBerubah.value && form.statusReason.trim().length < 3) {
        e.statusReason = "Alasan perubahan status wajib diisi (minimal 3 karakter).";
    }
    errors.value = e;
    return Object.keys(e).length === 0;
}

async function submit() {
    if (!validateClient()) return;
    isSaving.value = true;
    const { status, statusReason, kelasChangeReason, ...data } = form;
    const payload = { ...data, noHpOrtu: data.noHpOrtu ? normalizePhone(data.noHpOrtu) : "" };
    try {
        if (props.student) {
            const res = await api<{ message: string }>(`/api/students/${props.student.uuid}`, {
                method: "PATCH",
                body: { ...payload, status, statusReason, kelasChangeReason },
            });
            emit("saved", res.message);
        } else {
            const res = await api<{ message: string }>("/api/students", {
                method: "POST",
                body: payload,
            });
            emit("saved", res.message);
        }
    } catch (err) {
        errors.value = getFieldErrors(err);
        if (!Object.keys(errors.value).length) {
            toast.error(
                isEdit.value ? "Gagal menyimpan perubahan" : "Gagal menambah siswa",
                getErrorMessage(err, "Silakan coba lagi."),
            );
        }
    } finally {
        isSaving.value = false;
    }
}
</script>

<style scoped>
.section-title {
    @apply text-xs font-semibold uppercase tracking-wide text-gray-400;
}
.field-label {
    @apply block text-sm font-medium mb-1 text-gray-600;
}
.optional {
    @apply text-gray-400 text-xs font-normal;
}
.field-input {
    @apply w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2;
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
.reason-box {
    @apply bg-amber-50 border border-amber-100 rounded-lg p-3;
}
</style>
