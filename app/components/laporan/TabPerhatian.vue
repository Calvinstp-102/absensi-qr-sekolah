<template>
    <div class="space-y-4">
        <form class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-4" @submit.prevent="terapkan">
            <div>
                <label for="pp-persen" class="block text-xs font-medium text-gray-600 mb-1">Kehadiran di bawah</label>
                <div class="relative w-28">
                    <input id="pp-persen" v-model.number="input.minPersen" type="number" min="0" max="100" class="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm" />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
            </div>
            <div>
                <label for="pp-alpa" class="block text-xs font-medium text-gray-600 mb-1">Alpa minimal</label>
                <div class="relative w-28">
                    <input id="pp-alpa" v-model.number="input.maxAlpa" type="number" min="1" class="w-full border border-gray-300 rounded-lg pl-3 pr-12 py-2 text-sm" />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">hari</span>
                </div>
            </div>
            <div>
                <label for="pp-telat" class="block text-xs font-medium text-gray-600 mb-1">Terlambat minimal</label>
                <div class="relative w-28">
                    <input id="pp-telat" v-model.number="input.maxTerlambat" type="number" min="1" class="w-full border border-gray-300 rounded-lg pl-3 pr-12 py-2 text-sm" />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kali</span>
                </div>
            </div>
            <button type="submit" class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">Terapkan</button>
            <p v-if="inputError" class="text-xs text-red-600 w-full">{{ inputError }}</p>
            <div class="ml-auto">
                <LaporanExportMenu laporan="perhatian" :query="fullQuery" :disabled="!rows.length" />
            </div>
        </form>

        <p v-if="data" class="text-sm text-gray-600">
            <strong>{{ rows.length }}</strong> dari {{ data.totalSiswa }} siswa memenuhi salah satu kriteria.
        </p>

        <div v-if="error && !data" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center text-sm text-red-600">
            {{ getErrorMessage(error, "Gagal memuat laporan.") }}
        </div>
        <div v-else-if="pending && !data" class="h-48 rounded-xl bg-gray-100 animate-pulse" />
        <div v-else-if="!rows.length" class="bg-white rounded-xl border border-gray-100 shadow-md p-12 text-center">
            <p class="font-medium text-gray-700">Tidak ada siswa yang perlu perhatian 🎉</p>
            <p class="text-sm text-gray-500 mt-1">Semua siswa di filter ini di atas ambang yang ditentukan.</p>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3" :class="{ 'opacity-60': pending }">
            <article v-for="r in rows" :key="r.student.uuid" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3">
                <UserAvatar :nama="r.student.nama" :uuid="r.student.uuid" :foto-path="r.student.fotoPath" kind="students" size="md" />
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <NuxtLink :to="`/siswa/${r.student.uuid}`" class="font-semibold text-gray-800 hover:text-primary-600">{{ r.student.nama }}</NuxtLink>
                            <p class="text-xs text-gray-400">{{ r.student.kelasLabel }}</p>
                        </div>
                        <span class="text-lg font-heading font-bold tabular-nums" :class="r.persen !== null ? textColor(r.persen) : 'text-gray-300'">
                            {{ fmtPersen(r.persen) }}
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-2">
                        <span v-for="a in r.alasan" :key="a" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">{{ a }}</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        Hadir {{ r.hadir }}/{{ r.efektif }} hari · Terlambat {{ r.T + r.D }} · Sakit {{ r.S }} · Izin {{ r.I }} · Alpa {{ r.A }}
                    </p>
                    <div class="flex items-center gap-3 mt-2 text-xs">
                        <span class="text-gray-500">Ortu: {{ r.namaOrtu || "–" }}<template v-if="r.noHpOrtu"> · {{ r.noHpOrtu }}</template></span>
                        <a
                            v-if="waLink(r.noHpOrtu)"
                            :href="waLink(r.noHpOrtu, pesanWa(r.student.nama))!"
                            target="_blank"
                            rel="noopener"
                            class="font-medium text-green-700 hover:underline"
                        >
                            WhatsApp
                        </a>
                    </div>
                </div>
            </article>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ query: Record<string, string | undefined> }>();

const input = reactive({ minPersen: 80, maxAlpa: 3, maxTerlambat: 5 });
const ambang = ref({ ...input });
const inputError = ref("");

function terapkan() {
    inputError.value = "";
    const ok =
        Number.isFinite(input.minPersen) && input.minPersen >= 0 && input.minPersen <= 100 &&
        Number.isInteger(input.maxAlpa) && input.maxAlpa >= 1 &&
        Number.isInteger(input.maxTerlambat) && input.maxTerlambat >= 1;
    if (!ok) {
        inputError.value = "Kehadiran 0–100%, alpa & terlambat minimal 1 (bilangan bulat).";
        return;
    }
    ambang.value = { ...input };
}

const fullQuery = computed(() => ({
    ...props.query,
    minPersen: String(ambang.value.minPersen),
    maxAlpa: String(ambang.value.maxAlpa),
    maxTerlambat: String(ambang.value.maxTerlambat),
}));

const { data, pending, error } = useApiFetch("/api/reports/perhatian", { query: fullQuery });
const rows = computed(() => data.value?.data ?? []);

function pesanWa(nama: string) {
    return `Selamat siang Bapak/Ibu, kami dari sekolah ingin menginformasikan kehadiran ananda ${nama}.`;
}
</script>
