<template>
    <BaseModal
        :open="!!target"
        :title="target ? `Batalkan absen ${target.jenis}?` : ''"
        :subtitle="target ? `${target.student.nama} · ${target.student.kelasLabel}` : ''"
        :busy="isSaving"
        @close="emit('close')"
    >
        <form v-if="target" class="space-y-4" @submit.prevent="submit">
            <div class="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
                Absen {{ target.jenis }} pukul <b>{{ formatJam(target.waktu) }}</b> akan dihapus.
                <template v-if="target.jenis === 'masuk'">
                    Siswa dianggap <b>belum absen</b> dan bisa scan ulang. Kalau batas terlambat sudah lewat,
                    sistem akan menandainya Terlambat/Tidak Hadir seperti biasa.
                </template>
                <template v-else> Siswa bisa scan pulang lagi.</template>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                    Alasan pembatalan <span class="text-red-500">*</span>
                </label>
                <div class="flex flex-wrap gap-1.5 mb-2">
                    <button
                        v-for="q in QUICK"
                        :key="q"
                        type="button"
                        class="px-2.5 py-1 rounded-full border text-xs"
                        :class="alasan === q ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                        @click="pick(q)"
                    >
                        {{ q }}
                    </button>
                </div>
                <textarea
                    ref="textareaRef"
                    v-model="alasan"
                    rows="2"
                    maxlength="255"
                    class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    :class="error ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-primary-100'"
                    placeholder="Contoh: salah kartu, kartu milik adiknya"
                    @input="error = ''"
                ></textarea>
                <p v-if="error" class="text-xs text-red-600 mt-1">{{ error }}</p>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                    type="button"
                    :disabled="isSaving"
                    class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    @click="emit('close')"
                >
                    Tidak jadi
                </button>
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                    <span v-if="isSaving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    {{ isSaving ? "Membatalkan..." : "Ya, Batalkan" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { CancelTarget } from "~/types/scan";

const props = defineProps<{ target: CancelTarget | null }>();
const emit = defineEmits<{ close: []; cancelled: [message: string] }>();

const QUICK = ["Salah kartu", "Scan tidak sengaja", "Salah pilih siswa"];

const api = useApi();
const toast = useToast();
const alasan = ref("");
const error = ref("");
const isSaving = ref(false);
const textareaRef = ref<HTMLTextAreaElement>();

watch(
    () => props.target,
    (t) => {
        if (!t) return;
        alasan.value = "";
        error.value = "";
    },
);

function pick(q: string) {
    alasan.value = q;
    error.value = "";
}

async function submit() {
    if (!props.target) return;
    if (alasan.value.trim().length < 3) {
        error.value = "Alasan pembatalan wajib diisi (minimal 3 karakter).";
        textareaRef.value?.focus();
        return;
    }
    isSaving.value = true;
    try {
        const res = await api<{ message: string }>(`/api/attendance/${props.target.attendanceId}/cancel`, {
            method: "POST",
            body: { jenis: props.target.jenis, alasan: alasan.value.trim() },
        });
        emit("cancelled", res.message);
    } catch (err) {
        const fe = getFieldErrors(err);
        if (fe.alasan) error.value = fe.alasan;
        else toast.error("Gagal membatalkan", getErrorMessage(err, "Absensi tidak dapat dibatalkan."));
    } finally {
        isSaving.value = false;
    }
}
</script>
