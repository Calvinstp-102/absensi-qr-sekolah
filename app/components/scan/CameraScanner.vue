<template>
    <div>
        <div class="relative rounded-xl overflow-hidden bg-gray-900 min-h-[260px]">
            <div :id="readerId" class="scan-reader w-full"></div>

            <!-- Status kamera -->
            <div
                v-if="status !== 'running'"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            >
                <template v-if="status === 'starting'">
                    <span class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <p class="text-sm text-white/80">Membuka kamera…</p>
                </template>
                <template v-else-if="status === 'error'">
                    <svg class="w-10 h-10 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M3 3l18 18M10.5 6H15l1.5 2H19a2 2 0 012 2v7M17 19H5a2 2 0 01-2-2v-7a2 2 0 012-2h1" />
                    </svg>
                    <p class="text-sm text-white/90 max-w-xs">{{ errorMessage }}</p>
                    <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25"
                        @click="start"
                    >
                        Coba lagi
                    </button>
                </template>
                <template v-else>
                    <svg class="w-10 h-10 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    <p class="text-sm text-white/80">Kamera dijeda</p>
                    <button
                        type="button"
                        class="px-3 py-1.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25"
                        @click="start"
                    >
                        Nyalakan kamera
                    </button>
                </template>
            </div>

            <!-- Sedang memproses / dijeda sementara -->
            <div
                v-else-if="paused"
                class="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs text-center py-1.5"
            >
                {{ pausedLabel }}
            </div>
        </div>

        <!-- Kontrol kamera -->
        <div class="flex flex-wrap items-center gap-2 mt-3">
            <select
                v-if="cameras.length > 1"
                :value="cameraId"
                class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                aria-label="Pilih kamera"
                @change="switchCamera(($event.target as HTMLSelectElement).value)"
            >
                <option v-for="(c, i) in cameras" :key="c.id" :value="c.id">
                    {{ c.label || `Kamera ${i + 1}` }}
                </option>
            </select>
            <p v-else class="flex-1 text-xs text-gray-400">Jarak kartu ±15–20 cm, QR menghadap lurus ke kamera.</p>

            <button
                v-if="torchSupported"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium"
                :class="torchOn ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                @click="toggleTorch"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 2h6l-1 7h4l-8 13 2-9H8z" />
                </svg>
                Senter
            </button>
            <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                :disabled="status === 'starting'"
                @click="status === 'running' ? stop() : start()"
            >
                {{ status === "running" ? "Jeda kamera" : "Nyalakan" }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Html5Qrcode } from "html5-qrcode";

const props = withDefaults(defineProps<{ paused?: boolean; pausedLabel?: string }>(), {
    paused: false,
    pausedLabel: "Memproses…",
});
const emit = defineEmits<{ decoded: [text: string] }>();

const CAMERA_KEY = "scan-camera-id";
const readerId = `scan-reader-${useId()}`;

const status = ref<"idle" | "starting" | "running" | "error">("idle");
const errorMessage = ref("");
const cameras = ref<{ id: string; label: string }[]>([]);
const cameraId = ref("");
const torchSupported = ref(false);
const torchOn = ref(false);
let scanner: Html5Qrcode | null = null;

function cameraErrorMessage(err: unknown) {
    const text = String((err as Error)?.message ?? err);
    if (!window.isSecureContext) {
        return "Kamera hanya bisa dipakai lewat HTTPS atau localhost. Buka aplikasi dari alamat https://, atau gunakan Scanner USB.";
    }
    if (/NotAllowed|Permission/i.test(text)) {
        return "Izin kamera ditolak. Klik ikon gembok/kamera di bilah alamat browser, izinkan kamera, lalu klik Coba lagi.";
    }
    if (/NotFound|Requested device not found|no camera/i.test(text)) {
        return "Kamera tidak ditemukan di perangkat ini. Gunakan Scanner USB atau perangkat lain.";
    }
    if (/NotReadable|Could not start|in use/i.test(text)) {
        return "Kamera sedang dipakai aplikasi/tab lain. Tutup aplikasi tersebut lalu klik Coba lagi.";
    }
    return "Kamera tidak dapat dibuka. Periksa izin kamera di browser lalu klik Coba lagi.";
}

function onDecoded(text: string) {
    if (!props.paused) emit("decoded", text);
}

async function start() {
    if (status.value === "starting" || status.value === "running") return;
    status.value = "starting";
    errorMessage.value = "";
    try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        scanner ??= new Html5Qrcode(readerId, {
            verbose: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            // Pakai pembaca QR bawaan browser bila ada (lebih cepat)
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        });
        cameraId.value ||= localStorage.getItem(CAMERA_KEY) ?? "";
        const config = {
            fps: 12,
            qrbox: (w: number, h: number) => {
                const size = Math.floor(Math.min(w, h) * 0.7);
                return { width: size, height: size };
            },
        };
        try {
            await scanner.start(cameraId.value || { facingMode: "environment" }, config, onDecoded, () => {});
        } catch (e) {
            // Kamera tersimpan sudah tidak ada -> pakai kamera belakang
            if (!cameraId.value) throw e;
            cameraId.value = "";
            localStorage.removeItem(CAMERA_KEY);
            await scanner.start({ facingMode: "environment" }, config, onDecoded, () => {});
        }
        status.value = "running";

        // Daftar kamera baru lengkap setelah izin diberikan
        cameras.value = await Html5Qrcode.getCameras().catch(() => []);
        try {
            torchSupported.value = !!scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported();
        } catch {
            torchSupported.value = false;
        }
        torchOn.value = false;
    } catch (e) {
        status.value = "error";
        errorMessage.value = cameraErrorMessage(e);
    }
}

async function stop() {
    if (scanner?.isScanning) await scanner.stop().catch(() => {});
    status.value = "idle";
    torchOn.value = false;
}

async function switchCamera(id: string) {
    cameraId.value = id;
    localStorage.setItem(CAMERA_KEY, id);
    await stop();
    await start();
}

async function toggleTorch() {
    try {
        await scanner?.getRunningTrackCameraCapabilities().torchFeature().apply(!torchOn.value);
        torchOn.value = !torchOn.value;
    } catch {
        torchSupported.value = false;
    }
}

onMounted(start);
onBeforeUnmount(async () => {
    await stop();
    scanner?.clear();
    scanner = null;
});

defineExpose({ start, stop });
</script>

<style scoped>
.scan-reader :deep(video) {
    display: block;
    width: 100% !important;
}
.scan-reader :deep(#qr-shaded-region) {
    border-color: rgba(0, 0, 0, 0.45) !important;
}
</style>
