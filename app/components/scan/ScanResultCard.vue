<template>
    <div
        class="relative rounded-2xl border-2 shadow-md overflow-hidden transition-colors duration-200"
        :class="outcome && !processing ? style.card : 'bg-white border-gray-100'"
        aria-live="polite"
    >
        <!-- Memproses -->
        <div v-if="processing" class="flex flex-col items-center justify-center text-center py-12 px-6">
            <span class="w-10 h-10 border-[3px] border-primary-100 border-t-primary-600 rounded-full animate-spin mb-3"></span>
            <p class="font-heading font-bold text-gray-700">Memproses…</p>
        </div>

        <!-- Siap -->
        <div v-else-if="!outcome" class="flex flex-col items-center justify-center text-center py-12 px-6">
            <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                :class="disabled ? 'bg-gray-100 text-gray-400' : 'bg-primary-50 text-primary-600'"
            >
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM20 14v3M17 20h3" />
                </svg>
            </div>
            <p class="font-heading font-bold text-gray-700" :class="kiosk ? 'text-2xl' : 'text-lg'">
                {{ idleTitle }}
            </p>
            <p class="text-sm text-gray-400 mt-1">{{ idleHint }}</p>
        </div>

        <!-- Hasil -->
        <div v-else :class="kiosk ? 'p-8' : 'p-6'">
            <div class="flex items-start justify-between gap-3 mb-4">
                <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-white"
                    :class="style.badge"
                >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path v-if="outcome.tone === 'gagal'" d="M18 6L6 18M6 6l12 12" />
                        <path v-else-if="outcome.tone === 'peringatan'" d="M12 8v5M12 17h.01" />
                        <path v-else d="M20 6L9 17l-5-5" />
                    </svg>
                    {{ outcome.judul }}
                </span>
                <div class="flex items-center gap-2">
                    <p
                        v-if="outcome.waktu"
                        class="font-heading font-bold tabular-nums"
                        :class="[style.text, kiosk ? 'text-4xl' : 'text-3xl']"
                    >
                        {{ formatJam(outcome.waktu) }}
                    </p>
                    <button
                        type="button"
                        class="p-1.5 rounded-lg hover:bg-black/5"
                        :class="pinned ? style.text : 'text-gray-400'"
                        :title="pinned ? 'Lepas sematan (hilang otomatis)' : 'Sematkan (tidak hilang otomatis)'"
                        @click="emit('togglePin')"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" :fill="pinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                            <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="p-1.5 rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-600"
                        title="Tutup"
                        @click="emit('dismiss')"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div v-if="outcome.student" class="flex items-center gap-4">
                <UserAvatar
                    :nama="outcome.student.nama"
                    :uuid="outcome.student.uuid"
                    :foto-path="outcome.student.fotoPath"
                    kind="students"
                    :size="kiosk ? 'xl' : 'lg'"
                    class="shrink-0 ring-4 ring-white shadow"
                />
                <div class="min-w-0">
                    <p class="font-heading font-bold text-gray-800 leading-tight" :class="kiosk ? 'text-4xl' : 'text-2xl'">
                        {{ outcome.student.nama }}
                    </p>
                    <p class="text-gray-500 mt-1" :class="kiosk ? 'text-lg' : 'text-sm'">
                        {{ outcome.student.kelasLabel }}
                        <span v-if="outcome.student.nisn"> · NISN {{ outcome.student.nisn }}</span>
                    </p>
                </div>
            </div>

            <p class="mt-4 font-medium" :class="[style.text, kiosk ? 'text-xl' : 'text-base']">
                {{ outcome.pesan }}
            </p>

            <!-- Ringkasan hari ini -->
            <div v-if="outcome.today" class="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-gray-600">
                <span>
                    Masuk
                    <b class="tabular-nums">{{ outcome.today.masuk ? formatJam(outcome.today.masuk.waktu) : "–" }}</b>
                    <span v-if="outcome.today.masuk?.metode === 'manual'" class="text-xs text-gray-400"> (manual)</span>
                </span>
                <span>
                    Pulang
                    <b class="tabular-nums">{{ outcome.today.pulang ? formatJam(outcome.today.pulang.waktu) : "–" }}</b>
                    <span v-if="outcome.today.pulang?.awal" class="text-xs text-orange-600"> (pulang awal)</span>
                </span>
            </div>

            <p
                v-if="outcome.info"
                class="mt-3 text-sm text-amber-800 bg-amber-100/70 border border-amber-200 rounded-lg px-3 py-2"
            >
                {{ outcome.info }}
            </p>

            <div v-if="cancelCheck?.boleh" class="mt-4">
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    @click="requestCancel"
                >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 7v6h6M3 13a9 9 0 103-7.7L3 8" />
                    </svg>
                    Batalkan absen {{ outcome.jenis }}
                </button>
            </div>
        </div>

        <!-- Sisa waktu tampil -->
        <div v-if="outcome && !processing && !pinned" class="absolute bottom-0 inset-x-0 h-1 bg-black/5">
            <div class="h-full transition-[width] duration-100 ease-linear" :class="style.badge" :style="{ width: `${progress * 100}%` }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { CancelTarget, ScanOutcome, ScanTone } from "~/types/scan";

const props = withDefaults(
    defineProps<{
        outcome: ScanOutcome | null;
        processing?: boolean;
        /** Sisa waktu tampil, 1 -> 0 */
        progress?: number;
        pinned?: boolean;
        kiosk?: boolean;
        disabled?: boolean;
        idleTitle?: string;
        idleHint?: string;
    }>(),
    {
        processing: false,
        progress: 1,
        pinned: false,
        kiosk: false,
        disabled: false,
        idleTitle: "Siap memindai",
        idleHint: "Arahkan kartu QR siswa ke kamera atau scanner.",
    },
);
const emit = defineEmits<{ cancel: [target: CancelTarget]; togglePin: []; dismiss: [] }>();

const STYLES: Record<ScanTone, { card: string; badge: string; text: string }> = {
    hadir: { card: "bg-green-50 border-green-300", badge: "bg-green-600", text: "text-green-700" },
    terlambat: { card: "bg-amber-50 border-amber-300", badge: "bg-amber-500", text: "text-amber-700" },
    pulang: { card: "bg-sky-50 border-sky-300", badge: "bg-sky-600", text: "text-sky-700" },
    pulang_awal: { card: "bg-orange-50 border-orange-300", badge: "bg-orange-500", text: "text-orange-700" },
    peringatan: { card: "bg-yellow-50 border-yellow-300", badge: "bg-yellow-500", text: "text-yellow-800" },
    gagal: { card: "bg-red-50 border-red-300", badge: "bg-red-600", text: "text-red-700" },
};
const style = computed(() => STYLES[props.outcome?.tone ?? "hadir"]);

const cancelCheck = computed(() => {
    const o = props.outcome;
    if (!o?.today || !o.jenis || o.tone === "gagal" || o.tone === "peringatan") return null;
    return o.today.batal[o.jenis];
});

function requestCancel() {
    const o = props.outcome;
    if (!o?.today || !o.jenis || !o.student || !o.waktu) return;
    emit("cancel", { attendanceId: o.today.id, jenis: o.jenis, student: o.student, waktu: o.waktu });
}
</script>
