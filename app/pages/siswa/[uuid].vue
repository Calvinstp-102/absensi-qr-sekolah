<template>
    <div>
        <NuxtLink to="/siswa" class="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6" />
            </svg>
            Data Siswa
        </NuxtLink>

        <!-- Gagal memuat / tidak ditemukan -->
        <div v-if="error && !data" class="mt-4 bg-white rounded-xl border border-gray-100 shadow-md p-10 text-center">
            <p class="text-sm font-medium text-gray-700">
                {{ notFound ? "Siswa tidak ditemukan atau sudah dihapus" : getErrorMessage(error, "Gagal memuat data siswa.") }}
            </p>
            <div class="mt-3 flex justify-center gap-4 text-sm">
                <button v-if="!notFound" type="button" class="font-medium text-primary-600 hover:underline" @click="refresh()">
                    Coba lagi
                </button>
                <NuxtLink to="/siswa" class="font-medium text-primary-600 hover:underline">Kembali ke daftar</NuxtLink>
            </div>
        </div>

        <div v-else-if="!data" class="mt-4 bg-white rounded-xl border border-gray-100 shadow-md p-6 animate-pulse flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-gray-200"></div>
            <div class="space-y-2">
                <div class="h-4 w-48 bg-gray-200 rounded"></div>
                <div class="h-3 w-32 bg-gray-100 rounded"></div>
            </div>
        </div>

        <template v-else>
            <!-- Header -->
            <div class="mt-3 mb-6 bg-white rounded-xl border border-gray-100 shadow-md p-5 flex items-start justify-between flex-wrap gap-4">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="relative shrink-0">
                        <UserAvatar
                            :nama="student!.nama"
                            :uuid="student!.uuid"
                            :foto-path="student!.fotoPath"
                            kind="students"
                            size="lg"
                            :class="{ 'grayscale opacity-70': !isActiveStudent }"
                        />
                        <span v-if="photoBusy" class="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                            <span class="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></span>
                        </span>
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-2xl font-heading font-bold text-gray-800 break-words">{{ student!.nama }}</h1>
                        <div class="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                            <span>{{ formatKelas(student!.jenjang, student!.kelasSekarang) }}</span>
                            <span class="text-gray-300">·</span>
                            <span
                                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                                :class="isActiveStudent ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                            >
                                <span class="w-1.5 h-1.5 rounded-full" :class="isActiveStudent ? 'bg-green-500' : 'bg-gray-400'"></span>
                                {{ isActiveStudent ? "Aktif" : "Nonaktif" }}
                            </span>
                        </div>
                        <p v-if="!isActiveStudent && student!.statusReason" class="text-xs text-gray-500 mt-1">
                            Alasan: {{ student!.statusReason }}
                            <template v-if="student!.statusChangedAt"> · sejak {{ formatTanggalWaktu(student!.statusChangedAt) }}</template>
                        </p>
                        <div v-if="isAdmin" class="flex items-center gap-3 mt-1.5 text-xs">
                            <label class="text-primary-600 hover:underline cursor-pointer" :class="{ 'pointer-events-none opacity-50': photoBusy }">
                                {{ student!.fotoPath ? "Ganti foto" : "Unggah foto" }}
                                <input type="file" :accept="PHOTO_ACCEPT" class="hidden" :disabled="photoBusy" @change="onPhotoSelected" />
                            </label>
                            <button v-if="student!.fotoPath" type="button" class="text-red-600 hover:underline" :disabled="photoBusy" @click="removePhoto">
                                Hapus foto
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="isAdmin" class="flex items-center gap-2">
                    <button type="button" class="btn-secondary" @click="formOpen = true">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Data
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1.5 border border-red-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 shadow-sm"
                        @click="deleteStudent"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                        </svg>
                        Hapus
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Kolom kiri: kehadiran & histori -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Ringkasan -->
                    <div class="bg-white rounded-xl border border-gray-100 shadow-md p-5">
                        <p class="text-sm font-medium text-gray-700 mb-3">
                            Ringkasan Kehadiran
                            <span class="text-xs font-normal text-gray-400">({{ data.attendanceLimit }} hari absensi terakhir)</span>
                        </p>
                        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            <div v-for="c in summaryCards" :key="c.label" class="rounded-lg px-3 py-2.5" :class="c.bg">
                                <p class="text-xs" :class="c.text">{{ c.label }}</p>
                                <p class="text-xl font-heading font-bold text-gray-800">{{ c.value }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Histori absensi -->
                    <div class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden">
                        <p class="text-sm font-medium text-gray-700 px-5 py-4 border-b border-gray-100">Histori Absensi</p>
                        <div v-if="!attendances.length" class="py-10 text-center text-sm text-gray-500">Belum ada data absensi.</div>
                        <div v-else class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th class="px-4 py-3 font-medium">Tanggal</th>
                                        <th class="px-4 py-3 font-medium">Masuk</th>
                                        <th class="px-4 py-3 font-medium">Pulang</th>
                                        <th class="px-4 py-3 font-medium">Status</th>
                                        <th class="px-4 py-3 w-20"><span class="sr-only">Aksi</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="a in visibleAttendances" :key="a.id" class="border-t border-gray-100 align-top">
                                        <td class="px-4 py-3 whitespace-nowrap text-gray-700">{{ formatTanggal(a.tanggal) }}</td>
                                        <td class="px-4 py-3 text-gray-600">
                                            {{ formatJam(a.jamMasukAsli) }}
                                            <span
                                                v-if="a.masukMetode === 'manual'"
                                                class="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium"
                                                :title="a.catatanMasuk ?? undefined"
                                                >Manual</span
                                            >
                                        </td>
                                        <td class="px-4 py-3 text-gray-600">
                                            {{ formatJam(a.jamPulangAsli) }}
                                            <span
                                                v-if="a.pulangAwal"
                                                class="ml-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[11px] font-medium"
                                                :title="a.catatanPulang ?? undefined"
                                                >Pulang awal</span
                                            >
                                            <span
                                                v-else-if="a.pulangMetode === 'manual'"
                                                class="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium"
                                                :title="a.catatanPulang ?? undefined"
                                                >Manual</span
                                            >
                                        </td>
                                        <td class="px-4 py-3">
                                            <span class="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" :class="statusClass(a)">
                                                {{ statusLabel(a) }}
                                            </span>
                                            <p v-if="a.alasanKoreksi" class="text-xs text-gray-500 mt-1.5">
                                                {{ a.alasanKoreksi }}
                                                <span class="text-gray-400">
                                                    — {{ a.teacher?.nama ?? "?" }}, {{ formatTanggalWaktu(a.dikoreksiAt) }}
                                                </span>
                                            </p>
                                        </td>
                                        <td class="px-4 py-3 text-right">
                                            <button
                                                v-if="a.statusUtama === 'terlambat' && !a.statusKoreksi"
                                                type="button"
                                                class="text-xs font-medium text-primary-600 hover:underline"
                                                @click="correcting = a"
                                            >
                                                Koreksi
                                            </button>
                                            <button
                                                v-else-if="bolehKeterangan(a)"
                                                type="button"
                                                class="text-xs font-medium text-primary-600 hover:underline"
                                                @click="openKeterangan(a)"
                                            >
                                                {{ a.statusKoreksi ? "Ubah keterangan" : "Keterangan" }}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <button
                                v-if="attendances.length > ATTENDANCE_PREVIEW"
                                type="button"
                                class="w-full py-2.5 text-sm font-medium text-primary-600 hover:bg-gray-50 border-t border-gray-100"
                                @click="showAllAttendance = !showAllAttendance"
                            >
                                {{ showAllAttendance ? "Tampilkan lebih sedikit" : `Tampilkan semua (${attendances.length})` }}
                            </button>
                        </div>
                    </div>

                    <!-- Histori kelas -->
                    <div class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden">
                        <p class="text-sm font-medium text-gray-700 px-5 py-4 border-b border-gray-100">Histori Kelas</p>
                        <div v-if="!student!.classHistories.length" class="py-8 text-center text-sm text-gray-500">Belum ada histori kelas.</div>
                        <ol v-else class="divide-y divide-gray-100">
                            <li v-for="h in student!.classHistories" :key="h.id" class="px-5 py-3 flex items-start gap-3">
                                <span class="mt-1 w-2 h-2 rounded-full shrink-0" :class="historyDot(h.action)"></span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm text-gray-800">
                                        <span class="font-medium">{{ CLASS_ACTION_LABELS[h.action] }}</span>
                                        <template v-if="h.action !== 'lulus'"> · Kelas {{ h.kelas }}</template>
                                        <template v-else> dari kelas {{ h.kelas }}</template>
                                        <span class="text-gray-400"> · TA {{ h.tahunAjaran }}</span>
                                    </p>
                                    <p v-if="h.reason" class="text-xs text-gray-500">{{ h.reason }}</p>
                                    <p class="text-xs text-gray-400">{{ h.teacher.nama }}, {{ formatTanggalWaktu(h.dateCreated) }}</p>
                                </div>
                            </li>
                        </ol>
                    </div>
                </div>

                <!-- Kolom kanan: QR & data diri -->
                <div class="space-y-6">
                    <SiswaQrCard
                        :student="student!"
                        :qr="data.qr"
                        :grace-count="data.qrGraceCount"
                        :grace-period-days="data.qrGracePeriodDays"
                        :can-manage="isAdmin"
                        @changed="refresh()"
                    />

                    <div class="bg-white rounded-xl border border-gray-100 shadow-md p-5">
                        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Data Diri</p>
                        <dl class="space-y-2.5 text-sm">
                            <div v-for="row in identityRows" :key="row.label" class="flex justify-between gap-4">
                                <dt class="text-gray-500 shrink-0">{{ row.label }}</dt>
                                <dd class="text-gray-800 text-right break-words min-w-0" :class="{ 'text-gray-400': !row.value }">
                                    {{ row.value || "–" }}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>

            <SiswaFormModal v-if="isAdmin" :open="formOpen" :student="student!" @close="formOpen = false" @saved="onSaved" />
            <SiswaCorrectModal :attendance="correcting" @close="correcting = null" @saved="onCorrected" />
            <AbsensiKeteranganModal :open="!!keterangan" :target="keterangan" @close="keterangan = null" @saved="onKeteranganSaved" />
        </template>
    </div>
</template>

<script setup lang="ts">
import {
    CLASS_ACTION_LABELS,
    GENDER_LABELS,
    type AttendanceRow,
    type ClassHistoryAction,
    type StudentDetailResponse,
} from "~/types/student";
import type { KeteranganTarget } from "~/types/report";

const ATTENDANCE_PREVIEW = 10;
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const toast = useToast();
const api = useApi();
const { confirm } = useConfirm();
const { isAdmin } = useAuth();
const route = useRoute();

const uuid = computed(() => String(route.params.uuid));
const { data: raw, error, refresh } = await useApiFetch(() => `/api/students/${uuid.value}`);
const data = computed(() => raw.value as unknown as StudentDetailResponse | null);
const student = computed(() => data.value?.student);
const notFound = computed(() => getErrorStatus(error.value) === 404);
const isActiveStudent = computed(() => student.value?.status === "active");

useHead({ title: () => student.value?.nama ?? "Detail Siswa" });

const summaryCards = computed(() => {
    const s = data.value?.summary;
    return [
        { label: "Hadir", value: s?.hadir ?? 0, bg: "bg-green-50", text: "text-green-700" },
        { label: "Terlambat", value: s?.terlambat ?? 0, bg: "bg-amber-50", text: "text-amber-700" },
        { label: "Dimaklumi", value: s?.dimaklumi ?? 0, bg: "bg-teal-50", text: "text-teal-700" },
        { label: "Sakit", value: s?.sakit ?? 0, bg: "bg-sky-50", text: "text-sky-700" },
        { label: "Izin", value: s?.izin ?? 0, bg: "bg-violet-50", text: "text-violet-700" },
        { label: "Alpa", value: s?.tidakHadir ?? 0, bg: "bg-red-50", text: "text-red-700" },
    ];
});

const identityRows = computed(() => {
    const s = student.value;
    if (!s) return [];
    const umur = hitungUmur(s.tanggalLahir);
    return [
        { label: "NISN", value: s.nisn },
        { label: "NIS", value: s.nis },
        { label: "Jenis kelamin", value: GENDER_LABELS[s.gender] },
        {
            label: "Tanggal lahir",
            value: s.tanggalLahir ? `${formatTanggal(s.tanggalLahir, false)}${umur !== null ? ` (${umur} th)` : ""}` : null,
        },
        { label: "Alamat", value: s.alamat },
        { label: "Orang tua/wali", value: s.namaOrtu },
        { label: "No HP ortu", value: s.noHpOrtu },
        { label: "Terdaftar", value: formatTanggal(s.dateCreated, false) },
    ];
});

// --- Absensi
const attendances = computed(() => student.value?.attendances ?? []);
const showAllAttendance = ref(false);
const visibleAttendances = computed(() =>
    showAllAttendance.value ? attendances.value : attendances.value.slice(0, ATTENDANCE_PREVIEW),
);

const STATUS_LABELS = { hadir: "Hadir", terlambat: "Terlambat", tidak_hadir: "Tidak Hadir" };
function statusLabel(a: AttendanceRow) {
    if (a.statusKoreksi === "sakit") return "Sakit";
    if (a.statusKoreksi === "izin") return "Izin";
    return a.statusKoreksi === "dimaklumi" ? "Terlambat (Dimaklumi)" : STATUS_LABELS[a.statusUtama];
}
function statusClass(a: AttendanceRow) {
    if (a.statusKoreksi === "sakit") return KODE_STATUS.S.badge;
    if (a.statusKoreksi === "izin") return KODE_STATUS.I.badge;
    if (a.statusKoreksi === "dimaklumi") return "bg-sky-50 text-sky-700";
    if (a.statusUtama === "hadir") return "bg-green-100 text-green-700";
    if (a.statusUtama === "terlambat") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
}
function historyDot(action: ClassHistoryAction) {
    return { masuk_baru: "bg-primary-500", naik_kelas: "bg-green-500", pindah_kelas: "bg-amber-500", lulus: "bg-purple-500" }[action];
}

const correcting = ref<AttendanceRow | null>(null);
async function onCorrected(message: string) {
    correcting.value = null;
    toast.success("Koreksi disimpan", message);
    await refresh();
}

// --- Keterangan Sakit/Izin (Modul 5): untuk absensi tanpa jam masuk
const hariIniWib = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const keterangan = ref<KeteranganTarget | null>(null);
function bolehKeterangan(a: AttendanceRow) {
    return isActiveStudent.value && !a.jamMasukAsli && a.statusKoreksi !== "dimaklumi";
}
function openKeterangan(a: AttendanceRow) {
    const s = student.value!;
    const tanggal = a.tanggal.slice(0, 10);
    keterangan.value = {
        studentUuid: s.uuid,
        nama: s.nama,
        kelasLabel: formatKelas(s.jenjang, s.kelasSekarang),
        tanggal,
        kode: kodeDariAbsensi(a, tanggal === hariIniWib),
    };
}
async function onKeteranganSaved(message: string) {
    keterangan.value = null;
    toast.success("Tersimpan", message);
    await refresh();
}

// --- Edit & hapus
const formOpen = ref(false);
async function onSaved(message: string) {
    formOpen.value = false;
    toast.success("Berhasil", message);
    await refresh();
}

async function deleteStudent() {
    const s = student.value;
    if (!s) return;
    const ok = await confirm({
        title: "Hapus Siswa",
        message: `Hapus data ${s.nama} (NISN ${s.nisn || "–"})? Siswa tidak tampil lagi dan QR-nya langsung tidak bisa dipakai absen. Riwayat absensi tetap tersimpan.`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;
    try {
        const res = await api<{ message: string }>(`/api/students/${s.uuid}`, { method: "DELETE" });
        toast.success("Siswa dihapus", res.message);
        await navigateTo("/siswa");
    } catch (err) {
        toast.error("Gagal menghapus siswa", getErrorMessage(err));
    }
}

// --- Foto
const photoBusy = ref(false);

async function onPhotoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ""; // agar file yang sama bisa dipilih lagi
    if (!file || !student.value) return;
    if (!PHOTO_ACCEPT.split(",").includes(file.type)) {
        toast.error("Foto tidak dapat diunggah", "File harus berupa foto JPG, PNG, atau WEBP.");
        return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        toast.error("Foto tidak dapat diunggah", `Ukuran foto ${mb} MB terlalu besar. Maksimal 2 MB.`);
        return;
    }
    const body = new FormData();
    body.append("photo", file);
    photoBusy.value = true;
    try {
        const res = await api<{ message: string }>(`/api/students/${student.value.uuid}/photo`, { method: "POST", body });
        toast.success("Foto diperbarui", res.message);
        await refresh();
    } catch (err) {
        toast.error("Gagal mengunggah foto", getErrorMessage(err));
    } finally {
        photoBusy.value = false;
    }
}

async function removePhoto() {
    const s = student.value;
    if (!s) return;
    const ok = await confirm({
        title: "Hapus Foto",
        message: `Hapus foto ${s.nama}? Inisial nama akan ditampilkan sebagai gantinya.`,
        confirmText: "Ya, Hapus Foto",
        danger: true,
    });
    if (!ok) return;
    photoBusy.value = true;
    try {
        const res = await api<{ message: string }>(`/api/students/${s.uuid}/photo`, { method: "DELETE" });
        toast.success("Foto dihapus", res.message);
        await refresh();
    } catch (err) {
        toast.error("Gagal menghapus foto", getErrorMessage(err));
    } finally {
        photoBusy.value = false;
    }
}
</script>

<style scoped>
.btn-secondary {
    @apply flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm;
}
</style>
