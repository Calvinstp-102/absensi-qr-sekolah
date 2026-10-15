<template>
    <div class="flex items-center gap-1.5">
        <button
            v-for="f in FORMATS"
            :key="f.format"
            type="button"
            :disabled="!!busy || disabled"
            :title="disabled ? 'Tidak ada data untuk diexport' : `Unduh ${f.label}`"
            class="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :class="f.class"
            @click="unduh(f.format)"
        >
            <svg v-if="busy === f.format" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.2-8.56" />
            </svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
            </svg>
            {{ f.label }}
        </button>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        /** Jenis laporan (endpoint laporan Modul 5); kosongkan bila memakai `endpoint` lain */
        laporan?: "siswa" | "kelas" | "harian" | "bulanan" | "keterlambatan" | "perhatian" | "aktivitas";
        query: Record<string, unknown>;
        disabled?: boolean;
        /** Endpoint export (default laporan Modul 5) */
        endpoint?: string;
        /** Nama file cadangan tanpa ekstensi */
        namaFile?: string;
    }>(),
    { laporan: undefined, endpoint: "/api/reports/export", namaFile: undefined },
);

const FORMATS = [
    { format: "xlsx" as const, label: "Excel", class: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" },
    { format: "pdf" as const, label: "PDF", class: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
];

const { download } = useDownload();
const toast = useToast();
const busy = ref<"xlsx" | "pdf" | null>(null);

async function unduh(format: "xlsx" | "pdf") {
    busy.value = format;
    const ok = await download(props.endpoint, {
        query: { ...props.query, ...(props.laporan && { laporan: props.laporan }), format },
        fallbackName: `${props.namaFile ?? `laporan-${props.laporan}`}.${format}`,
        errorTitle: "Gagal membuat laporan",
    });
    busy.value = null;
    if (ok) toast.success("Laporan diunduh", `File ${format === "pdf" ? "PDF" : "Excel"} sudah tersimpan di folder unduhan.`);
}
</script>
