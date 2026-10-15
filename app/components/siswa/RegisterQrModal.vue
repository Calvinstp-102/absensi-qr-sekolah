<template>
    <BaseModal
        :open="open"
        title="Daftarkan Kartu QR"
        :subtitle="`Untuk ${studentName}`"
        :busy="isSaving"
        @close="close"
    >
        <p class="text-sm text-gray-500 mb-3">
            Arahkan kartu QR fisik yang sudah ada ke kamera. QR aktif saat ini (kalau ada) akan masuk
            masa tenggang.
        </p>

        <div class="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-900 aspect-square mb-3">
            <div :id="readerId" class="w-full h-full"></div>
            <div v-if="cameraError" class="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p class="text-sm text-white/90">{{ cameraError }}</p>
            </div>
            <div v-else-if="token" class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <span class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </span>
                <p class="text-sm font-medium text-white">QR terbaca</p>
                <button type="button" class="text-xs text-white/80 underline" :disabled="isSaving" @click="rescan">
                    Pindai ulang
                </button>
            </div>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            {{ errorMessage }}
        </p>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
                type="button"
                :disabled="isSaving"
                class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                @click="close"
            >
                Batal
            </button>
            <button
                type="button"
                :disabled="!token || isSaving"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                @click="submit"
            >
                <span v-if="isSaving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {{ isSaving ? "Menyimpan..." : "Daftarkan" }}
            </button>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import type { Html5Qrcode } from "html5-qrcode";

const props = defineProps<{ open: boolean; studentUuid: string; studentName: string }>();
const emit = defineEmits<{ close: []; saved: [message: string] }>();

const api = useApi();
const readerId = `register-qr-${useId()}`;

const token = ref("");
const cameraError = ref("");
const errorMessage = ref("");
const isSaving = ref(false);
let scanner: Html5Qrcode | null = null;

async function startCamera() {
    cameraError.value = "";
    try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner ??= new Html5Qrcode(readerId);
        await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 220 },
            (decoded) => {
                token.value = decoded;
                errorMessage.value = "";
                // Berhenti setelah terbaca agar tidak terus membaca kartu lain
                stopCamera();
            },
            () => {},
        );
    } catch {
        cameraError.value =
            "Kamera tidak dapat dibuka. Izinkan akses kamera di browser, atau gunakan perangkat yang memiliki kamera.";
    }
}

async function stopCamera() {
    if (scanner?.isScanning) await scanner.stop().catch(() => {});
}

async function rescan() {
    token.value = "";
    errorMessage.value = "";
    await startCamera();
}

watch(
    () => props.open,
    async (open) => {
        if (open) {
            token.value = "";
            errorMessage.value = "";
            await nextTick();
            await startCamera();
        } else {
            await stopCamera();
            scanner = null;
        }
    },
);
onBeforeUnmount(stopCamera);

async function submit() {
    if (!token.value) return;
    isSaving.value = true;
    errorMessage.value = "";
    try {
        const res = await api<{ message: string }>(`/api/students/${props.studentUuid}/register-qr`, {
            method: "POST",
            body: { token: token.value },
        });
        emit("saved", res.message);
    } catch (err) {
        errorMessage.value = getErrorMessage(err, "Gagal mendaftarkan kartu QR.");
    } finally {
        isSaving.value = false;
    }
}

function close() {
    if (!isSaving.value) emit("close");
}
</script>
