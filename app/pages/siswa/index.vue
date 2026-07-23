<template>
    <div>
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">
                    Data Siswa
                </h1>
                <p class="text-gray-500 text-sm mt-1">
                    Kelola data siswa — detail, status, kelas, dan QR ada di
                    halaman Detail
                </p>
            </div>
            <div class="flex items-center gap-2">
                <a
                    href="/api/students/export-qr"
                    target="_blank"
                    class="flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path d="M14 14h3v3h-3zM20 14v3M17 20h3" />
                    </svg>
                    Export Semua QR
                </a>
                <button
                    @click="showAddModal = true"
                    class="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Tambah Siswa
                </button>
            </div>
        </div>

        <!-- Filter -->
        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md p-4 mb-6"
        >
            <div class="flex items-center gap-2 flex-wrap">
                <span
                    class="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1"
                    >Jenjang</span
                >
                <button
                    v-for="opt in jenjangOptions"
                    :key="opt.value"
                    @click="
                        filterJenjang = opt.value;
                        currentPage = 1;
                    "
                    class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    :class="
                        filterJenjang === opt.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    "
                >
                    {{ opt.label }}
                </button>

                <span class="w-px h-5 bg-gray-200 mx-1"></span>

                <span
                    class="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1"
                    >Status</span
                >
                <button
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    @click="
                        filterStatus = opt.value;
                        currentPage = 1;
                    "
                    class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    :class="
                        filterStatus === opt.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    "
                >
                    {{ opt.label }}
                </button>
            </div>
        </div>

        <!-- Table -->
        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden"
        >
            <table class="w-full text-sm">
                <thead
                    class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                    <tr>
                        <th class="p-3">Nama</th>
                        <th class="p-3">NISN</th>
                        <th class="p-3">Jenjang / Kelas</th>
                        <th class="p-3">Status</th>
                        <th class="p-3">QR</th>
                        <th class="p-3">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="pending">
                        <td colspan="6" class="p-6 text-center text-gray-400">
                            Memuat data siswa...
                        </td>
                    </tr>
                    <tr v-else-if="!data?.students?.length">
                        <td colspan="6" class="p-6 text-center text-gray-400">
                            Belum ada data siswa.
                        </td>
                    </tr>
                    <tr
                        v-for="(s, idx) in data?.students"
                        :key="s.id"
                        class="border-t border-gray-100 hover:bg-primary-50/40 transition-colors"
                        :class="idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'"
                    >
                        <td class="p-3">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base overflow-hidden shrink-0"
                                >
                                    <img
                                        v-if="s.fotoPath"
                                        :src="`/api/photos/students/${s.uuid}`"
                                        class="w-full h-full object-cover"
                                    />
                                    <span v-else>{{
                                        s.gender === "L" ? "👦" : "👧"
                                    }}</span>
                                </div>
                                <span class="font-medium text-gray-700">{{
                                    s.nama
                                }}</span>
                            </div>
                        </td>
                        <td class="p-3 text-gray-500">{{ s.nisn || "-" }}</td>
                        <td class="p-3">
                            <span class="text-gray-700">{{ s.jenjang }}</span>
                            <span class="text-gray-400">
                                · {{ s.kelasSekarang }}</span
                            >
                        </td>
                        <td class="p-3">
                            <span
                                :class="
                                    s.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-600'
                                "
                                class="px-2.5 py-1 rounded-full text-xs font-medium"
                            >
                                {{
                                    s.status === "active" ? "Aktif" : "Nonaktif"
                                }}
                            </span>
                        </td>
                        <td class="p-3">
                            <span
                                v-if="s.hasQr"
                                class="text-green-600 text-xs font-medium"
                                >Ada</span
                            >
                            <span v-else class="text-gray-400 text-xs"
                                >Belum ada</span
                            >
                        </td>
                        <td class="p-3">
                            <div class="flex items-center gap-3">
                                <NuxtLink
                                    :to="`/siswa/${s.uuid}`"
                                    class="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-xs font-medium"
                                >
                                    <svg
                                        class="w-3.5 h-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
                                        />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    Detail
                                </NuxtLink>
                                <button
                                    @click="handleDelete(s)"
                                    class="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                    <svg
                                        class="w-3.5 h-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                                        />
                                    </svg>
                                    Hapus
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div
                class="flex items-center justify-between p-3 border-t border-gray-100 text-sm flex-wrap gap-3"
            >
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">Tampilkan</span>
                    <select
                        v-model.number="pageSize"
                        @change="currentPage = 1"
                        class="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                    >
                        <option :value="5">5</option>
                        <option :value="10">10</option>
                        <option :value="25">25</option>
                        <option :value="50">50</option>
                    </select>
                    <span class="text-xs text-gray-400">
                        dari {{ data?.pagination.total ?? 0 }} siswa
                    </span>
                </div>

                <div
                    v-if="data?.pagination && data.pagination.totalPages > 1"
                    class="flex items-center gap-1"
                >
                    <button
                        :disabled="currentPage <= 1"
                        @click="currentPage--"
                        class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                    >
                        Sebelumnya
                    </button>
                    <span class="text-xs text-gray-400 px-2">
                        Hal {{ data.pagination.page }} /
                        {{ data.pagination.totalPages }}
                    </span>
                    <button
                        :disabled="currentPage >= data.pagination.totalPages"
                        @click="currentPage++"
                        class="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
                    >
                        Berikutnya
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal Tambah Siswa -->
        <div
            v-if="showAddModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div
                class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-4">
                    Tambah Siswa
                </h2>

                <form @submit.prevent="handleAddStudent" class="space-y-3">
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Nama Lengkap</label
                        >
                        <input
                            v-model="form.nama"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                class="block text-sm font-medium mb-1 text-gray-600"
                                >NIS
                                <span class="text-gray-400 text-xs"
                                    >(opsional)</span
                                ></label
                            >
                            <input
                                v-model="form.nis"
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            />
                        </div>
                        <div>
                            <label
                                class="block text-sm font-medium mb-1 text-gray-600"
                                >NISN</label
                            >
                            <input
                                v-model="form.nisn"
                                required
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Gender</label
                        >
                        <select
                            v-model="form.gender"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
                            <option value="">Pilih</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Tanggal Lahir</label
                        >
                        <input
                            v-model="form.tanggalLahir"
                            type="date"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Alamat</label
                        >
                        <input
                            v-model="form.alamat"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                class="block text-sm font-medium mb-1 text-gray-600"
                                >Jenjang</label
                            >
                            <select
                                v-model="form.jenjang"
                                required
                                @change="form.kelasSekarang = ''"
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            >
                                <option value="">Pilih</option>
                                <option value="TK">TK</option>
                                <option value="SD">SD</option>
                                <option value="SMP">SMP</option>
                            </select>
                        </div>
                        <div>
                            <label
                                class="block text-sm font-medium mb-1 text-gray-600"
                                >Kelas</label
                            >
                            <select
                                v-model="form.kelasSekarang"
                                required
                                :disabled="!form.jenjang"
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                            >
                                <option value="">Pilih</option>
                                <option
                                    v-for="k in kelasOptionsFor(form.jenjang)"
                                    :key="k"
                                    :value="k"
                                >
                                    {{ k }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Nama Orang Tua/Wali</label
                        >
                        <input
                            v-model="form.namaOrtu"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >No HP Orang Tua/Wali</label
                        >
                        <input
                            v-model="form.noHpOrtu"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>

                    <p v-if="errorMessage" class="text-red-600 text-sm">
                        {{ errorMessage }}
                    </p>

                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            @click="showAddModal = false"
                            class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            :disabled="isSaving"
                            class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                            {{ isSaving ? "Menyimpan..." : "Simpan" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const filterJenjang = ref("");
const filterStatus = ref("");
const currentPage = ref(1);
const pageSize = ref(5);

const jenjangOptions = [
    { value: "", label: "Semua" },
    { value: "TK", label: "TK" },
    { value: "SD", label: "SD" },
    { value: "SMP", label: "SMP" },
];

const statusOptions = [
    { value: "", label: "Semua" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
];

function kelasOptionsFor(jenjang: string) {
    if (jenjang === "TK") return ["TK A", "TK B"];
    if (jenjang === "SD") return ["1", "2", "3", "4", "5", "6"];
    if (jenjang === "SMP") return ["7", "8", "9"];
    return [];
}

const { data, pending, refresh } = await useFetch("/api/students", {
    query: computed(() => ({
        jenjang: filterJenjang.value || undefined,
        status: filterStatus.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
    })),
});

const showAddModal = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

const form = reactive({
    nama: "",
    nis: "",
    nisn: "",
    gender: "",
    tanggalLahir: "",
    alamat: "",
    jenjang: "",
    kelasSekarang: "",
    namaOrtu: "",
    noHpOrtu: "",
});

async function handleAddStudent() {
    errorMessage.value = "";
    isSaving.value = true;
    try {
        await $fetch("/api/students", {
            method: "POST",
            body: { ...form },
        });
        showAddModal.value = false;
        Object.assign(form, {
            nama: "",
            nis: "",
            nisn: "",
            gender: "",
            tanggalLahir: "",
            alamat: "",
            jenjang: "",
            kelasSekarang: "",
            namaOrtu: "",
            noHpOrtu: "",
        });
        await refresh();
    } catch (err: any) {
        errorMessage.value =
            err?.data?.statusMessage || "Gagal menyimpan data siswa";
    } finally {
        isSaving.value = false;
    }
}

const { confirm } = useConfirm();

async function handleDelete(student: any) {
    const ok = await confirm({
        title: "Hapus Siswa",
        message: `Yakin ingin menghapus data ${student.nama}? Data tidak akan tampil lagi di sistem.`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;

    try {
        await $fetch(`/api/students/${student.uuid}`, { method: "DELETE" });
        await refresh();
    } catch (err: any) {
        alert(err?.data?.statusMessage || "Gagal menghapus siswa");
    }
}
</script>
