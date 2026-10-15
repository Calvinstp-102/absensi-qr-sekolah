<template>
    <div>
        <!-- Header: judul, jam WIB, jadwal -->
        <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
                <h1 class="font-heading font-bold text-gray-800" :class="kiosk ? 'text-3xl' : 'text-2xl'">Scan Absensi</h1>
                <p class="text-gray-500 text-sm mt-1">{{ today?.hari.label ?? "Memuat jadwal hari ini…" }}</p>
                <div v-if="today" class="flex flex-wrap gap-1.5 mt-2 text-xs">
                    <span class="px-2 py-1 rounded-md bg-white border border-gray-100 text-gray-600">
                        Masuk <b>{{ today.jadwal.jamMasuk }}</b>
                    </span>
                    <span class="px-2 py-1 rounded-md bg-white border border-gray-100 text-gray-600">
                        Terlambat setelah <b>{{ today.jadwal.batasTelat }}</b>
                    </span>
                    <span class="px-2 py-1 rounded-md bg-white border border-gray-100 text-gray-600">
                        Tidak hadir setelah <b>{{ today.jadwal.tidakHadir }}</b>
                    </span>
                    <span
                        class="px-2 py-1 rounded-md bg-white border border-gray-100 text-gray-600"
                        :title="`Absen pulang dibuka: ${pulangDibukaLabel}`"
                    >
                        Pulang {{ pulangLabel }}
                    </span>
                </div>
            </div>
            <div class="text-right">
                <p class="font-heading font-bold text-gray-800 tabular-nums leading-none" :class="kiosk ? 'text-5xl' : 'text-4xl'">
                    {{ clock }}
                </p>
                <p class="text-xs text-gray-400 mt-1">WIB · jam server</p>
            </div>
        </div>

        <!-- Bukan hari sekolah -->
        <div
            v-if="today && !today.hari.isSchoolDay"
            class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-5"
        >
            <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M9 15l6 0" />
            </svg>
            <div>
                <p class="font-medium text-red-700">{{ today.hari.alasan }}</p>
                <p class="text-sm text-red-600">Scan dan absen manual tidak tersedia hari ini.</p>
            </div>
        </div>
        <div
            v-else-if="todayLoadError && !today"
            class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-5 text-sm text-red-700"
        >
            {{ todayLoadError }}
        </div>

        <!-- Libur khusus jenjang -->
        <div
            v-if="today?.hari.isSchoolDay && liburJenjang.length"
            class="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 mb-5"
        >
            <svg class="w-5 h-5 text-violet-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <div>
                <p v-for="alasan in liburJenjang" :key="alasan" class="font-medium text-violet-700">{{ alasan }}</p>
                <p class="text-sm text-violet-600">Scan & absen manual untuk siswa jenjang tersebut ditolak. Jenjang lain berjalan normal.</p>
            </div>
        </div>

        <!-- Bilah kontrol -->
        <div class="flex flex-wrap items-center gap-2 mb-5">
            <div class="flex rounded-lg bg-white border border-gray-200 p-0.5 text-sm font-medium" role="group" aria-label="Mode scan">
                <button
                    type="button"
                    class="px-3 py-1.5 rounded-md"
                    :class="mode === 'otomatis' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                    @click="mode = 'otomatis'"
                >
                    Otomatis
                </button>
                <button
                    type="button"
                    class="px-3 py-1.5 rounded-md"
                    :class="mode === 'pulang_awal' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'"
                    @click="mode = 'pulang_awal'"
                >
                    Izin Pulang Awal
                </button>
            </div>
            <div class="flex rounded-lg bg-white border border-gray-200 p-0.5 text-sm font-medium" role="group" aria-label="Sumber scan">
                <button
                    v-for="s in SOURCES"
                    :key="s.value"
                    type="button"
                    class="px-3 py-1.5 rounded-md"
                    :class="sumber === s.value ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'"
                    @click="setSumber(s.value)"
                >
                    {{ s.label }}
                </button>
            </div>

            <div class="flex-1"></div>

            <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                :title="muted ? 'Nyalakan suara' : 'Matikan suara'"
                @click="toggleMute"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 5L6 9H2v6h4l5 4z" />
                    <path v-if="muted" d="M23 9l-6 6M17 9l6 6" />
                    <path v-else d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />
                </svg>
                <span class="hidden sm:inline">{{ muted ? "Suara mati" : "Suara" }}</span>
            </button>
            <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                :title="kiosk ? 'Keluar layar penuh' : 'Layar penuh (mode kiosk)'"
                @click="toggleKiosk"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="kiosk" d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
                    <path v-else d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
                </svg>
                <span class="hidden sm:inline">{{ kiosk ? "Keluar layar penuh" : "Layar penuh" }}</span>
            </button>
            <button
                type="button"
                :disabled="!schoolDay"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                @click="openManual(null)"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                </svg>
                Absen Manual
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <!-- Scanner -->
            <div class="lg:col-span-2 space-y-4">
                <div
                    class="bg-white rounded-xl border-2 shadow-md p-4"
                    :class="mode === 'pulang_awal' ? 'border-orange-300' : 'border-transparent'"
                >
                    <div
                        v-if="mode === 'pulang_awal'"
                        class="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 mb-3"
                    >
                        <p class="flex-1 text-sm text-orange-800">
                            <b>Mode Izin Pulang Awal.</b> Scan kartu siswa yang pulang lebih awal, lalu isi alasannya.
                            Kembali ke Otomatis setelah 1 siswa.
                        </p>
                        <button type="button" class="text-xs text-orange-700 underline shrink-0" @click="mode = 'otomatis'">
                            Batal
                        </button>
                    </div>

                    <ClientOnly>
                        <ScanCameraScanner
                            v-if="sumber === 'kamera'"
                            :paused="paused"
                            :paused-label="pausedLabel"
                            @decoded="handleDecoded"
                        />
                        <ScanUsbScanner v-else :paused="paused" @decoded="handleDecoded" />
                        <template #fallback>
                            <div class="rounded-xl bg-gray-100 min-h-[260px] animate-pulse"></div>
                        </template>
                    </ClientOnly>
                </div>

                <div v-if="!kiosk" class="bg-white rounded-xl border border-gray-100 shadow-md p-4 space-y-2 text-sm text-gray-600">
                    <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Cara kerja</p>
                    <p>• Scan pertama = <b>absen masuk</b>. Lewat jam {{ today?.jadwal.batasTelat ?? "batas" }} dicatat Terlambat.</p>
                    <p>
                        • Scan berikutnya = <b>absen pulang</b>, mulai {{ pulangDibukaLabel }}. Kartu yang terbaca lagi dalam
                        {{ today?.jadwal.scanGandaMenit ?? 5 }} menit diabaikan.
                    </p>
                    <p>• Pulang sebelum jamnya: pakai mode <b>Izin Pulang Awal</b>. Kartu tertinggal: <b>Absen Manual</b>.</p>
                    <p>
                        • Salah scan bisa dibatalkan dari kartu hasil atau daftar aktivitas
                        <template v-if="!isAdmin">dalam {{ today?.jadwal.batasBatalMenit ?? 10 }} menit</template>.
                    </p>
                </div>
            </div>

            <!-- Hasil & panel hari ini -->
            <div class="lg:col-span-3 space-y-4">
                <ScanResultCard
                    :outcome="outcome"
                    :processing="processing"
                    :progress="progress"
                    :pinned="pinned"
                    :kiosk="kiosk"
                    :disabled="!schoolDay"
                    :idle-title="idleTitle"
                    :idle-hint="idleHint"
                    @cancel="cancelTarget = $event"
                    @toggle-pin="togglePin"
                    @dismiss="clearOutcome"
                />
                <ScanTodayPanel :data="today" :error="!!todayRefreshError" @cancel="cancelTarget = $event" @manual="openManual" />
            </div>
        </div>

        <ScanManualModal
            :open="manualOpen"
            :student="manualStudent"
            @close="manualOpen = false"
            @saved="onManualSaved"
            @failed="onManualFailed"
        />
        <ScanPulangAwalModal
            :preview="preview"
            :token="previewToken"
            :sumber="sumber"
            @close="closePreview"
            @saved="onPulangAwalSaved"
            @failed="onPulangAwalFailed"
        />
        <ScanCancelModal :target="cancelTarget" @close="cancelTarget = null" @cancelled="onCancelled" />
    </div>
</template>

<script setup lang="ts">
import type {
    ScanOutcome,
    ScanPreviewResponse,
    ScanResponse,
    ScanTone,
    TodayResponse,
    TodayStudentRow,
    CancelTarget,
} from "~/types/scan";

useHead({ title: "Scan Absensi" });

const SOURCES = [
    { value: "kamera" as const, label: "Kamera" },
    { value: "usb" as const, label: "Scanner USB" },
];
const SOURCE_KEY = "scan-source";
/** Kartu yang sama terbaca lagi dalam waktu ini diabaikan (kamera terus melihat kartu) */
const SAME_TOKEN_COOLDOWN_MS = 4000;
const SHOW_MS: Record<ScanTone, number> = {
    hadir: 4000,
    terlambat: 5000,
    pulang: 4000,
    pulang_awal: 5000,
    peringatan: 6000,
    gagal: 6000,
};
const POLL_MS = 15000;

// Kode error yang bukan "gagal", hanya pemberitahuan (kuning)
const WARNING_CODES = new Set(["PULANG_BELUM_DIBUKA", "ALREADY_COMPLETE", "ALREADY_RECORDED", "BELUM_MASUK"]);
const ERROR_TITLES: Record<string, string> = {
    QR_NOT_FOUND: "QR tidak dikenal",
    QR_EXPIRED: "QR kedaluwarsa",
    STUDENT_INACTIVE: "Siswa nonaktif",
    NOT_SCHOOL_DAY: "Bukan hari sekolah",
    PULANG_BELUM_DIBUKA: "Belum jam pulang",
    ALREADY_COMPLETE: "Sudah absen lengkap",
    ALREADY_RECORDED: "Sudah tercatat",
    BELUM_MASUK: "Belum absen masuk",
};

const api = useApi({ silent: true });
const toast = useToast();
const { isAdmin } = useAuth();
const { muted, toggleMute, play } = useScanSound();
const kiosk = useState<boolean>("scan-kiosk", () => false);

const mode = ref<"otomatis" | "pulang_awal">("otomatis");
const sumber = ref<"kamera" | "usb">("kamera");

// --- Panel hari ini (polling tanpa overlay)
const today = ref<TodayResponse | null>(null);
const todayLoadError = ref("");
const todayRefreshError = ref(false);
let serverOffsetMs = 0;
let refreshSeq = 0;

async function refreshToday() {
    const seq = ++refreshSeq;
    const sentAt = Date.now();
    try {
        const res = await api<TodayResponse>("/api/attendance/today");
        if (seq !== refreshSeq) return;
        today.value = res;
        todayLoadError.value = "";
        todayRefreshError.value = false;
        // Jam di layar mengikuti jam server, bukan jam perangkat
        serverOffsetMs = new Date(res.serverTime).getTime() - (sentAt + Date.now()) / 2;
    } catch (err) {
        if (seq !== refreshSeq) return;
        todayRefreshError.value = true;
        if (!today.value) todayLoadError.value = getErrorMessage(err, "Gagal memuat jadwal hari ini.");
    }
}

const schoolDay = computed(() => today.value?.hari.isSchoolDay ?? true);
const liburJenjang = computed(() => Object.values(today.value?.hari.liburJenjang ?? {}));
const pulangLabel = computed(() => {
    const p = today.value?.jadwal.jamPulang;
    return p ? `TK ${p.TK.jamPulang} · SD ${p.SD.jamPulang} · SMP ${p.SMP.jamPulang}` : "";
});
const pulangDibukaLabel = computed(() => {
    const p = today.value?.jadwal.jamPulang;
    return p ? `TK ${p.TK.bukaPulang} · SD ${p.SD.bukaPulang} · SMP ${p.SMP.bukaPulang}` : "jam pulang";
});

// --- Jam WIB berjalan
const clock = ref("--.--.--");
function tick() {
    clock.value = new Date(Date.now() + serverOffsetMs).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

// --- Modal
const manualOpen = ref(false);
const manualStudent = ref<TodayStudentRow | null>(null);
const cancelTarget = ref<CancelTarget | null>(null);
const preview = ref<ScanPreviewResponse | null>(null);
const previewToken = ref("");

// --- Scan
const processing = ref(false);
const paused = computed(
    () => processing.value || manualOpen.value || !!cancelTarget.value || !!preview.value || !schoolDay.value,
);
const pausedLabel = computed(() => {
    if (!schoolDay.value) return "Bukan hari sekolah";
    if (processing.value) return "Memproses…";
    return "Dijeda selama jendela terbuka";
});
const idleTitle = computed(() => {
    if (!schoolDay.value) return "Scan tidak tersedia hari ini";
    return mode.value === "pulang_awal" ? "Scan kartu siswa yang pulang awal" : "Siap memindai";
});
const idleHint = computed(() =>
    sumber.value === "usb"
        ? "Arahkan scanner USB ke kartu QR siswa."
        : "Arahkan kartu QR siswa ke kamera, jarak ±15–20 cm.",
);

let lastToken = "";
let lastTokenAt = 0;
// Ganti mode -> kartu yang sama boleh langsung di-scan lagi
watch(mode, () => (lastToken = ""));

async function handleDecoded(token: string) {
    if (paused.value) return;
    const nowMs = Date.now();
    if (token === lastToken && nowMs - lastTokenAt < SAME_TOKEN_COOLDOWN_MS) return;
    lastToken = token;
    lastTokenAt = nowMs;

    processing.value = true;
    try {
        if (mode.value === "pulang_awal") {
            preview.value = await api<ScanPreviewResponse>("/api/attendance/scan-preview", {
                method: "POST",
                body: { token },
            });
            previewToken.value = token;
            clearOutcome();
        } else {
            const res = await api<ScanResponse>("/api/attendance/scan", {
                method: "POST",
                body: { token, mode: "otomatis", sumber: sumber.value, deviceInfo: navigator.userAgent },
            });
            showResult(res);
            void refreshToday();
        }
    } catch (err) {
        showError(err);
    } finally {
        processing.value = false;
    }
}

function showResult(res: ScanResponse) {
    let tone: ScanTone;
    let judul: string;
    if (res.result === "sudah_tercatat") {
        tone = "peringatan";
        judul = "Sudah tercatat";
    } else if (res.result === "masuk") {
        tone = res.today.statusUtama === "terlambat" ? "terlambat" : "hadir";
        judul = res.today.statusUtama === "terlambat" ? "Masuk · Terlambat" : "Masuk · Tepat waktu";
    } else {
        tone = res.today.pulang?.awal ? "pulang_awal" : "pulang";
        judul = res.today.pulang?.awal ? "Pulang awal" : "Absen pulang";
    }
    setOutcome({
        tone,
        judul,
        pesan: res.message,
        student: res.student,
        waktu: res.waktu,
        jenis: res.jenis,
        today: res.today,
        info: res.info,
    });
}

function showError(err: unknown) {
    if (getErrorStatus(err) === 401) return; // ditangani global (pindah ke login)
    const code = getErrorCode(err) ?? "";
    const student = (err as { data?: { data?: { student?: ScanOutcome["student"] } } })?.data?.data?.student ?? null;
    setOutcome({
        tone: WARNING_CODES.has(code) ? "peringatan" : "gagal",
        judul: ERROR_TITLES[code] ?? "Scan gagal",
        pesan: getErrorMessage(err, "Scan gagal diproses. Coba lagi."),
        student,
        waktu: new Date(Date.now() + serverOffsetMs).toISOString(),
        jenis: null,
        today: null,
        info: null,
    });
}

// --- Kartu hasil: tampil N detik lalu hilang (kecuali disematkan)
const outcome = ref<ScanOutcome | null>(null);
const pinned = ref(false);
const progress = ref(1);
let outcomeSeq = 0;
let outcomeTimer: ReturnType<typeof setInterval> | undefined;

function setOutcome(o: Omit<ScanOutcome, "id">) {
    outcome.value = { ...o, id: ++outcomeSeq };
    play(o.tone);
    startOutcomeTimer();
}

function startOutcomeTimer() {
    clearInterval(outcomeTimer);
    progress.value = 1;
    if (pinned.value || !outcome.value) return;
    const total = SHOW_MS[outcome.value.tone];
    const startedAt = Date.now();
    outcomeTimer = setInterval(() => {
        progress.value = Math.max(0, 1 - (Date.now() - startedAt) / total);
        if (progress.value <= 0) clearOutcome();
    }, 100);
}

function clearOutcome() {
    clearInterval(outcomeTimer);
    outcome.value = null;
    pinned.value = false;
}

function togglePin() {
    pinned.value = !pinned.value;
    startOutcomeTimer();
}

// --- Absen manual
function openManual(row: TodayStudentRow | null) {
    if (!schoolDay.value) return;
    manualStudent.value = row;
    manualOpen.value = true;
}

function onManualSaved(res: ScanResponse) {
    manualOpen.value = false;
    showResult(res);
    void refreshToday();
}

function onManualFailed(err: unknown) {
    manualOpen.value = false;
    showError(err);
    void refreshToday();
}

// --- Izin pulang awal
function closePreview() {
    preview.value = null;
    previewToken.value = "";
}

function onPulangAwalSaved(res: ScanResponse) {
    closePreview();
    mode.value = "otomatis";
    showResult(res);
    void refreshToday();
}

function onPulangAwalFailed(err: unknown) {
    closePreview();
    showError(err);
    void refreshToday();
}

// --- Batal
function onCancelled(message: string) {
    const target = cancelTarget.value;
    cancelTarget.value = null;
    toast.success("Absensi dibatalkan", message);
    if (target && outcome.value?.today?.id === target.attendanceId) clearOutcome();
    void refreshToday();
}

// --- Sumber scan & layar penuh
function setSumber(value: "kamera" | "usb") {
    sumber.value = value;
    localStorage.setItem(SOURCE_KEY, value);
}

async function toggleKiosk() {
    if (kiosk.value) {
        kiosk.value = false;
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        return;
    }
    kiosk.value = true;
    // Perangkat tanpa Fullscreen API (mis. iPhone) tetap dapat tampilan tanpa sidebar
    await document.documentElement.requestFullscreen?.().catch(() => {});
}

function onFullscreenChange() {
    if (!document.fullscreenElement) kiosk.value = false;
}

// --- Siklus hidup
let pollTimer: ReturnType<typeof setInterval> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

function onVisibilityChange() {
    if (!document.hidden) void refreshToday();
}

onMounted(() => {
    const saved = localStorage.getItem(SOURCE_KEY);
    if (saved === "usb" || saved === "kamera") sumber.value = saved;
    tick();
    clockTimer = setInterval(tick, 1000);
    void refreshToday();
    // Polling berhenti selama tab tidak terlihat
    pollTimer = setInterval(() => {
        if (!document.hidden) void refreshToday();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
});

onBeforeUnmount(() => {
    clearInterval(pollTimer);
    clearInterval(clockTimer);
    clearInterval(outcomeTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    kiosk.value = false;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
});
</script>
