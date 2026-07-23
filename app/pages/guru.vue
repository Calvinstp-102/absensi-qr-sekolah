<template>
    <div>
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-heading font-bold text-gray-800">
                    Manajemen Guru
                </h1>
                <p class="text-gray-500 text-sm mt-1">
                    Kelola akun dan peran guru
                </p>
            </div>
            <button
                v-if="isSuperadmin"
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
                Tambah Guru
            </button>
        </div>

        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden"
        >
            <table class="w-full text-sm">
                <thead
                    class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                    <tr>
                        <th class="p-3">Guru</th>
                        <th class="p-3">Email</th>
                        <th class="p-3">No HP</th>
                        <th class="p-3">Role</th>
                        <th class="p-3">Status</th>
                        <th v-if="isSuperadmin" class="p-3">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="pending">
                        <td
                            :colspan="isSuperadmin ? 6 : 5"
                            class="p-6 text-center text-gray-400"
                        >
                            Memuat data guru...
                        </td>
                    </tr>
                    <tr v-else-if="!data?.teachers?.length">
                        <td
                            :colspan="isSuperadmin ? 6 : 5"
                            class="p-6 text-center text-gray-400"
                        >
                            Belum ada data guru.
                        </td>
                    </tr>
                    <tr
                        v-for="(t, idx) in data?.teachers"
                        :key="t.id"
                        class="border-t border-gray-100 hover:bg-primary-50/40 transition-colors"
                        :class="idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'"
                    >
                        <td class="p-3">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base overflow-hidden shrink-0 relative group"
                                >
                                    <img
                                        v-if="t.fotoPath"
                                        :src="`/api/photos/teachers/${t.uuid}?t=${photoVersion}`"
                                        class="w-full h-full object-cover"
                                    />
                                    <span v-else>👤</span>
                                    <label
                                        v-if="
                                            isSuperadmin ||
                                            t.id === currentUserId
                                        "
                                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    >
                                        <svg
                                            class="w-3.5 h-3.5 text-white"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <path
                                                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                                            />
                                            <path
                                                d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                            />
                                        </svg>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            class="hidden"
                                            @change="
                                                (e) =>
                                                    handlePhotoUpload(e, t.uuid)
                                            "
                                        />
                                    </label>
                                </div>
                                <span class="font-medium text-gray-700">{{
                                    t.nama
                                }}</span>
                            </div>
                        </td>
                        <td class="p-3 text-gray-500">{{ t.email }}</td>
                        <td class="p-3 text-gray-500">{{ t.noHp || "-" }}</td>
                        <td class="p-3">
                            <span
                                class="px-2.5 py-1 rounded-full text-xs font-medium"
                                :class="roleClass(t.role)"
                            >
                                {{ roleLabel(t.role) }}
                            </span>
                        </td>
                        <td class="p-3">
                            <span
                                :class="
                                    t.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-600'
                                "
                                class="px-2.5 py-1 rounded-full text-xs font-medium"
                            >
                                {{ t.isActive ? "Aktif" : "Nonaktif" }}
                            </span>
                        </td>
                        <td v-if="isSuperadmin" class="p-3">
                            <div
                                class="flex items-center gap-3 text-xs font-medium"
                            >
                                <button
                                    @click="openEditModal(t)"
                                    class="flex items-center gap-1 text-primary-600 hover:text-primary-800"
                                >
                                    <svg
                                        class="w-3.5 h-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                                        />
                                        <path
                                            d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                        />
                                    </svg>
                                    Edit
                                </button>
                                <button
                                    @click="handleDeleteTeacher(t)"
                                    class="flex items-center gap-1 text-red-600 hover:text-red-800"
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
                        <option :value="10">10</option>
                        <option :value="25">25</option>
                        <option :value="50">50</option>
                    </select>
                    <span class="text-xs text-gray-400">
                        dari {{ data?.pagination.total ?? 0 }} guru
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

        <!-- Modal Tambah Guru -->
        <div
            v-if="showAddModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-4">
                    Tambah Guru
                </h2>
                <form @submit.prevent="handleAdd" class="space-y-3">
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
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Email</label
                        >
                        <input
                            v-model="form.email"
                            required
                            type="email"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >No HP
                            <span class="text-gray-400 text-xs"
                                >(opsional)</span
                            ></label
                        >
                        <input
                            v-model="form.noHp"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Password</label
                        >
                        <input
                            v-model="form.password"
                            required
                            type="password"
                            placeholder="Minimal 6 karakter"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Role</label
                        >
                        <select
                            v-model="form.role"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
                            <option value="">Pilih Role</option>
                            <option value="admin">Admin</option>
                            <option value="guru_piket">Guru Piket</option>
                            <option value="wali_kelas">Wali Kelas</option>
                        </select>
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

        <!-- Modal Edit Guru -->
        <div
            v-if="editingTeacher"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-4">
                    Edit Guru
                </h2>
                <form @submit.prevent="handleEdit" class="space-y-3">
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Nama Lengkap</label
                        >
                        <input
                            v-model="editForm.nama"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Email</label
                        >
                        <input
                            v-model="editForm.email"
                            required
                            type="email"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >No HP</label
                        >
                        <input
                            v-model="editForm.noHp"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Password Baru
                            <span class="text-gray-400 text-xs"
                                >(kosongkan jika tidak diubah)</span
                            ></label
                        >
                        <input
                            v-model="editForm.password"
                            type="password"
                            placeholder="Minimal 6 karakter"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Role</label
                        >
                        <select
                            v-model="editForm.role"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
                            <option value="admin">Admin</option>
                            <option value="guru_piket">Guru Piket</option>
                            <option value="wali_kelas">Wali Kelas</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <input
                            v-model="editForm.isActive"
                            type="checkbox"
                            id="isActive"
                            class="accent-primary-600 w-4 h-4"
                        />
                        <label for="isActive" class="text-sm text-gray-600"
                            >Akun aktif</label
                        >
                    </div>
                    <p v-if="editErrorMessage" class="text-red-600 text-sm">
                        {{ editErrorMessage }}
                    </p>
                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            @click="editingTeacher = null"
                            class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            :disabled="isSavingEdit"
                            class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                            {{ isSavingEdit ? "Menyimpan..." : "Simpan" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { user } = useUserSession()
const isSuperadmin = computed(() => user.value?.role === 'superadmin')
const currentUserId = computed(() => user.value?.id)

const currentPage = ref(1);
const pageSize = ref(10);

const { data, pending, refresh } = await useFetch("/api/teachers", {
    query: computed(() => ({
        page: currentPage.value,
        pageSize: pageSize.value,
    })),
});

const roleLabels: Record<string, string> = {
    admin: "Admin",
    guru_piket: "Guru Piket",
    wali_kelas: "Wali Kelas",
};
function roleLabel(role: string) {
    return roleLabels[role] ?? role;
}
function roleClass(role: string) {
    if (role === "admin") return "bg-primary-100 text-primary-700";
    if (role === "guru_piket") return "bg-accent-100 text-accent-700";
    return "bg-gray-100 text-gray-600";
}

const photoVersion = ref(0);
async function handlePhotoUpload(e: Event, uuid: string) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
        await $fetch(`/api/teachers/${uuid}/photo`, {
            method: "POST",
            body: formData,
        });
        photoVersion.value++;
        await refresh();
    } catch (err: any) {
        alert(err?.data?.statusMessage || "Gagal upload foto");
    }
}

const showAddModal = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const form = reactive({
    nama: "",
    email: "",
    noHp: "",
    password: "",
    role: "",
});

async function handleAdd() {
    errorMessage.value = "";
    isSaving.value = true;
    try {
        await $fetch("/api/teachers", { method: "POST", body: { ...form } });
        showAddModal.value = false;
        Object.assign(form, {
            nama: "",
            email: "",
            noHp: "",
            password: "",
            role: "",
        });
        await refresh();
    } catch (err: any) {
        errorMessage.value = err?.data?.statusMessage || "Gagal menyimpan";
    } finally {
        isSaving.value = false;
    }
}

const { confirm } = useConfirm();

const editingTeacher = ref<any>(null);
const isSavingEdit = ref(false);
const editErrorMessage = ref("");
const editForm = reactive({
    nama: "",
    email: "",
    noHp: "",
    password: "",
    role: "",
    isActive: true,
});

function openEditModal(teacher: any) {
    editingTeacher.value = teacher;
    Object.assign(editForm, {
        nama: teacher.nama,
        email: teacher.email,
        noHp: teacher.noHp || "",
        password: "",
        role: teacher.role,
        isActive: teacher.isActive,
    });
    editErrorMessage.value = "";
}

async function handleEdit() {
    editErrorMessage.value = "";
    isSavingEdit.value = true;
    try {
        await $fetch(`/api/teachers/${editingTeacher.value.uuid}`, {
            method: "PATCH",
            body: { ...editForm, password: editForm.password || undefined },
        });
        editingTeacher.value = null;
        await refresh();
    } catch (err: any) {
        editErrorMessage.value =
            err?.data?.statusMessage || "Gagal menyimpan perubahan";
    } finally {
        isSavingEdit.value = false;
    }
}

async function handleDeleteTeacher(teacher: any) {
    const ok = await confirm({
        title: "Hapus Guru",
        message: `Yakin ingin menghapus akun ${teacher.nama}? Akun ini tidak akan bisa login lagi.`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;

    try {
        await $fetch(`/api/teachers/${teacher.uuid}`, { method: "DELETE" });
        await refresh();
    } catch (err: any) {
        alert(err?.data?.statusMessage || "Gagal menghapus guru");
    }
}
</script>
