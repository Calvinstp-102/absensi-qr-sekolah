<template>
    <div>
        <h1 class="text-2xl font-heading font-bold text-gray-800 mb-1">
            Log Aktivitas
        </h1>
        <p class="text-gray-500 text-sm mb-6">
            Riwayat perubahan data oleh semua guru
        </p>

        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden"
        >
            <table class="w-full text-sm">
                <thead
                    class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                    <tr>
                        <th class="p-3">Waktu</th>
                        <th class="p-3">Guru</th>
                        <th class="p-3">Aksi</th>
                        <th class="p-3">Entitas</th>
                        <th class="p-3">Alasan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="pending">
                        <td colspan="5" class="p-6 text-center text-gray-400">
                            Memuat...
                        </td>
                    </tr>
                    <tr v-else-if="!data?.logs?.length">
                        <td colspan="5" class="p-6 text-center text-gray-400">
                            Belum ada aktivitas tercatat.
                        </td>
                    </tr>
                    <tr
                        v-for="(log, idx) in data?.logs"
                        :key="log.id"
                        class="border-t border-gray-100"
                        :class="idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'"
                    >
                        <td class="p-3 whitespace-nowrap text-gray-500">
                            {{ formatDateTime(log.dateCreated) }}
                        </td>
                        <td class="p-3 font-medium text-gray-700">
                            {{ log.teacher.nama }}
                        </td>
                        <td class="p-3">
                            <span
                                class="px-2.5 py-1 rounded-full text-xs font-medium"
                                :class="actionClass(log.actionType)"
                            >
                                {{ actionLabel(log.actionType) }}
                            </span>
                        </td>
                        <td class="p-3 text-gray-500">
                            {{ entityLabel(log.entityType) }}
                        </td>
                        <td class="p-3 text-gray-600">
                            {{ log.reason || "-" }}
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
                        <option :value="15">15</option>
                        <option :value="25">25</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                    </select>
                    <span class="text-xs text-gray-400">
                        dari {{ data?.pagination.total ?? 0 }} aktivitas
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
    </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";

const currentPage = ref(1);
const pageSize = ref(5);

const { data, pending } = await useFetch("/api/audit-logs", {
    query: computed(() => ({
        page: currentPage.value,
        pageSize: pageSize.value,
    })),
});

function formatDateTime(d: string) {
    return dayjs(d).format("DD MMM YYYY, HH:mm");
}

const actionLabels: Record<string, string> = {
    change_student_status: "Ubah Status Siswa",
    change_class: "Pindah/Naik Kelas",
    promote_class: "Naik Kelas (Massal)",
    regenerate_qr: "Generate QR",
    register_qr: "Daftarkan QR",
    delete_qr: "Hapus QR",
    correct_attendance: "Koreksi Absensi",
    update_setting: "Ubah Pengaturan",
    update_student: "Update Data Siswa",
    delete_student: "Hapus Siswa",
    update_teacher: "Update Data Guru",
    delete_teacher: "Hapus Guru",
};

function actionLabel(action: string) {
    return actionLabels[action] ?? action;
}

function actionClass(action: string) {
    if (action.startsWith("delete_")) return "bg-red-100 text-red-700";
    if (action.startsWith("regenerate_") || action.startsWith("register_"))
        return "bg-accent-100 text-accent-700";
    if (action === "correct_attendance") return "bg-amber-100 text-amber-700";
    return "bg-primary-100 text-primary-700";
}

const entityLabels: Record<string, string> = {
    student: "Siswa",
    attendance: "Absensi",
    settings: "Pengaturan",
    teacher: "Guru",
};

function entityLabel(entity: string) {
    return entityLabels[entity] ?? entity;
}
</script>
