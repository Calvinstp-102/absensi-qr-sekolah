<template>
    <BaseModal :open="!!log" title="Detail Aktivitas" :subtitle="log ? formatTanggalWaktu(log.waktu) + ' WIB' : ''" size="lg" @close="emit('close')">
        <div v-if="log" class="space-y-4 text-sm">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="badgeAksi(log)">{{ log.label }}</span>
                <span class="text-xs text-gray-400">{{ KATEGORI_AUDIT[log.kategori].label }}</span>
            </div>

            <dl class="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2">
                <dt class="text-gray-500">Oleh</dt>
                <dd class="flex items-center gap-2">
                    <UserAvatar :nama="log.guru.nama" :uuid="log.guru.uuid" :foto-path="log.guru.fotoPath" size="sm" />
                    <span class="font-medium text-gray-800">{{ log.guru.nama }}</span>
                    <span class="text-xs text-gray-400">{{ ROLE_LABELS[log.guru.role] }}</span>
                </dd>

                <template v-if="log.target">
                    <dt class="text-gray-500">{{ log.target.jenis }}</dt>
                    <dd>
                        <NuxtLink v-if="log.target.link" :to="log.target.link" class="font-medium text-primary-600 hover:underline" @click="emit('close')">
                            {{ log.target.label }}
                        </NuxtLink>
                        <span v-else class="font-medium text-gray-800">{{ log.target.label }}</span>
                        <span v-if="log.target.sub" class="block text-xs text-gray-500">{{ log.target.sub }}</span>
                    </dd>
                </template>

                <template v-if="log.alasan">
                    <dt class="text-gray-500">Alasan</dt>
                    <dd class="text-gray-800 whitespace-pre-line">{{ log.alasan }}</dd>
                </template>

                <template v-if="log.akun">
                    <dt class="text-gray-500">Alamat IP</dt>
                    <dd class="text-gray-800 font-mono text-xs">{{ log.akun.ip || "–" }}</dd>
                    <dt class="text-gray-500">Perangkat</dt>
                    <dd class="text-gray-800">{{ log.akun.perangkat || "–" }}</dd>
                </template>
            </dl>

            <div v-if="detail.length">
                <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Rincian perubahan</p>
                <div class="rounded-lg border border-gray-200 overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 text-xs text-gray-500">
                            <tr>
                                <th class="px-3 py-2 text-left font-medium w-1/4">Data</th>
                                <th class="px-3 py-2 text-left font-medium">Sebelum</th>
                                <th class="px-3 py-2 text-left font-medium">Sesudah</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="p in detail" :key="p.field" class="border-t border-gray-100 align-top" :class="{ 'bg-amber-50/50': p.berubah }">
                                <td class="px-3 py-2 text-gray-600">{{ p.label }}</td>
                                <td class="px-3 py-2 break-words" :class="p.berubah ? 'text-red-600 line-through decoration-red-300' : 'text-gray-500'">{{ p.sebelum }}</td>
                                <td class="px-3 py-2 break-words" :class="p.berubah ? 'text-green-700 font-medium' : 'text-gray-500'">{{ p.sesudah }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <p v-else class="text-xs text-gray-400">Tidak ada rincian data untuk aktivitas ini.</p>

            <p class="text-[11px] text-gray-400">ID referensi: {{ log.uuid }}</p>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import type { AuditRow } from "~/types/audit";

const props = defineProps<{ log: AuditRow | null }>();
const emit = defineEmits<{ close: [] }>();

const detail = computed(() => props.log?.perubahan ?? []);

function badgeAksi(l: AuditRow) {
    return l.tone === "bahaya" ? "bg-red-100 text-red-700" : KATEGORI_AUDIT[l.kategori].badge;
}
</script>
