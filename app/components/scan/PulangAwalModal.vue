<template>
    <BaseModal
        :open="!!preview"
        title="Izin Pulang Awal"
        subtitle="Catat siswa yang pulang sebelum jam pulang"
        :busy="isSaving"
        @close="emit('close')"
    >
        <form v-if="preview" class="space-y-4" @submit.prevent="submit">
            <div class="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <UserAvatar
                    :nama="preview.student.nama"
                    :uuid="preview.student.uuid"
                    :foto-path="preview.student.fotoPath"
                    kind="students"
                    size="lg"
                />
                <div class="min-w-0">
                    <p class="font-heading font-bold text-gray-800 text-lg leading-tight">{{ preview.student.nama }}</p>
                    <p class="text-sm text-gray-500">{{ preview.student.kelasLabel }}</p>
                </div>
            </div>

            <dl class="grid grid-cols-3 gap-2 text-center">
                <div class="rounded-lg bg-gray-50 py-2">
                    <dt class="text-xs text-gray-400">Masuk</dt>
                    <dd class="font-bold text-gray-700 tabular-nums">{{ formatJam(preview.today.masuk?.waktu) }}</dd>
                </div>
                <div class="rounded-lg bg-gray-50 py-2">
                    <dt class="text-xs text-gray-400">Jam pulang</dt>
                    <dd class="font-bold text-gray-700 tabular-nums">{{ formatJam(preview.jamPulang) }}</dd>
                </div>
                <div class="rounded-lg bg-orange-50 py-2">
                    <dt class="text-xs text-orange-500">Pulang sekarang</dt>
                    <dd class="font-bold text-orange-700 tabular-nums">{{ nowLabel }}</dd>
                </div>
            </dl>

            <p
                v-if="preview.info"
                class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
            >
                {{ preview.info }}
            </p>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                    Alasan <span class="text-red-500">*</span>
                </label>
                <div class="flex flex-wrap gap-1.5 mb-2">
                    <button
                        v-for="q in QUICK"
                        :key="q"
                        type="button"
                        class="px-2.5 py-1 rounded-full border text-xs"
                        :class="alasan === q ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
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
                    :class="error ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-orange-100'"
                    placeholder="Contoh: sakit, dijemput ibunya"
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
                    Batal
                </button>
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                    <span v-if="isSaving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    {{ isSaving ? "Menyimpan..." : "Catat Pulang Awal" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { ScanPreviewResponse, ScanResponse } from "~/types/scan";

const props = defineProps<{ preview: ScanPreviewResponse | null; token: string; sumber: "kamera" | "usb" }>();
const emit = defineEmits<{ close: []; saved: [res: ScanResponse]; failed: [err: unknown] }>();

const QUICK = ["Sakit", "Dijemput orang tua", "Izin keperluan keluarga", "Kegiatan sekolah"];

const api = useApi({ silent: true });
const alasan = ref("");
const error = ref("");
const isSaving = ref(false);
const textareaRef = ref<HTMLTextAreaElement>();
const nowLabel = ref("");

watch(
    () => props.preview,
    (p) => {
        if (!p) return;
        alasan.value = "";
        error.value = "";
        nowLabel.value = formatJam(new Date().toISOString());
    },
);

function pick(q: string) {
    alasan.value = q;
    error.value = "";
}

async function submit() {
    if (alasan.value.trim().length < 3) {
        error.value = "Alasan izin pulang awal wajib diisi (minimal 3 karakter).";
        textareaRef.value?.focus();
        return;
    }
    isSaving.value = true;
    try {
        const res = await api<ScanResponse>("/api/attendance/scan", {
            method: "POST",
            body: {
                token: props.token,
                mode: "pulang_awal",
                alasan: alasan.value.trim(),
                sumber: props.sumber,
                deviceInfo: navigator.userAgent,
            },
        });
        emit("saved", res);
    } catch (err) {
        const fe = getFieldErrors(err);
        if (fe.alasan) error.value = fe.alasan;
        else emit("failed", err);
    } finally {
        isSaving.value = false;
    }
}
</script>
