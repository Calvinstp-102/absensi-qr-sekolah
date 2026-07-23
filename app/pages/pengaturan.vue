<template>
    <div class="max-w-3xl">
        <h1 class="text-2xl font-heading font-bold text-gray-800 mb-1">
            Pengaturan
        </h1>
        <p class="text-gray-500 text-sm mb-6">
            Konfigurasi jam operasional, aturan kehadiran, dan identitas sekolah
        </p>

        <form @submit.prevent="handleSave" class="space-y-6">
            <!-- Identitas Sekolah -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div class="flex items-center gap-2 mb-4">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-4 h-4 text-primary-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            Identitas Sekolah
                        </p>
                        <p class="text-xs text-gray-400">
                            Ditampilkan di header dashboard dan laporan PDF
                        </p>
                    </div>
                </div>
                <div class="space-y-3">
                    <div
                        v-for="key in [
                            'nama_sekolah',
                            'alamat_sekolah',
                            'npsn',
                        ]"
                        :key="key"
                    >
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >{{ fieldMeta[key].label }}</label
                        >
                        <input
                            v-model="getField(key).value"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                </div>
            </div>

            <!-- Jam Operasional -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div class="flex items-center gap-2 mb-4">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-4 h-4 text-primary-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            Jam Operasional
                        </p>
                        <p class="text-xs text-gray-400">
                            Jam masuk berlaku sama untuk semua jenjang, jam
                            pulang berbeda per jenjang
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Jam Masuk (Semua Jenjang)</label
                        >
                        <input
                            v-model="getField('jam_masuk_global').value"
                            type="time"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div></div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Jam Pulang TK</label
                        >
                        <input
                            v-model="getField('jam_pulang_tk').value"
                            type="time"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Jam Pulang SD</label
                        >
                        <input
                            v-model="getField('jam_pulang_sd').value"
                            type="time"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Jam Pulang SMP</label
                        >
                        <input
                            v-model="getField('jam_pulang_smp').value"
                            type="time"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                </div>
            </div>

            <!-- Aturan Kehadiran -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div class="flex items-center gap-2 mb-4">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-4 h-4 text-primary-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                            />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            Aturan Kehadiran
                        </p>
                        <p class="text-xs text-gray-400">
                            Menentukan kapan status Terlambat dan Tidak Hadir
                            otomatis ditandai
                        </p>
                    </div>
                </div>
                <div class="space-y-3">
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Toleransi Keterlambatan</label
                        >
                        <div class="flex items-center gap-2">
                            <input
                                v-model="
                                    getField('toleransi_telat_menit').value
                                "
                                type="number"
                                min="0"
                                class="w-32 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            />
                            <span class="text-sm text-gray-500"
                                >menit setelah jam masuk</span
                            >
                        </div>
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Batas Waktu Tidak Hadir</label
                        >
                        <div class="flex items-center gap-2">
                            <input
                                v-model="
                                    getField('tidak_hadir_delay_menit').value
                                "
                                type="number"
                                min="0"
                                class="w-32 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            />
                            <span class="text-sm text-gray-500"
                                >menit setelah status Terlambat, jika masih
                                belum absen</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tahun Ajaran -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div class="flex items-center gap-2 mb-4">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-4 h-4 text-primary-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            Tahun Ajaran
                        </p>
                        <p class="text-xs text-gray-400">
                            Dipakai untuk mencatat histori naik kelas & pindah
                            kelas
                        </p>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-600"
                        >Tahun Ajaran Aktif</label
                    >
                    <input
                        v-model="getField('tahun_ajaran_aktif').value"
                        placeholder="misal: 2026/2027"
                        class="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                </div>
            </div>

            <!-- QR Code -->
            <div
                class="bg-white rounded-xl border border-gray-100 shadow-md p-5"
            >
                <div class="flex items-center gap-2 mb-4">
                    <div
                        class="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-4 h-4 text-primary-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <path d="M14 14h7v7h-7z" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            QR Code
                        </p>
                        <p class="text-xs text-gray-400">
                            Masa berlaku QR lama saat digenerate ulang
                        </p>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-600"
                        >Masa Tenggang QR Lama</label
                    >
                    <div class="flex items-center gap-2">
                        <input
                            v-model="getField('qr_grace_period_hari').value"
                            type="number"
                            min="0"
                            class="w-32 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <span class="text-sm text-gray-500"
                            >hari sebelum QR lama otomatis nonaktif</span
                        >
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3 sticky bottom-4">
                <button
                    type="submit"
                    :disabled="isSaving"
                    class="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 shadow-lg"
                >
                    {{ isSaving ? "Menyimpan..." : "Simpan Semua Pengaturan" }}
                </button>
                <p v-if="successMessage" class="text-green-600 text-sm">
                    {{ successMessage }}
                </p>
                <p v-if="errorMessage" class="text-red-600 text-sm">
                    {{ errorMessage }}
                </p>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
const { data } = await useFetch("/api/settings");

const fieldMeta: Record<string, { label: string }> = {
    nama_sekolah: { label: "Nama Sekolah" },
    alamat_sekolah: { label: "Alamat Sekolah" },
    npsn: { label: "NPSN" },
    jam_masuk_global: { label: "Jam Masuk" },
    jam_pulang_tk: { label: "Jam Pulang TK" },
    jam_pulang_sd: { label: "Jam Pulang SD" },
    jam_pulang_smp: { label: "Jam Pulang SMP" },
    toleransi_telat_menit: { label: "Toleransi Keterlambatan" },
    tidak_hadir_delay_menit: { label: "Batas Waktu Tidak Hadir" },
    tahun_ajaran_aktif: { label: "Tahun Ajaran Aktif" },
    qr_grace_period_hari: { label: "Masa Tenggang QR Lama" },
};

const form = reactive(
    (data.value ?? []).map((s) => ({
        key: s.key,
        value: s.value,
        description: s.description,
    })),
);

function getField(key: string) {
    let field = form.find((f) => f.key === key);
    if (!field) {
        field = { key, value: "", description: "" };
        form.push(field);
    }
    return field;
}

const isSaving = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

async function handleSave() {
    successMessage.value = "";
    errorMessage.value = "";
    isSaving.value = true;
    try {
        await $fetch("/api/settings", {
            method: "PATCH",
            body: { items: form.map((s) => ({ key: s.key, value: s.value })) },
        });
        successMessage.value = "Pengaturan berhasil disimpan.";
        setTimeout(() => {
            successMessage.value = "";
        }, 3000);
    } catch (err: any) {
        errorMessage.value = err?.data?.statusMessage || "Gagal menyimpan";
    } finally {
        isSaving.value = false;
    }
}
</script>
