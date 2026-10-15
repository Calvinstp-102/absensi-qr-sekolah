<template>
    <BaseModal
        :open="open"
        :title="isEdit ? 'Edit Hari Libur' : 'Tambah Hari Libur'"
        subtitle="Pada hari libur scan & absen manual ditolak, dan siswa tidak ditandai Terlambat/Tidak Hadir"
        :busy="isSaving"
        size="lg"
        @close="emit('close')"
    >
        <form novalidate class="space-y-4" @submit.prevent="submit">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="hf-mulai" class="field-label">Tanggal Mulai</label>
                    <input
                        id="hf-mulai"
                        v-model="form.tanggalMulai"
                        type="date"
                        :min="mulaiTerkunci ? undefined : today"
                        :disabled="mulaiTerkunci"
                        class="field-input disabled:bg-gray-50 disabled:text-gray-500"
                        :class="errors.tanggalMulai ? 'field-invalid' : 'field-valid'"
                    />
                    <p v-if="errors.tanggalMulai" class="field-error">{{ errors.tanggalMulai }}</p>
                    <p v-else-if="mulaiTerkunci" class="text-xs text-gray-400 mt-1.5">
                        Libur sedang berlangsung, tanggal mulai tidak dapat diubah.
                    </p>
                </div>
                <div>
                    <label for="hf-selesai" class="field-label">Tanggal Selesai</label>
                    <input
                        id="hf-selesai"
                        v-model="form.tanggalSelesai"
                        type="date"
                        :min="minSelesai"
                        class="field-input"
                        :class="errors.tanggalSelesai ? 'field-invalid' : 'field-valid'"
                    />
                    <p v-if="errors.tanggalSelesai" class="field-error">{{ errors.tanggalSelesai }}</p>
                    <p v-else class="text-xs text-gray-400 mt-1.5">Libur 1 hari: isi sama dengan tanggal mulai.</p>
                </div>
            </div>

            <p
                v-if="ringkasan"
                class="text-sm rounded-lg px-3 py-2"
                :class="ringkasan.hariSekolah > 0 ? 'bg-primary-50 text-primary-700' : 'bg-gray-50 text-gray-600'"
            >
                {{ ringkasan.hari }} hari kalender ·
                <strong>{{ ringkasan.hariSekolah }} hari sekolah</strong> diliburkan
                <span v-if="ringkasan.hariSekolah === 0" class="block text-xs mt-0.5">
                    Rentang ini tidak berisi hari sekolah (lihat pengaturan Hari Sekolah).
                </span>
            </p>

            <div>
                <label for="hf-ket" class="field-label">Keterangan</label>
                <input
                    id="hf-ket"
                    ref="ketInput"
                    v-model="form.keterangan"
                    maxlength="150"
                    autocomplete="off"
                    placeholder="Contoh: Libur Semester Ganjil, Hari Raya Idul Fitri"
                    class="field-input"
                    :class="errors.keterangan ? 'field-invalid' : 'field-valid'"
                />
                <p v-if="errors.keterangan" class="field-error">{{ errors.keterangan }}</p>
            </div>

            <fieldset>
                <legend class="field-label">Berlaku untuk</legend>
                <div class="grid grid-cols-2 gap-2">
                    <label
                        v-for="opt in [
                            { value: true, label: 'Semua jenjang', desc: 'Seluruh sekolah libur' },
                            { value: false, label: 'Jenjang tertentu', desc: 'Mis. hanya SMP (ujian)' },
                        ]"
                        :key="String(opt.value)"
                        class="flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer"
                        :class="form.semua === opt.value ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
                    >
                        <input v-model="form.semua" type="radio" :value="opt.value" class="mt-1 accent-primary-600" />
                        <span>
                            <span class="block text-sm font-medium text-gray-800">{{ opt.label }}</span>
                            <span class="block text-xs text-gray-500">{{ opt.desc }}</span>
                        </span>
                    </label>
                </div>
                <div v-if="!form.semua" class="flex flex-wrap gap-2 mt-3">
                    <label
                        v-for="j in JENJANG_LIST"
                        :key="j"
                        class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer"
                        :class="form.jenjang.includes(j) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                    >
                        <input v-model="form.jenjang" type="checkbox" :value="j" class="accent-primary-600" />
                        {{ j }}
                    </label>
                </div>
                <p v-if="errors.jenjang" class="field-error">{{ errors.jenjang }}</p>
            </fieldset>

            <div
                v-if="termasukHariIni"
                class="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800"
            >
                <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>
                    Libur ini mencakup <strong>hari ini</strong>. Setelah disimpan, scan untuk
                    {{ form.semua ? "semua jenjang" : labelJenjangLibur(form.jenjang) }} langsung ditolak, dan status
                    Terlambat/Tidak Hadir otomatis hari ini (siswa yang belum scan) dikosongkan. Absensi yang sudah
                    di-scan tetap tersimpan.
                </span>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    :disabled="isSaving"
                    class="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    @click="emit('close')"
                >
                    Batal
                </button>
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                    {{ isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Libur" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { Jenjang } from "#shared/utils/kelas";
import type { HolidayRow } from "~/types/holiday";

const props = defineProps<{
    open: boolean;
    /** null = mode tambah */
    holiday: HolidayRow | null;
    /** Hari ini WIB "YYYY-MM-DD" (dari server) */
    today: string;
    /** Hari sekolah tersimpan (1 = Senin ... 7 = Minggu) */
    hariSekolah: number[];
}>();
const emit = defineEmits<{ close: []; saved: [message: string, tanggalMulai: string] }>();

const toast = useToast();
const api = useApi();

const isEdit = computed(() => !!props.holiday);
const mulaiTerkunci = computed(() => props.holiday?.status === "berlangsung");

const emptyForm = () => ({
    tanggalMulai: "",
    tanggalSelesai: "",
    keterangan: "",
    semua: true,
    jenjang: [] as Jenjang[],
});
const form = reactive(emptyForm());
const errors = ref<Record<string, string>>({});
const isSaving = ref(false);
const ketInput = ref<HTMLInputElement | null>(null);

watch(
    () => props.open,
    async (open) => {
        if (!open) return;
        Object.assign(form, emptyForm());
        if (props.holiday) {
            Object.assign(form, {
                tanggalMulai: props.holiday.tanggalMulai,
                tanggalSelesai: props.holiday.tanggalSelesai,
                keterangan: props.holiday.keterangan,
                semua: !props.holiday.jenjang,
                jenjang: [...(props.holiday.jenjang ?? [])],
            });
        }
        errors.value = {};
        await nextTick();
        ketInput.value?.focus();
    },
);

// Tanggal selesai ikut maju bila tanggal mulai dipindah melewatinya
watch(
    () => form.tanggalMulai,
    (mulai) => {
        if (mulai && (!form.tanggalSelesai || form.tanggalSelesai < mulai)) form.tanggalSelesai = mulai;
    },
);

// Hapus error field begitu user mulai memperbaiki
watch(
    () => ({ ...form, jenjang: [...form.jenjang] }),
    (now, old) => {
        for (const key of Object.keys(errors.value)) {
            const k = key as keyof typeof now;
            if (JSON.stringify(now[k]) !== JSON.stringify(old[k])) delete errors.value[key];
        }
        if (now.semua !== old.semua) delete errors.value.jenjang;
    },
);

const minSelesai = computed(() => {
    const awal = form.tanggalMulai || props.today;
    return mulaiTerkunci.value && props.today > awal ? props.today : awal;
});

const ringkasan = computed(() => {
    if (!form.tanggalMulai || !form.tanggalSelesai) return null;
    const hari = selisihHari(form.tanggalMulai, form.tanggalSelesai) + 1;
    if (hari < 1) return null;
    return { hari, hariSekolah: hitungHariSekolah(form.tanggalMulai, form.tanggalSelesai, props.hariSekolah) };
});

const termasukHariIni = computed(
    () => !!form.tanggalMulai && !!form.tanggalSelesai && form.tanggalMulai <= props.today && props.today <= form.tanggalSelesai,
);

function validate() {
    const e: Record<string, string> = {};
    if (!form.tanggalMulai) e.tanggalMulai = "Tanggal mulai wajib diisi.";
    else if (!mulaiTerkunci.value && form.tanggalMulai < props.today) e.tanggalMulai = "Tanggal mulai tidak boleh sebelum hari ini.";
    if (!form.tanggalSelesai) e.tanggalSelesai = "Tanggal selesai wajib diisi.";
    else if (form.tanggalMulai && form.tanggalSelesai < form.tanggalMulai) {
        e.tanggalSelesai = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
    } else if (ringkasan.value && ringkasan.value.hari > LIBUR_MAKS_HARI) {
        e.tanggalSelesai = `Rentang libur maksimal ${LIBUR_MAKS_HARI} hari. Pecah menjadi beberapa libur bila perlu.`;
    }
    const ket = form.keterangan.trim();
    if (!ket) e.keterangan = "Keterangan wajib diisi.";
    else if (ket.length < 3) e.keterangan = "Keterangan minimal 3 karakter.";
    if (!form.semua && form.jenjang.length === 0) e.jenjang = "Pilih minimal 1 jenjang.";
    errors.value = e;
    return Object.keys(e).length === 0;
}

async function submit() {
    if (!validate()) return;
    isSaving.value = true;
    try {
        const body = {
            tanggalMulai: form.tanggalMulai,
            tanggalSelesai: form.tanggalSelesai,
            keterangan: form.keterangan.trim(),
            jenjang: form.semua ? null : form.jenjang,
        };
        const res = props.holiday
            ? await api<{ message: string }>(`/api/holidays/${props.holiday.uuid}`, { method: "PATCH", body })
            : await api<{ message: string }>("/api/holidays", { method: "POST", body });
        emit("saved", res.message, body.tanggalMulai);
    } catch (err) {
        const fieldErrors = getFieldErrors(err);
        if (Object.keys(fieldErrors).length > 0) errors.value = fieldErrors;
        else toast.error("Gagal menyimpan hari libur", getErrorMessage(err));
    } finally {
        isSaving.value = false;
    }
}
</script>

<style scoped>
.field-label {
    @apply block text-sm font-medium text-gray-700 mb-1.5;
}
.field-input {
    @apply block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2;
}
.field-valid {
    @apply border-gray-300 focus:border-primary-400 focus:ring-primary-100;
}
.field-invalid {
    @apply border-red-400 bg-red-50/40 focus:ring-red-100;
}
.field-error {
    @apply text-red-600 text-xs mt-1.5;
}
</style>
