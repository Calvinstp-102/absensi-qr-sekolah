<template>
    <BaseModal
        :open="!!attendance"
        title="Koreksi Keterlambatan"
        :subtitle="attendance ? formatTanggal(attendance.tanggal) : ''"
        :busy="isSaving"
        @close="emit('close')"
    >
        <form v-if="attendance" novalidate class="space-y-4" @submit.prevent="submit">
            <p class="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                Status <b>Terlambat</b> (masuk {{ formatJam(attendance.jamMasukAsli) }}) akan ditandai
                <b>Dimaklumi</b>. Jam masuk asli tetap tersimpan dan koreksi tercatat di Log Aktivitas.
            </p>
            <div>
                <label for="cm-reason" class="block text-sm font-medium mb-1 text-gray-600">Alasan *</label>
                <textarea
                    id="cm-reason"
                    ref="reasonInput"
                    v-model="reason"
                    rows="3"
                    maxlength="255"
                    placeholder="Contoh: Hujan deras, ada surat izin dari orang tua"
                    class="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
                    :class="error ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-400'"
                ></textarea>
                <p v-if="error" class="text-red-600 text-xs mt-1">{{ error }}</p>
            </div>
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
                    {{ isSaving ? "Menyimpan..." : "Simpan Koreksi" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { AttendanceRow } from "~/types/student";

const props = defineProps<{ attendance: AttendanceRow | null }>();
const emit = defineEmits<{ close: []; saved: [message: string] }>();

const toast = useToast();
const api = useApi();
const reason = ref("");
const error = ref("");
const isSaving = ref(false);
const reasonInput = ref<HTMLTextAreaElement | null>(null);

watch(
    () => props.attendance,
    async (a) => {
        if (!a) return;
        reason.value = "";
        error.value = "";
        await nextTick();
        reasonInput.value?.focus();
    },
);
watch(reason, () => (error.value = ""));

async function submit() {
    if (!props.attendance) return;
    if (reason.value.trim().length < 3) {
        error.value = "Alasan koreksi wajib diisi (minimal 3 karakter).";
        return;
    }
    isSaving.value = true;
    try {
        const res = await api<{ message: string }>(`/api/attendance/${props.attendance.id}/correct`, {
            method: "PATCH",
            body: { reason: reason.value },
        });
        emit("saved", res.message);
    } catch (err) {
        error.value = getFieldErrors(err).reason ?? "";
        if (!error.value) toast.error("Gagal menyimpan koreksi", getErrorMessage(err));
    } finally {
        isSaving.value = false;
    }
}
</script>
