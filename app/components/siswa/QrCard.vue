<template>
    <div class="bg-white rounded-xl border border-gray-100 shadow-md p-5">
        <div class="flex items-center justify-between mb-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">QR Absensi</p>
            <span
                class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                :class="qr ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'"
            >
                {{ qr ? "Aktif" : "Belum ada" }}
            </span>
        </div>

        <!-- Ada QR aktif -->
        <div v-if="qr" class="text-center">
            <img
                :src="`/api/qr-images/${qr.uuid}`"
                :alt="`QR absensi ${student.nama}`"
                class="mx-auto w-40 h-40 rounded-lg border border-gray-100"
            />
            <p class="text-xs text-gray-500 mt-2">Dibuat {{ formatTanggalWaktu(qr.generatedAt) }}</p>
            <p v-if="qr.reason" class="text-xs text-gray-400">{{ qr.reason }}</p>
            <a
                :href="`/api/qr-images/${qr.uuid}`"
                :download="`QR-${fileSlug}.png`"
                class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Unduh gambar QR
            </a>
        </div>
        <div v-else class="text-center py-4">
            <div class="mx-auto w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                <svg class="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM20 14v3M17 20h3" />
                </svg>
            </div>
            <p class="text-sm text-gray-500">
                {{ student.status === "active" ? "Siswa belum memiliki QR absensi." : "Siswa nonaktif tidak dapat dibuatkan QR." }}
            </p>
        </div>

        <p
            v-if="graceCount"
            class="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
        >
            {{ graceCount }} QR lama masih bisa dipakai selama masa tenggang.
        </p>

        <!-- Aksi (admin) -->
        <div v-if="canManage && student.status === 'active'" class="mt-4 pt-4 border-t border-gray-100 grid gap-2">
            <button
                type="button"
                class="w-full px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500"
                @click="qr ? (regenOpen = true) : generate('')"
            >
                {{ qr ? "Generate QR Baru" : "Generate QR" }}
            </button>
            <button
                type="button"
                class="w-full px-4 py-2 rounded-lg border border-primary-200 text-primary-600 text-sm font-medium hover:bg-primary-50"
                @click="registerOpen = true"
            >
                Daftarkan Kartu QR yang Ada
            </button>
            <button
                v-if="qr"
                type="button"
                class="w-full px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
                @click="removeQr"
            >
                Hapus QR
            </button>
        </div>

        <!-- Generate QR baru (sudah punya QR) -->
        <BaseModal :open="regenOpen" title="Generate QR Baru" :subtitle="student.nama" :busy="isGenerating" @close="regenOpen = false">
            <form novalidate class="space-y-4" @submit.prevent="submitRegen">
                <ul class="text-xs text-amber-800 bg-amber-50 border border-amber-100 p-3 rounded-lg space-y-1 list-disc pl-6">
                    <li>QR baru langsung aktif dan bisa dipakai absen.</li>
                    <li>QR lama tetap bisa dipakai selama masa tenggang {{ gracePeriodDays }} hari, setelah itu otomatis tidak berlaku.</li>
                </ul>
                <div>
                    <label for="qr-reason" class="block text-sm font-medium mb-1 text-gray-600">
                        Alasan <span class="text-gray-400 text-xs font-normal">(opsional)</span>
                    </label>
                    <input
                        id="qr-reason"
                        v-model="regenReason"
                        maxlength="255"
                        placeholder="Contoh: Kartu hilang"
                        class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
                <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                        type="button"
                        :disabled="isGenerating"
                        class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        @click="regenOpen = false"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        :disabled="isGenerating"
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 disabled:opacity-60"
                    >
                        <span v-if="isGenerating" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        {{ isGenerating ? "Memproses..." : "Generate" }}
                    </button>
                </div>
            </form>
        </BaseModal>

        <SiswaRegisterQrModal
            :open="registerOpen"
            :student-uuid="student.uuid"
            :student-name="student.nama"
            @close="registerOpen = false"
            @saved="onRegistered"
        />
    </div>
</template>

<script setup lang="ts">
import type { StudentDetailResponse } from "~/types/student";

const props = defineProps<{
    student: StudentDetailResponse["student"];
    qr: StudentDetailResponse["qr"];
    graceCount: number;
    gracePeriodDays: number;
    canManage: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();

const toast = useToast();
const api = useApi();
const { confirm } = useConfirm();

const fileSlug = computed(() =>
    props.student.nama.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, ""),
);

const regenOpen = ref(false);
const regenReason = ref("");
const isGenerating = ref(false);
const registerOpen = ref(false);

watch(regenOpen, (open) => open && (regenReason.value = ""));

async function generate(reason: string) {
    isGenerating.value = true;
    try {
        const res = await api<{ message: string }>(`/api/students/${props.student.uuid}/regenerate-qr`, {
            method: "POST",
            body: { reason },
        });
        regenOpen.value = false;
        toast.success("QR dibuat", res.message);
        emit("changed");
    } catch (err) {
        toast.error("Gagal generate QR", getErrorMessage(err));
    } finally {
        isGenerating.value = false;
    }
}

function submitRegen() {
    return generate(regenReason.value);
}

function onRegistered(message: string) {
    registerOpen.value = false;
    toast.success("Kartu QR didaftarkan", message);
    emit("changed");
}

async function removeQr() {
    const ok = await confirm({
        title: "Hapus QR",
        message: `QR aktif ${props.student.nama} langsung tidak berlaku saat ini juga (tanpa masa tenggang). Kartu yang sudah dicetak tidak bisa dipakai absen lagi. Lanjutkan?`,
        confirmText: "Ya, Hapus QR",
        danger: true,
    });
    if (!ok) return;
    try {
        const res = await api<{ message: string }>(`/api/students/${props.student.uuid}/delete-qr`, {
            method: "POST",
            body: {},
        });
        toast.success("QR dihapus", res.message);
        emit("changed");
    } catch (err) {
        toast.error("Gagal menghapus QR", getErrorMessage(err));
    }
}
</script>
