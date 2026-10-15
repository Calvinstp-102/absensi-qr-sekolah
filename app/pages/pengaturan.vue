<template>
    <div class="max-w-7xl">
        <h1 class="text-2xl font-heading font-bold text-gray-800">Pengaturan</h1>
        <p class="text-gray-500 text-sm mt-1 mb-6">
            Identitas sekolah, jam & aturan kehadiran, hari sekolah, dan hari libur. Setiap bagian disimpan sendiri.
        </p>

        <div v-if="error && !data" class="bg-white rounded-xl border border-gray-100 shadow-md p-8 text-center">
            <p class="text-sm text-red-600 mb-3">{{ getErrorMessage(error, "Gagal memuat pengaturan.") }}</p>
            <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="refresh()">
                Coba lagi
            </button>
        </div>

        <div v-else-if="data" class="space-y-5">
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                <div class="space-y-5">
                    <!-- Jam & Aturan Kehadiran -->
                    <PengaturanSettingSection
                        title="Jam & Aturan Kehadiran"
                        subtitle="Menentukan status Hadir/Terlambat/Tidak Hadir dan kapan absen pulang dibuka"
                        :icon="['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 6v6l4 2']"
                        v-bind="sectionProps('jam')"
                        @save="save('jam')"
                        @reset="reset('jam')"
                    >
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="st-masuk" class="field-label">Jam Masuk (semua jenjang)</label>
                                <input id="st-masuk" v-model="form.jam_masuk_global" type="time" class="field-input" :class="fieldClass('jam_masuk_global')" />
                                <p v-if="errors.jam_masuk_global" class="field-error">{{ errors.jam_masuk_global }}</p>
                                <p v-else class="text-xs text-gray-400 mt-1.5">Berlaku sama untuk TK, SD, dan SMP.</p>
                            </div>
                            <div v-for="f in MENIT_JAM" :key="f.key">
                                <label :for="`st-${f.key}`" class="field-label">{{ f.label }}</label>
                                <div class="field-suffix w-36">
                                    <input
                                        :id="`st-${f.key}`"
                                        v-model="form[f.key]"
                                        type="number"
                                        inputmode="numeric"
                                        :min="f.min"
                                        :max="f.max"
                                        class="field-input pr-16"
                                        :class="fieldClass(f.key)"
                                    />
                                    <span>menit</span>
                                </div>
                                <p v-if="errors[f.key]" class="field-error">{{ errors[f.key] }}</p>
                                <p v-else class="text-xs text-gray-400 mt-1.5">{{ f.hint }}</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                            <div v-for="j in JENJANG_LIST" :key="j">
                                <label :for="`st-pulang-${j}`" class="field-label">Jam Pulang {{ j }}</label>
                                <input
                                    :id="`st-pulang-${j}`"
                                    v-model="form[PULANG_KEY[j]]"
                                    type="time"
                                    class="field-input"
                                    :class="fieldClass(PULANG_KEY[j])"
                                />
                                <p v-if="errors[PULANG_KEY[j]]" class="field-error">{{ errors[PULANG_KEY[j]] }}</p>
                            </div>
                        </div>

                        <!-- Pratinjau jadwal -->
                        <div class="mt-5 rounded-lg bg-gray-50 border border-gray-100 p-4">
                            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Pratinjau jadwal harian</p>
                            <p v-if="!jadwal" class="text-sm text-gray-400">Lengkapi jam masuk, toleransi, dan batas tidak hadir.</p>
                            <div v-else class="space-y-3">
                                <div class="flex flex-wrap gap-2 text-sm">
                                    <span class="px-2.5 py-1 rounded-lg bg-green-50 text-green-700">
                                        Hadir s/d <strong>{{ menitKeJam(jadwal.batasTelat) }}</strong>
                                    </span>
                                    <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">
                                        Terlambat setelah <strong>{{ menitKeJam(jadwal.batasTelat) }}</strong>
                                    </span>
                                    <span class="px-2.5 py-1 rounded-lg bg-red-50 text-red-700">
                                        Belum scan pukul <strong>{{ menitKeJam(jadwal.tidakHadir) }}</strong> → Tidak Hadir
                                    </span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div
                                        v-for="j in JENJANG_LIST"
                                        :key="j"
                                        class="rounded-lg bg-white border px-3 py-2 text-sm"
                                        :class="errors[PULANG_KEY[j]] ? 'border-red-200' : 'border-gray-100'"
                                    >
                                        <p class="font-medium text-gray-700">{{ j }}</p>
                                        <p v-if="jadwal.pulang[j]" class="text-gray-500 text-xs mt-0.5">
                                            Absen pulang dibuka <strong class="text-blue-700">{{ menitKeJam(jadwal.pulang[j]!.buka) }}</strong>
                                            · pulang {{ menitKeJam(jadwal.pulang[j]!.jam) }}
                                        </p>
                                        <p v-else class="text-gray-400 text-xs mt-0.5">Jam pulang belum valid</p>
                                    </div>
                                </div>
                            </div>
                            <p class="text-xs text-gray-400 mt-3">
                                Perubahan berlaku untuk scan berikutnya. Status yang sudah tercatat hari ini tidak dihitung ulang.
                            </p>
                        </div>
                    </PengaturanSettingSection>
                    <!-- Hari Sekolah -->
                    <PengaturanSettingSection
                        title="Hari Sekolah"
                        subtitle="Di luar hari sekolah, scan ditolak dan absensi otomatis tidak berjalan"
                        :icon="['M3 4h18v18H3z', 'M16 2v4M8 2v4M3 10h18']"
                        v-bind="sectionProps('hari')"
                        @save="save('hari')"
                        @reset="reset('hari')"
                    >
                        <div class="flex flex-wrap gap-2" role="group" aria-label="Hari sekolah">
                            <button
                                v-for="h in HARI_OPTIONS"
                                :key="h.value"
                                type="button"
                                :aria-pressed="hariDipilih.includes(h.value)"
                                class="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
                                :class="
                                    hariDipilih.includes(h.value)
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                "
                                @click="toggleHari(h.value)"
                            >
                                {{ h.label }}
                            </button>
                        </div>
                        <p v-if="errors.hari_sekolah" class="field-error">{{ errors.hari_sekolah }}</p>
                        <p v-else class="text-xs text-gray-400 mt-2">{{ hariDipilih.length }} hari sekolah per minggu.</p>
                        <p
                            v-if="hariIniDihapus"
                            class="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800"
                        >
                            Hari ini ({{ namaHariIni }}) tidak lagi termasuk hari sekolah. Setelah disimpan, scan hari ini ditolak
                            dan status Terlambat/Tidak Hadir otomatis hari ini (siswa yang belum scan) dikosongkan.
                        </p>
                    </PengaturanSettingSection>
                </div>
                <div class="space-y-5">
                    <!-- Identitas Sekolah -->
                    <PengaturanSettingSection
                        title="Identitas Sekolah"
                        subtitle="Ditampilkan di header dashboard, kartu QR, dan laporan PDF"
                        :icon="['M3 21h18', 'M5 21V7l8-4v18', 'M13 21V11l6 3v7']"
                        v-bind="sectionProps('identitas')"
                        @save="save('identitas')"
                        @reset="reset('identitas')"
                    >
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="sm:col-span-2">
                                <label for="st-nama" class="field-label">Nama Sekolah</label>
                                <input id="st-nama" v-model="form.nama_sekolah" maxlength="150" class="field-input" :class="fieldClass('nama_sekolah')" />
                                <p v-if="errors.nama_sekolah" class="field-error">{{ errors.nama_sekolah }}</p>
                            </div>
                            <div>
                                <label for="st-npsn" class="field-label">
                                    NPSN <span class="text-gray-400 text-xs font-normal">(opsional)</span>
                                </label>
                                <input
                                    id="st-npsn"
                                    v-model="form.npsn"
                                    inputmode="numeric"
                                    maxlength="8"
                                    placeholder="8 digit"
                                    class="field-input"
                                    :class="fieldClass('npsn')"
                                />
                                <p v-if="errors.npsn" class="field-error">{{ errors.npsn }}</p>
                            </div>
                            <div class="sm:col-span-3">
                                <label for="st-alamat" class="field-label">
                                    Alamat Sekolah <span class="text-gray-400 text-xs font-normal">(opsional)</span>
                                </label>
                                <textarea
                                    id="st-alamat"
                                    v-model="form.alamat_sekolah"
                                    rows="2"
                                    maxlength="255"
                                    class="field-input resize-y"
                                    :class="fieldClass('alamat_sekolah')"
                                />
                                <p v-if="errors.alamat_sekolah" class="field-error">{{ errors.alamat_sekolah }}</p>
                            </div>
                        </div>
                    </PengaturanSettingSection>
                    <!-- Hari Libur -->
                    <PengaturanHolidayList :hari-sekolah="hariSekolahTersimpan" />
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <!-- Scan -->
                <PengaturanSettingSection
                    class="h-full"
                    title="Scan"
                    subtitle="Aturan pembatalan absensi di halaman Scan"
                    :icon="['M3 7V5a2 2 0 012-2h2', 'M17 3h2a2 2 0 012 2v2', 'M21 17v2a2 2 0 01-2 2h-2', 'M7 21H5a2 2 0 01-2-2v-2', 'M7 12h10']"
                    v-bind="sectionProps('scan')"
                    @save="save('scan')"
                    @reset="reset('scan')"
                >
                    <label for="st-batal" class="field-label">Batas Batal Scan</label>
                    <div class="field-suffix w-36">
                        <input
                            id="st-batal"
                            v-model="form.batas_batal_scan_menit"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            max="120"
                            class="field-input pr-16"
                            :class="fieldClass('batas_batal_scan_menit')"
                        />
                        <span>menit</span>
                    </div>
                    <p v-if="errors.batas_batal_scan_menit" class="field-error">{{ errors.batas_batal_scan_menit }}</p>
                    <p v-else class="text-xs text-gray-400 mt-1.5">
                        Guru bisa membatalkan absensi yang ia catat sendiri dalam waktu ini. Admin/Superadmin bisa membatalkan
                        kapan saja di hari yang sama. Isi 0 agar hanya Admin yang bisa membatalkan.
                    </p>
                </PengaturanSettingSection>
                <!-- Tahun Ajaran -->
                <PengaturanSettingSection
                    class="h-full"
                    title="Tahun Ajaran"
                    subtitle="Dipakai untuk histori kelas dan pengecekan naik kelas"
                    :icon="['M4 19.5A2.5 2.5 0 016.5 17H20', 'M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z']"
                    v-bind="sectionProps('tahun_ajaran')"
                    @save="save('tahun_ajaran')"
                    @reset="reset('tahun_ajaran')"
                >
                    <label for="st-ta" class="field-label">Tahun Ajaran Aktif</label>
                    <input
                        id="st-ta"
                        v-model="form.tahun_ajaran_aktif"
                        placeholder="Contoh: 2026/2027"
                        maxlength="9"
                        class="field-input max-w-xs"
                        :class="fieldClass('tahun_ajaran_aktif')"
                    />
                    <p v-if="errors.tahun_ajaran_aktif" class="field-error">{{ errors.tahun_ajaran_aktif }}</p>
                    <p v-else class="text-xs text-gray-400 mt-1.5">
                        Ganti ke tahun ajaran baru <strong>sebelum</strong> memproses Naik Kelas. Siswa yang sudah naik di
                        tahun ajaran aktif tidak bisa dinaikkan lagi.
                    </p>
                </PengaturanSettingSection>
                <!-- QR Code -->
                <PengaturanSettingSection
                    class="h-full"
                    title="QR Code"
                    subtitle="Masa berlaku kartu QR lama saat siswa dibuatkan QR baru"
                    :icon="['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z']"
                    v-bind="sectionProps('qr')"
                    @save="save('qr')"
                    @reset="reset('qr')"
                >
                    <label for="st-qr" class="field-label">Masa Tenggang QR Lama</label>
                    <div class="field-suffix w-36">
                        <input
                            id="st-qr"
                            v-model="form.qr_grace_period_hari"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            max="30"
                            class="field-input pr-16"
                            :class="fieldClass('qr_grace_period_hari')"
                        />
                        <span>hari</span>
                    </div>
                    <p v-if="errors.qr_grace_period_hari" class="field-error">{{ errors.qr_grace_period_hari }}</p>
                    <p v-else class="text-xs text-gray-400 mt-1.5">
                        Kartu lama masih bisa dipakai scan selama masa ini. Isi 0 agar kartu lama langsung tidak berlaku.
                    </p>
                </PengaturanSettingSection>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Jenjang } from "#shared/utils/kelas";
import type { SettingSection } from "#shared/utils/setting-rules";

definePageMeta({ roles: ["superadmin", "admin"] });
useHead({ title: "Pengaturan" });

const toast = useToast();
const api = useApi();
const { confirm } = useConfirm();

type SettingMeta = { updatedBy: string | null; dateModified: string | null };
type SettingsResponse = { values: Record<string, string>; meta: Record<string, SettingMeta> };

const { data, error, refresh } = await useApiFetch("/api/settings");

const PULANG_KEY: Record<Jenjang, string> = { TK: "jam_pulang_tk", SD: "jam_pulang_sd", SMP: "jam_pulang_smp" };
const MENIT_JAM = [
    { key: "toleransi_telat_menit", label: "Toleransi Keterlambatan", min: 0, max: 180, hint: "Scan setelah jam masuk + toleransi = Terlambat." },
    { key: "tidak_hadir_delay_menit", label: "Batas Waktu Tidak Hadir", min: 1, max: 600, hint: "Setelah batas terlambat; yang belum scan ditandai Tidak Hadir." },
    { key: "buka_absen_pulang_menit", label: "Buka Absen Pulang", min: 0, max: 240, hint: "Scan pulang diterima mulai N menit sebelum jam pulang jenjang." },
];

// Nilai tersimpan (dari server) & isian form
const saved = reactive<Record<string, string>>({});
const form = reactive<Record<string, string>>({});
const meta = ref<Record<string, SettingMeta>>({});
const errors = ref<Record<string, string>>({});
const saving = ref<SettingSection | null>(null);

function applyResponse(res: SettingsResponse, sections?: SettingSection[]) {
    for (const [key, value] of Object.entries(res.values)) {
        saved[key] = value;
        // Isian seksi lain yang sedang diedit tidak ditimpa
        if (!sections || sections.includes(SETTING_DEFS[key]!.section)) form[key] = value;
    }
    meta.value = res.meta;
}

watch(
    data,
    (res) => {
        if (res) applyResponse(res as SettingsResponse);
    },
    { immediate: true },
);

// Hapus error field begitu user mulai memperbaiki
watch(
    () => ({ ...form }),
    (now, old) => {
        for (const key of Object.keys(errors.value)) {
            if (now[key] !== old[key]) delete errors.value[key];
        }
    },
);

function normalized(key: string) {
    return SETTING_DEFS[key]!.normalize(form[key] ?? "");
}

function changedKeys(section: SettingSection) {
    return settingKeysOf(section).filter((k) => normalized(k) !== saved[k]);
}

const dirtySections = computed(() =>
    (Object.keys(SETTING_SECTION_LABELS) as SettingSection[]).filter((s) => changedKeys(s).length > 0),
);

function sectionProps(section: SettingSection) {
    // "Terakhir diubah" = perubahan terbaru di antara key seksi ini
    const latest = settingKeysOf(section)
        .map((k) => meta.value[k])
        .filter((m): m is SettingMeta => !!m?.dateModified)
        .sort((a, b) => (b.dateModified! > a.dateModified! ? 1 : -1))[0];
    return {
        dirty: dirtySections.value.includes(section),
        saving: saving.value === section,
        meta: latest ?? null,
    };
}

function fieldClass(key: string) {
    if (errors.value[key]) return "field-invalid";
    return normalized(key) !== saved[key] ? "field-valid !border-amber-300" : "field-valid";
}

function reset(section: SettingSection) {
    for (const key of settingKeysOf(section)) {
        form[key] = saved[key] ?? "";
        delete errors.value[key];
    }
}

/** Validasi di browser dengan aturan yang sama dengan server. */
function validate(section: SettingSection, keys: string[]) {
    const e: Record<string, string> = {};
    for (const key of keys) {
        const msg = SETTING_DEFS[key]!.validate(normalized(key));
        if (msg) e[key] = msg;
    }
    if (Object.keys(e).length === 0) {
        const merged = { ...saved };
        for (const key of settingKeysOf(section)) merged[key] = normalized(key);
        Object.assign(e, validateSettingRules(merged));
    }
    errors.value = { ...errors.value, ...e };
    return Object.keys(e).length === 0;
}

async function save(section: SettingSection) {
    const keys = changedKeys(section);
    if (keys.length === 0 || saving.value) return;
    if (!validate(section, keys)) return;

    if (section === "tahun_ajaran") {
        const ok = await confirm({
            title: "Ganti Tahun Ajaran",
            message: `Ganti tahun ajaran aktif dari ${saved.tahun_ajaran_aktif} ke ${normalized("tahun_ajaran_aktif")}? Histori kelas dan pengecekan naik kelas berikutnya memakai tahun ajaran baru.`,
            confirmText: "Ya, Ganti",
        });
        if (!ok) return;
    }

    saving.value = section;
    try {
        const res = await api<SettingsResponse & { message: string }>("/api/settings", {
            method: "PATCH",
            body: { section, values: Object.fromEntries(keys.map((k) => [k, normalized(k)])) },
        });
        applyResponse(res, [section]);
        toast.success("Tersimpan", res.message);
    } catch (err) {
        const fieldErrors = getFieldErrors(err);
        if (Object.keys(fieldErrors).length > 0) errors.value = { ...errors.value, ...fieldErrors };
        else toast.error("Gagal menyimpan pengaturan", getErrorMessage(err));
    } finally {
        saving.value = null;
    }
}

// --- Jam: pratinjau jadwal (helper yang sama dengan validasi)
const jadwal = computed(() => hitungJadwal(form));

// --- Hari sekolah
const hariDipilih = computed(() =>
    (form.hari_sekolah ?? "").split(",").filter(Boolean).map(Number),
);
const hariSekolahTersimpan = computed(() =>
    (saved.hari_sekolah ?? "").split(",").filter(Boolean).map(Number),
);

function toggleHari(value: number) {
    const set = new Set(hariDipilih.value);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    form.hari_sekolah = normalizeHariSekolah([...set].join(","));
}

// Hari ini menurut WIB (1 = Senin ... 7 = Minggu)
const hariIniIso = (() => {
    const d = new Date(Date.now() + 7 * 3600_000);
    return d.getUTCDay() || 7;
})();
const namaHariIni = HARI_OPTIONS.find((h) => h.value === hariIniIso)!.label;
const hariIniDihapus = computed(
    () => hariSekolahTersimpan.value.includes(hariIniIso) && !hariDipilih.value.includes(hariIniIso),
);

// --- Peringatan perubahan belum disimpan
onBeforeRouteLeave(async () => {
    if (dirtySections.value.length === 0) return true;
    const daftar = dirtySections.value.map((s) => SETTING_SECTION_LABELS[s]).join(", ");
    return await confirm({
        title: "Perubahan Belum Disimpan",
        message: `Ada perubahan yang belum disimpan di: ${daftar}. Tinggalkan halaman dan buang perubahan tersebut?`,
        confirmText: "Ya, Tinggalkan",
        danger: true,
    });
});

function onBeforeUnload(e: BeforeUnloadEvent) {
    if (dirtySections.value.length === 0) return;
    e.preventDefault();
    e.returnValue = "";
}
onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", onBeforeUnload));
</script>

<style scoped>
.field-label {
    @apply block text-sm font-medium text-gray-700 mb-1.5;
}
.field-input {
    @apply block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2;
}
.field-valid {
    @apply border-gray-300 focus:border-primary-400 focus:ring-primary-100;
}
.field-invalid {
    @apply border-red-400 bg-red-50/40 focus:ring-red-100;
}
.field-error {
    @apply text-red-600 text-xs mt-1.5;
}
/* Input dengan satuan di dalam kotak (menit/hari) */
.field-suffix {
    @apply relative;
}
.field-suffix > span {
    @apply absolute inset-y-0 right-3 flex items-center text-sm text-gray-400 pointer-events-none;
}
</style>
