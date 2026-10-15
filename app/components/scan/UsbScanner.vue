<template>
    <div>
        <div
            class="rounded-xl border-2 border-dashed p-6 text-center transition-colors"
            :class="
                !ready
                    ? 'border-amber-300 bg-amber-50'
                    : flash
                      ? 'border-green-400 bg-green-50'
                      : 'border-primary-100 bg-primary-50'
            "
        >
            <div
                class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                :class="ready ? 'bg-primary-600 text-white' : 'bg-amber-200 text-amber-800'"
            >
                <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                    <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
                </svg>
            </div>
            <template v-if="ready">
                <p class="font-heading font-bold text-gray-800">
                    <span class="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1.5 align-middle"></span>
                    Siap menerima scan
                </p>
                <p class="text-sm text-gray-500 mt-1">
                    Arahkan scanner USB ke kartu QR. Tidak perlu klik apa pun di layar.
                </p>
            </template>
            <template v-else>
                <p class="font-heading font-bold text-amber-800">Scan dijeda</p>
                <p class="text-sm text-amber-700 mt-1">{{ pausedReason }}</p>
            </template>
        </div>

        <!-- Cadangan: ketik/tempel kode QR -->
        <form class="flex gap-2 mt-3" @submit.prevent="submitManual">
            <input
                v-model="manualToken"
                type="text"
                autocomplete="off"
                spellcheck="false"
                data-usb-ignore
                placeholder="Atau ketik/tempel kode QR lalu Enter"
                class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <button
                type="submit"
                :disabled="!manualToken.trim() || paused"
                class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
                Kirim
            </button>
        </form>
    </div>
</template>

<script setup lang="ts">
// Scanner USB / barcode gun bekerja seperti keyboard: mengetik isi QR sangat cepat lalu Enter.
// Ketikan ditangkap lewat listener global, jadi tidak perlu fokus ke input mana pun.
const props = withDefaults(defineProps<{ paused?: boolean }>(), { paused: false });
const emit = defineEmits<{ decoded: [text: string] }>();

// Jeda antar karakter dari scanner biasanya < 30 ms; ketikan manusia jauh lebih lambat
const MAX_GAP_MS = 80;
const MIN_LENGTH = 6;

const manualToken = ref("");
const typingElsewhere = ref(false);
const flash = ref(false);
let buffer = "";
let lastKeyAt = 0;

const ready = computed(() => !props.paused && !typingElsewhere.value);
const pausedReason = computed(() =>
    props.paused
        ? "Sedang memproses atau ada jendela yang terbuka."
        : "Kursor sedang berada di kolom isian lain. Klik area kosong halaman agar scanner bisa dipakai.",
);

function isEditable(el: EventTarget | null) {
    if (!(el instanceof HTMLElement)) return false;
    return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function onKeydown(e: KeyboardEvent) {
    if (isEditable(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
    const now = performance.now();
    if (now - lastKeyAt > MAX_GAP_MS) buffer = "";
    lastKeyAt = now;

    if (e.key === "Enter") {
        const text = buffer.trim();
        buffer = "";
        if (text.length >= MIN_LENGTH && !props.paused) {
            e.preventDefault();
            emitDecoded(text);
        }
        return;
    }
    if (e.key.length === 1) buffer += e.key;
}

function onFocusChange() {
    const el = document.activeElement;
    typingElsewhere.value = isEditable(el) && !(el as HTMLElement).hasAttribute("data-usb-ignore");
}

// Saat fokus keluar, activeElement baru terisi di tick berikutnya
function onFocusOut() {
    setTimeout(onFocusChange);
}

function emitDecoded(text: string) {
    flash.value = true;
    setTimeout(() => (flash.value = false), 400);
    emit("decoded", text);
}

function submitManual() {
    const text = manualToken.value.trim();
    if (!text || props.paused) return;
    manualToken.value = "";
    emitDecoded(text);
}

onMounted(() => {
    window.addEventListener("keydown", onKeydown);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusOut);
    // Lepas fokus dari tombol/kolom sebelumnya agar scan langsung bisa dipakai
    (document.activeElement as HTMLElement | null)?.blur?.();
    onFocusChange();
});
onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown);
    document.removeEventListener("focusin", onFocusChange);
    document.removeEventListener("focusout", onFocusOut);
});
</script>
