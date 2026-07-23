<template>
    <div>
        <div class="mb-6">
            <h1 class="text-2xl font-heading font-bold text-gray-800">
                Scan Absensi
            </h1>
            <p class="text-gray-500 text-sm mt-1">
                Arahkan kamera ke QR pada kartu siswa untuk mencatat kehadiran
                masuk/pulang
            </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Kamera -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div
                    id="qr-reader"
                    class="rounded-xl overflow-hidden border border-gray-100"
                ></div>

                <div class="mt-4 space-y-2">
                    <p
                        class="text-xs font-medium uppercase tracking-wide text-gray-400"
                    >
                        Cara Pakai
                    </p>
                    <div class="flex items-start gap-2 text-sm text-gray-600">
                        <svg
                            class="w-4 h-4 mt-0.5 text-primary-600 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        Pastikan QR pada kartu menghadap lurus ke kamera, jarak
                        sekitar 15-20 cm.
                    </div>
                    <div class="flex items-start gap-2 text-sm text-gray-600">
                        <svg
                            class="w-4 h-4 mt-0.5 text-primary-600 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        Scan pertama tercatat sebagai jam masuk, scan kedua di
                        hari yang sama sebagai jam pulang.
                    </div>
                    <div class="flex items-start gap-2 text-sm text-gray-600">
                        <svg
                            class="w-4 h-4 mt-0.5 text-primary-600 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        Tunggu notifikasi hijau/merah muncul sebelum siswa
                        berikutnya scan.
                    </div>
                </div>
            </div>

            <!-- Hasil scan & riwayat -->
            <div class="space-y-4">
                <!-- Kartu hasil scan -->
                <div
                    class="rounded-xl border shadow-md p-6 transition-colors"
                    :class="
                        feedback
                            ? feedback.success
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-100'
                    "
                >
                    <template v-if="!feedback">
                        <div
                            class="flex flex-col items-center text-center py-6"
                        >
                            <svg
                                class="w-10 h-10 text-gray-300 mb-2"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                            >
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect
                                    x="14"
                                    y="3"
                                    width="7"
                                    height="7"
                                    rx="1"
                                />
                                <rect
                                    x="3"
                                    y="14"
                                    width="7"
                                    height="7"
                                    rx="1"
                                />
                                <path d="M14 14h3v3h-3zM20 14v3M17 20h3" />
                            </svg>
                            <p class="text-gray-400 text-sm">
                                Siap memindai, arahkan kartu siswa ke kamera
                            </p>
                        </div>
                    </template>

                    <template v-else-if="feedback.success">
                        <div class="flex items-center gap-3 mb-4">
                            <div
                                class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0"
                            >
                                <svg
                                    class="w-5 h-5 text-green-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            </div>
                            <div>
                                <p
                                    class="text-xs uppercase tracking-wide text-green-600 font-medium"
                                >
                                    {{
                                        feedback.type === "masuk"
                                            ? "Absen Masuk"
                                            : "Absen Pulang"
                                    }}
                                </p>
                                <p
                                    class="text-2xl font-heading font-bold text-gray-800"
                                >
                                    {{ feedback.jam }}
                                </p>
                            </div>
                        </div>
                        <div
                            class="space-y-1 text-sm border-t border-green-200 pt-3"
                        >
                            <p>
                                <span class="text-gray-500">Nama</span>
                                <span
                                    class="font-medium text-gray-800 float-right"
                                    >{{ feedback.nama }}</span
                                >
                            </p>
                            <p>
                                <span class="text-gray-500">Kelas</span>
                                <span
                                    class="font-medium text-gray-800 float-right"
                                    >{{ feedback.kelas }}</span
                                >
                            </p>
                            <p>
                                <span class="text-gray-500">NISN</span>
                                <span
                                    class="font-medium text-gray-800 float-right"
                                    >{{ feedback.nisn || "-" }}</span
                                >
                            </p>
                        </div>
                    </template>

                    <template v-else>
                        <div class="flex items-center gap-3">
                            <div
                                class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"
                            >
                                <svg
                                    class="w-5 h-5 text-red-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </div>
                            <div>
                                <p
                                    class="text-xs uppercase tracking-wide text-red-600 font-medium"
                                >
                                    Gagal
                                </p>
                                <p class="text-sm text-gray-700">
                                    {{ feedback.subtitle }}
                                </p>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Riwayat scan hari ini -->
                <div
                    class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden"
                >
                    <p
                        class="text-xs font-medium uppercase tracking-wide text-gray-400 px-4 py-3 border-b border-gray-100"
                    >
                        Riwayat Scan Sesi Ini
                    </p>
                    <div
                        v-if="!recentScans.length"
                        class="p-6 text-center text-gray-400 text-sm"
                    >
                        Belum ada scan pada sesi ini.
                    </div>
                    <div
                        v-else
                        class="max-h-80 overflow-y-auto divide-y divide-gray-50"
                    >
                        <div
                            v-for="item in recentScans"
                            :key="item.id"
                            class="flex items-center gap-3 px-4 py-3"
                        >
                            <div
                                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                :class="
                                    item.type === 'masuk'
                                        ? 'bg-green-100'
                                        : 'bg-primary-100'
                                "
                            >
                                <svg
                                    v-if="item.type === 'masuk'"
                                    class="w-4 h-4 text-green-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                                <svg
                                    v-else
                                    class="w-4 h-4 text-primary-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p
                                    class="text-sm font-medium text-gray-700 truncate"
                                >
                                    {{ item.nama }}
                                </p>
                                <p class="text-xs text-gray-400">
                                    {{ item.kelas }} ·
                                    {{
                                        item.type === "masuk"
                                            ? "Masuk"
                                            : "Pulang"
                                    }}
                                </p>
                            </div>
                            <p class="text-sm text-gray-500 shrink-0">
                                {{ item.jam }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Html5Qrcode } from "html5-qrcode";
import dayjs from "dayjs";

const feedback = ref<{
    success: boolean;
    type?: string;
    jam?: string;
    nama?: string;
    kelas?: string;
    nisn?: string;
    subtitle?: string;
} | null>(null);

const recentScans = ref<
    { id: number; type: string; jam: string; nama: string; kelas: string }[]
>([]);

let scanner: Html5Qrcode | null = null;
let isProcessing = false;

onMounted(async () => {
    scanner = new Html5Qrcode("qr-reader");
    await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        () => {},
    );
});

onBeforeUnmount(() => {
    scanner?.stop().catch(() => {});
});

async function onScanSuccess(decodedText: string) {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const res: any = await $fetch("/api/attendance/scan", {
            method: "POST",
            body: { token: decodedText, deviceInfo: navigator.userAgent },
        });
        const jam = dayjs(res.waktu).format("HH:mm");
        feedback.value = {
            success: true,
            type: res.type,
            jam,
            nama: res.student.nama,
            kelas: res.student.kelas,
            nisn: res.student.nisn,
        };
        recentScans.value.unshift({
            id: Date.now(),
            type: res.type,
            jam,
            nama: res.student.nama,
            kelas: res.student.kelas,
        });
        if (recentScans.value.length > 20) recentScans.value.pop();
    } catch (err: any) {
        feedback.value = {
            success: false,
            subtitle: err?.data?.statusMessage || "Terjadi kesalahan",
        };
    } finally {
        setTimeout(() => {
            feedback.value = null;
            isProcessing = false;
        }, 3000);
    }
}
</script>

<style scoped>
#qr-reader {
    min-height: 280px;
}
</style>
