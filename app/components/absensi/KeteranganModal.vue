<template>
    <BaseModal
        :open="open"
        title="Keterangan Tidak Hadir"
        :subtitle="target ? `${target.nama} · ${target.kelasLabel} · ${formatTanggal(target.tanggal)}` : ''"
        :busy="isSaving"
        @close="emit('close')"
    >
        <form v-if="target" novalidate class="space-y-4" @submit.prevent="submit">
            <div v-if="target.kode" class="flex items-center gap-2 text-sm text-gray-600">
                Status sekarang: <LaporanStatusBadge :kode="target.kode" />
            </div>

            <fieldset>
                <legend class="field-label">Keterangan</legend>
                <div class="grid gap-2" :class="pilihan.length === 3 ? 'grid-cols-3' : 'grid-cols-2'">
                    <label
                        v-for="p in pilihan"
                        :key="p.value"
                        class="flex flex-col items-start rounded-lg border-2 px-3 py-2 cursor-pointer transition-colors"
                        :class="jenis === p.value ? p.active : 'border-gray-200 hover:bg-gray-50'"
                    >
                        <input v-model="jenis" type="radio" :value="p.value" class="sr-only" />
                        <span class="text-sm font-semibold text-gray-800">{{ p.label }}</span>
                        <span class="text-xs text-gray-500">{{ p.hint }}</span>
                    </label>
                </div>
                <p v-if="errors.jenis" class="field-error">{{ errors.jenis }}</p>
            </fieldset>

            <div>
                <label for="kt-alasan" class="field-label">Alasan</label>
                <div v-if="jenis !== 'alpa'" class="flex flex-wrap gap-1.5 mb-2">
                    <button
                        v-for="r in REASONS[jenis]"
                        :key="r"
                        type="button"
                        class="px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                        @click="alasan = r"
                    >
                        {{ r }}
                    </button>
                </div>
                <textarea
                    id="kt-alasan"
                    ref="alasanInput"
                    v-model="alasan"
                    rows="2"
                    maxlength="255"
                    :placeholder="jenis === 'alpa' ? 'Contoh: Surat izin tidak valid' : 'Contoh: Demam, surat dokter menyusul'"
                    class="field-input resize-none"
                    :class="errors.alasan ? 'field-invalid' : 'field-valid'"
                />
                <p v-if="errors.alasan" class="field-error">{{ errors.alasan }}</p>
                <p v-else class="text-xs text-gray-400 mt-1.5">Tercatat di Log Aktivitas beserta nama Anda.</p>
            </div>

            <p v-if="target.tanggal === hariIni && jenis !== 'alpa'" class="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Bila siswa ternyata datang dan scan masuk hari ini, keterangan ini otomatis dihapus.
            </p>

            <div class="flex justify-end gap-2 pt-1">
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
                    {{ isSaving ? "Menyimpan..." : "Simpan Keterangan" }}
                </button>
            </div>
        </form>
    </BaseModal>
</template>

<script setup lang="ts">
import type { KeteranganTarget } from "~/types/report";

const props = defineProps<{ open: boolean; target: KeteranganTarget | null }>();
const emit = defineEmits<{ close: []; saved: [message: string] }>();

const api = useApi();
const toast = useToast();
const { isAdmin } = useAuth();

type Jenis = "sakit" | "izin" | "alpa";
const REASONS: Record<Exclude<Jenis, "alpa">, string[]> = {
    sakit: ["Demam", "Sakit, surat dokter", "Sakit, dikabari orang tua", "Dirawat di rumah sakit"],
    izin: ["Acara keluarga", "Keperluan keluarga", "Izin orang tua", "Mengikuti lomba / kegiatan"],
};

const jenis = ref<Jenis>("sakit");
const alasan = ref("");
const errors = ref<Record<string, string>>({});
const isSaving = ref(false);
const alasanInput = ref<HTMLTextAreaElement | null>(null);

const hariIni = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

const pilihan = computed(() => {
    const list: { value: Jenis; label: string; hint: string; active: string }[] = [
        { value: "sakit", label: "Sakit", hint: "Tidak hadir karena sakit", active: "border-sky-400 bg-sky-50" },
        { value: "izin", label: "Izin", hint: "Tidak hadir dengan izin", active: "border-violet-400 bg-violet-50" },
    ];
    // Mencabut keterangan (kembali Alpa) hanya Admin, dan hanya bila sudah ber-S/I
    if (isAdmin.value && (props.target?.kode === "S" || props.target?.kode === "I")) {
        list.push({ value: "alpa", label: "Alpa", hint: "Cabut keterangan", active: "border-red-400 bg-red-50" });
    }
    return list;
});

watch(
    () => props.open,
    async (open) => {
        if (!open) return;
        jenis.value = props.target?.kode === "S" ? "izin" : "sakit";
        alasan.value = "";
        errors.value = {};
        await nextTick();
        alasanInput.value?.focus();
    },
);

watch(alasan, () => delete errors.value.alasan);

async function submit() {
    if (!props.target) return;
    const a = alasan.value.trim();
    if (a.length < 3) {
        errors.value = { alasan: "Alasan wajib diisi (minimal 3 karakter)." };
        return;
    }
    isSaving.value = true;
    try {
        const res = await api<{ message: string }>("/api/attendance/keterangan", {
            method: "POST",
            body: { studentUuid: props.target.studentUuid, tanggal: props.target.tanggal, jenis: jenis.value, alasan: a },
        });
        emit("saved", res.message);
    } catch (err) {
        const fe = getFieldErrors(err);
        if (Object.keys(fe).length) errors.value = fe;
        else toast.error("Gagal menyimpan keterangan", getErrorMessage(err));
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
