<template>
    <div v-if="data">
        <NuxtLink to="/siswa" class="text-sm text-primary-600 hover:underline"
            >← Kembali</NuxtLink
        >

        <div class="flex items-start justify-between mt-3 mb-6 flex-wrap gap-3">
            <div class="flex items-center gap-4">
                <div
                    class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl overflow-hidden shrink-0"
                >
                    <img
                        v-if="data.student.fotoPath"
                        :src="`/api/photos/students/${data.student.uuid}?t=${photoVersion}`"
                        class="w-full h-full object-cover"
                    />
                    <span v-else>{{
                        data.student.gender === "L" ? "👦" : "👧"
                    }}</span>
                </div>
                <div>
                    <h1 class="text-2xl font-heading font-bold text-gray-800">
                        {{ data.student.nama }}
                    </h1>
                    <p class="text-gray-500 text-sm">
                        {{ data.student.jenjang }} - Kelas
                        {{ data.student.kelasSekarang }} ·
                        <span
                            :class="
                                data.student.status === 'active'
                                    ? 'text-green-600'
                                    : 'text-gray-400'
                            "
                        >
                            {{
                                data.student.status === "active"
                                    ? "Aktif"
                                    : "Nonaktif"
                            }}
                        </span>
                    </p>
                    <label
                        class="text-xs text-primary-600 hover:underline cursor-pointer"
                    >
                        {{
                            data.student.fotoPath ? "Ganti Foto" : "Upload Foto"
                        }}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            class="hidden"
                            @change="handlePhotoUpload"
                        />
                    </label>
                    <p v-if="photoErrorMessage" class="text-xs text-red-600">
                        {{ photoErrorMessage }}
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <button
                    @click="openEditModal"
                    class="flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
                >
                    <svg
                        class="w-4 h-4"
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
                    Edit Data
                </button>
                <button
                    @click="handleDeleteStudent"
                    class="flex items-center gap-1.5 border border-red-200 bg-white px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 shadow-sm"
                >
                    <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                        />
                    </svg>
                    Hapus Siswa
                </button>
            </div>
        </div>

        <!-- Card QR -->
        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md p-5 mb-6"
        >
            <p
                class="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3"
            >
                QR Absensi
            </p>

            <div
                v-if="!data.qr"
                class="flex items-center justify-between flex-wrap gap-3"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-6 h-6 text-gray-300"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                        >
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <path d="M14 14h3v3h-3zM20 14v3M17 20h3" />
                        </svg>
                    </div>
                    <p class="text-sm text-gray-500">Belum memiliki QR</p>
                </div>
                <div class="flex gap-2">
                    <button
                        @click="handleGenerateClick"
                        class="px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500"
                    >
                        Generate QR
                    </button>
                    <button
                        @click="openRegisterModal"
                        class="px-4 py-2 rounded-lg border border-primary-200 text-primary-600 text-sm font-medium hover:bg-primary-50"
                    >
                        Daftarkan QR
                    </button>
                </div>
            </div>

            <div
                v-else
                class="flex items-center justify-between flex-wrap gap-3"
            >
                <div class="flex items-center gap-3">
                    <img
                        :src="`/api/qr-images/${data.qr.uuid}`"
                        class="w-14 h-14 rounded-lg border border-gray-100"
                    />
                    <div>
                        <p class="text-sm font-medium text-gray-700">
                            QR Aktif
                        </p>
                        <p class="text-xs text-gray-400">
                            Terdaftar {{ formatDate(data.qr.dateCreated) }}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button
                        @click="handleGenerateClick"
                        class="px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500"
                    >
                        Generate QR Baru
                    </button>
                    <button
                        @click="handleDeleteQr"
                        class="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
                    >
                        Delete QR
                    </button>
                </div>
            </div>
        </div>

        <!-- Ringkasan chart sederhana -->
        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md p-5 mb-6"
        >
            <p class="text-sm font-medium text-gray-700 mb-3">
                Ringkasan Kehadiran (90 hari terakhir)
            </p>
            <div class="flex items-end gap-4 h-32">
                <div class="flex flex-col items-center flex-1">
                    <div
                        class="w-full bg-green-500 rounded-t"
                        :style="{ height: barHeight(data.summary.hadir) }"
                    ></div>
                    <p class="text-xs mt-1 text-gray-500">
                        Hadir ({{ data.summary.hadir }})
                    </p>
                </div>
                <div class="flex flex-col items-center flex-1">
                    <div
                        class="w-full bg-amber-500 rounded-t"
                        :style="{ height: barHeight(data.summary.terlambat) }"
                    ></div>
                    <p class="text-xs mt-1 text-gray-500">
                        Terlambat ({{ data.summary.terlambat }})
                    </p>
                </div>
                <div class="flex flex-col items-center flex-1">
                    <div
                        class="w-full bg-red-500 rounded-t"
                        :style="{ height: barHeight(data.summary.tidakHadir) }"
                    ></div>
                    <p class="text-xs mt-1 text-gray-500">
                        Tidak Hadir ({{ data.summary.tidakHadir }})
                    </p>
                </div>
            </div>
        </div>

        <!-- Histori absensi -->
        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden mb-6"
        >
            <p
                class="text-sm font-medium text-gray-700 p-4 border-b border-gray-100"
            >
                Histori Absensi
            </p>
            <table class="w-full text-sm">
                <thead
                    class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                    <tr>
                        <th class="p-3">Tanggal</th>
                        <th class="p-3">Jam Masuk</th>
                        <th class="p-3">Jam Pulang</th>
                        <th class="p-3">Status</th>
                        <th class="p-3">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="a in data.student.attendances"
                        :key="a.id"
                        class="border-t border-gray-100"
                    >
                        <td class="p-3">{{ formatDate(a.tanggal) }}</td>
                        <td class="p-3">
                            {{
                                a.jamMasukAsli
                                    ? formatTime(a.jamMasukAsli)
                                    : "-"
                            }}
                        </td>
                        <td class="p-3">
                            {{
                                a.jamPulangAsli
                                    ? formatTime(a.jamPulangAsli)
                                    : "-"
                            }}
                        </td>
                        <td class="p-3">
                            <span
                                :class="statusClass(a)"
                                class="px-2.5 py-1 rounded-full text-xs font-medium"
                                >{{ statusLabel(a) }}</span
                            >
                            <p
                                v-if="a.alasanKoreksi"
                                class="text-xs text-gray-400 mt-1"
                            >
                                {{ a.alasanKoreksi }}
                            </p>
                        </td>
                        <td class="p-3">
                            <button
                                v-if="
                                    a.statusUtama === 'terlambat' &&
                                    !a.statusKoreksi
                                "
                                @click="openCorrectModal(a)"
                                class="text-primary-600 hover:underline text-xs"
                            >
                                Koreksi
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Histori kelas -->
        <div
            class="bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden"
        >
            <p
                class="text-sm font-medium text-gray-700 p-4 border-b border-gray-100"
            >
                Histori Kelas
            </p>
            <table class="w-full text-sm">
                <thead
                    class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"
                >
                    <tr>
                        <th class="p-3">Tahun Ajaran</th>
                        <th class="p-3">Kelas</th>
                        <th class="p-3">Aksi</th>
                        <th class="p-3">Alasan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="h in data.student.classHistories"
                        :key="h.id"
                        class="border-t border-gray-100"
                    >
                        <td class="p-3">{{ h.tahunAjaran }}</td>
                        <td class="p-3">{{ h.kelas }}</td>
                        <td class="p-3">{{ classActionLabel(h.action) }}</td>
                        <td class="p-3">{{ h.reason || "-" }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal Edit Data -->
        <div
            v-if="showEditModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div
                class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-4">
                    Edit Data Siswa
                </h2>

                <form @submit.prevent="handleSaveEdit" class="space-y-3">
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

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                class="block text-sm font-medium mb-1 text-gray-600"
                                >NIS</label
                            >
                            <input
                                v-model="editForm.nis"
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            />
                        </div>
                        <div>
                            <label
                                class="block text-sm font-medium mb-1 text-gray-600"
                                >NISN</label
                            >
                            <input
                                v-model="editForm.nisn"
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
                            v-model="editForm.gender"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
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
                            v-model="editForm.tanggalLahir"
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
                            v-model="editForm.alamat"
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
                                v-model="editForm.jenjang"
                                required
                                @change="editForm.kelasSekarang = ''"
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            >
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
                                v-model="editForm.kelasSekarang"
                                required
                                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            >
                                <option value="">Pilih</option>
                                <option
                                    v-for="k in kelasOptionsFor(
                                        editForm.jenjang,
                                    )"
                                    :key="k"
                                    :value="k"
                                >
                                    {{ k }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div
                        v-if="kelasBerubah"
                        class="bg-amber-50 border border-amber-100 rounded-lg p-3"
                    >
                        <label
                            class="block text-sm font-medium mb-1 text-amber-800"
                            >Alasan Perubahan Kelas</label
                        >
                        <input
                            v-model="editForm.kelasChangeReason"
                            required
                            placeholder="misal: Naik kelas tahun ajaran baru"
                            class="w-full border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Nama Orang Tua/Wali</label
                        >
                        <input
                            v-model="editForm.namaOrtu"
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
                            v-model="editForm.noHpOrtu"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>

                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Status</label
                        >
                        <select
                            v-model="editForm.status"
                            required
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                    </div>

                    <div
                        v-if="statusBerubah"
                        class="bg-amber-50 border border-amber-100 rounded-lg p-3"
                    >
                        <label
                            class="block text-sm font-medium mb-1 text-amber-800"
                            >Alasan Perubahan Status</label
                        >
                        <input
                            v-model="editForm.statusReason"
                            required
                            placeholder="misal: Pindah sekolah"
                            class="w-full border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                    </div>

                    <p v-if="editErrorMessage" class="text-red-600 text-sm">
                        {{ editErrorMessage }}
                    </p>

                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            @click="showEditModal = false"
                            class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            :disabled="isSavingEdit"
                            class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                            {{
                                isSavingEdit
                                    ? "Menyimpan..."
                                    : "Simpan Perubahan"
                            }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Generate QR Baru (regenerate) -->
        <div
            v-if="showGenerateModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-1">
                    Generate QR Baru
                </h2>
                <div
                    class="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-lg mb-4 space-y-1.5"
                >
                    <p class="flex items-start gap-1.5">
                        <svg
                            class="w-3.5 h-3.5 mt-0.5 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                        QR baru langsung aktif dan bisa dipakai absen segera
                        setelah dibuat.
                    </p>
                    <p class="flex items-start gap-1.5">
                        <svg
                            class="w-3.5 h-3.5 mt-0.5 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                        QR lama tetap bisa dipakai selama masa tenggang
                        {{ data.qrGracePeriodDays }} hari, setelah itu otomatis
                        nonaktif.
                    </p>
                </div>
                <form @submit.prevent="handleGenerateSubmit" class="space-y-3">
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Alasan</label
                        >
                        <input
                            v-model="generateReason"
                            placeholder="misal: Kartu hilang"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            @click="showGenerateModal = false"
                            class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            :disabled="isGenerating"
                            class="px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 disabled:opacity-50"
                        >
                            {{ isGenerating ? "Memproses..." : "Generate" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Daftarkan QR (scan) -->
        <div
            v-if="showRegisterModal"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-1">
                    Daftarkan QR
                </h2>
                <p class="text-sm text-gray-500 mb-4">
                    Arahkan kartu QR fisik ke kamera
                </p>

                <div
                    id="register-qr-reader"
                    class="rounded-xl overflow-hidden border border-gray-100 mb-4"
                ></div>

                <div
                    v-if="scannedToken"
                    class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2"
                >
                    <div
                        class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                    >
                        <svg
                            class="w-3.5 h-3.5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                    <p class="text-sm text-green-700 font-medium">QR Terbaca</p>
                </div>

                <form @submit.prevent="handleRegisterQr" class="space-y-3">
                    <p v-if="registerErrorMessage" class="text-red-600 text-sm">
                        {{ registerErrorMessage }}
                    </p>

                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            @click="closeRegisterModal"
                            class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            :disabled="!scannedToken || isRegistering"
                            class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                            {{ isRegistering ? "Menyimpan..." : "Daftarkan" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Preview QR Baru -->
        <div
            v-if="generatedQrUuid"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div
                class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center"
            >
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-3">
                    QR Berhasil Dibuat
                </h2>
                <img
                    :src="`/api/qr-images/${generatedQrUuid}`"
                    class="mx-auto mb-3 w-48 h-48 rounded-lg border border-gray-100"
                />
                <div class="flex gap-2">
                    <a
                        :href="`/api/qr-images/${generatedQrUuid}`"
                        :download="`QR-${slugifyFilename(data.student.nama)}.png`"
                        class="px-4 py-2 rounded-lg bg-primary-600 text-white flex-1 text-sm font-medium hover:bg-primary-700"
                    >
                        Download
                    </a>
                    <button
                        @click="generatedQrUuid = null"
                        class="px-4 py-2 rounded-lg border border-gray-200 flex-1 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal Koreksi -->
        <div
            v-if="correctModalAttendance"
            class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h2 class="text-lg font-heading font-bold text-gray-800 mb-1">
                    Koreksi Absensi
                </h2>
                <p class="text-sm text-gray-500 mb-4">
                    {{ formatDate(correctModalAttendance.tanggal) }}
                </p>

                <form @submit.prevent="handleCorrect" class="space-y-3">
                    <div>
                        <label
                            class="block text-sm font-medium mb-1 text-gray-600"
                            >Alasan</label
                        >
                        <textarea
                            v-model="correctForm.reason"
                            required
                            placeholder="misal: Hujan deras"
                            class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                        ></textarea>
                    </div>
                    <p v-if="correctErrorMessage" class="text-red-600 text-sm">
                        {{ correctErrorMessage }}
                    </p>
                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            @click="correctModalAttendance = null"
                            class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            :disabled="isCorrecting"
                            class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                        >
                            {{ isCorrecting ? "Menyimpan..." : "Simpan" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { Html5Qrcode } from "html5-qrcode";

const classActionLabels: Record<string, string> = {
    masuk_baru: "Siswa Baru Masuk",
    naik_kelas: "Naik Kelas",
    pindah_kelas: "Pindah Kelas",
};

function classActionLabel(action: string) {
    return classActionLabels[action] ?? action;
}

const route = useRoute();
const { data, refresh } = await useFetch(`/api/students/${route.params.uuid}`);

function formatDate(d: string) {
    return dayjs(d).format("DD MMM YYYY");
}
function formatTime(d: string) {
    return dayjs(d).format("HH:mm");
}

function statusLabel(a: any) {
    const map: Record<string, string> = {
        hadir: "Hadir",
        terlambat: "Terlambat",
        tidak_hadir: "Tidak Hadir",
    };
    let label = map[a.statusUtama];
    if (a.statusKoreksi === "dimaklumi") label += " (Dimaklumi)";
    return label;
}

function statusClass(a: any) {
    if (a.statusKoreksi === "dimaklumi") return "bg-green-100 text-green-700";
    if (a.statusUtama === "hadir") return "bg-green-100 text-green-700";
    if (a.statusUtama === "terlambat") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
}

function barHeight(count: number) {
    const max = Math.max(
        data.value?.summary.hadir ?? 1,
        data.value?.summary.terlambat ?? 1,
        data.value?.summary.tidakHadir ?? 1,
        1,
    );
    return `${Math.max((count / max) * 100, 4)}%`;
}

function kelasOptionsFor(jenjang: string) {
    if (jenjang === "TK") return ["TK A", "TK B"];
    if (jenjang === "SD") return ["1", "2", "3", "4", "5", "6"];
    if (jenjang === "SMP") return ["7", "8", "9"];
    return [];
}

function slugifyFilename(name: string) {
    return name
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "");
}

// --- Upload Foto ---
const photoVersion = ref(0);
const photoErrorMessage = ref("");

async function handlePhotoUpload(e: Event) {
    photoErrorMessage.value = "";
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
        await $fetch(`/api/students/${route.params.uuid}/photo`, {
            method: "POST",
            body: formData,
        });
        photoVersion.value++;
        await refresh();
    } catch (err: any) {
        photoErrorMessage.value =
            err?.data?.statusMessage || "Gagal upload foto";
    }
}

// --- Edit Data ---
const showEditModal = ref(false);
const isSavingEdit = ref(false);
const editErrorMessage = ref("");
const editForm = reactive({
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
    status: "active",
    statusReason: "",
    kelasChangeReason: "",
});
let originalKelas = "";
let originalStatus = "";

function openEditModal() {
    const s = data.value!.student;
    Object.assign(editForm, {
        nama: s.nama,
        nis: s.nis || "",
        nisn: s.nisn || "",
        gender: s.gender,
        tanggalLahir: dayjs(s.tanggalLahir).format("YYYY-MM-DD"),
        alamat: s.alamat || "",
        jenjang: s.jenjang,
        kelasSekarang: s.kelasSekarang,
        namaOrtu: s.namaOrtu || "",
        noHpOrtu: s.noHpOrtu || "",
        status: s.status,
        statusReason: "",
        kelasChangeReason: "",
    });
    originalKelas = s.kelasSekarang;
    originalStatus = s.status;
    editErrorMessage.value = "";
    showEditModal.value = true;
}

const kelasBerubah = computed(() => editForm.kelasSekarang !== originalKelas);
const statusBerubah = computed(() => editForm.status !== originalStatus);

async function handleSaveEdit() {
    editErrorMessage.value = "";
    isSavingEdit.value = true;
    try {
        await $fetch(`/api/students/${route.params.uuid}`, {
            method: "PATCH",
            body: { ...editForm },
        });
        showEditModal.value = false;
        await refresh();
    } catch (err: any) {
        editErrorMessage.value =
            err?.data?.statusMessage || "Gagal menyimpan perubahan";
    } finally {
        isSavingEdit.value = false;
    }
}

// --- QR: Generate / Generate Baru ---
const generatedQrUuid = ref<string | null>(null);
const showGenerateModal = ref(false);
const isGenerating = ref(false);
const generateReason = ref("");

function handleGenerateClick() {
    if (!data.value?.qr) {
        doGenerate("");
    } else {
        generateReason.value = "";
        showGenerateModal.value = true;
    }
}

async function handleGenerateSubmit() {
    isGenerating.value = true;
    await doGenerate(generateReason.value);
    isGenerating.value = false;
    showGenerateModal.value = false;
}

async function doGenerate(reason: string) {
    try {
        const res: any = await $fetch(
            `/api/students/${route.params.uuid}/regenerate-qr`,
            {
                method: "POST",
                body: { reason },
            },
        );
        generatedQrUuid.value = res.qrUuid;
        await refresh();
    } catch (err: any) {
        alert(err?.data?.statusMessage || "Gagal generate QR");
    }
}

// --- QR: Delete ---
async function handleDeleteQr() {
    const ok = await confirm({
        title: "Hapus QR",
        message: `QR aktif ${data.value!.student.nama} akan langsung dinonaktifkan saat ini juga (tidak ada masa tenggang). Kartu QR yang sudah dicetak tidak akan bisa dipakai lagi untuk absen. Lanjutkan?`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;

    try {
        await $fetch(`/api/students/${route.params.uuid}/delete-qr`, {
            method: "POST",
        });
        await refresh();
    } catch (err: any) {
        alert(err?.data?.statusMessage || "Gagal menghapus QR");
    }
}

// --- QR: Daftarkan (scan kamera) ---
const showRegisterModal = ref(false);
const scannedToken = ref("");
const isRegistering = ref(false);
const registerErrorMessage = ref("");
let registerScanner: Html5Qrcode | null = null;

async function openRegisterModal() {
    scannedToken.value = "";
    registerErrorMessage.value = "";
    showRegisterModal.value = true;

    await nextTick();
    registerScanner = new Html5Qrcode("register-qr-reader");
    await registerScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
            scannedToken.value = decodedText;
        },
        () => {},
    );
}

async function closeRegisterModal() {
    if (registerScanner) {
        await registerScanner.stop().catch(() => {});
        registerScanner = null;
    }
    showRegisterModal.value = false;
}

async function handleRegisterQr() {
    registerErrorMessage.value = "";
    isRegistering.value = true;
    try {
        await $fetch(`/api/students/${route.params.uuid}/register-qr`, {
            method: "POST",
            body: { token: scannedToken.value },
        });
        await closeRegisterModal();
        await refresh();
    } catch (err: any) {
        registerErrorMessage.value =
            err?.data?.statusMessage || "Gagal mendaftarkan QR";
    } finally {
        isRegistering.value = false;
    }
}

// --- Koreksi Absensi ---
const correctModalAttendance = ref<any>(null);
const isCorrecting = ref(false);
const correctErrorMessage = ref("");
const correctForm = reactive({ reason: "" });

function openCorrectModal(attendance: any) {
    correctModalAttendance.value = attendance;
    correctForm.reason = "";
    correctErrorMessage.value = "";
}

async function handleCorrect() {
    correctErrorMessage.value = "";
    isCorrecting.value = true;
    try {
        await $fetch(
            `/api/attendance/${correctModalAttendance.value.id}/correct`,
            {
                method: "PATCH",
                body: { reason: correctForm.reason },
            },
        );
        correctModalAttendance.value = null;
        await refresh();
    } catch (err: any) {
        correctErrorMessage.value =
            err?.data?.statusMessage || "Gagal menyimpan koreksi";
    } finally {
        isCorrecting.value = false;
    }
}

const { confirm } = useConfirm();

async function handleDeleteStudent() {
    const ok = await confirm({
        title: "Hapus Siswa",
        message: `Yakin ingin menghapus data ${data.value!.student.nama}? Data tidak akan tampil lagi di sistem.`,
        confirmText: "Ya, Hapus",
        danger: true,
    });
    if (!ok) return;

    try {
        await $fetch(`/api/students/${route.params.uuid}`, {
            method: "DELETE",
        });
        await navigateTo("/siswa");
    } catch (err: any) {
        alert(err?.data?.statusMessage || "Gagal menghapus siswa");
    }
}
</script>
