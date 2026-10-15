<template>
    <div class="inline-block">
        <button
            ref="trigger"
            type="button"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            :class="{ 'bg-gray-100 text-gray-800': open }"
            :aria-expanded="open"
            aria-haspopup="menu"
            :aria-label="`Aksi untuk ${teacher.nama}`"
            @click="toggle"
        >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="12" cy="19" r="1.7" />
            </svg>
        </button>

        <!-- Di-teleport agar tidak terpotong overflow tabel -->
        <Teleport to="body">
            <div
                v-if="open"
                ref="menu"
                role="menu"
                class="fixed z-40 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 text-sm"
                :style="menuStyle"
            >
                <template v-for="(item, i) in items" :key="item.key">
                    <div v-if="item.divider && i > 0" class="my-1 border-t border-gray-100"></div>
                    <button
                        type="button"
                        role="menuitem"
                        :disabled="!!item.disabledReason"
                        :title="item.disabledReason"
                        class="w-full flex items-start gap-2.5 px-3 py-2 text-left disabled:cursor-not-allowed"
                        :class="
                            item.disabledReason
                                ? 'text-gray-300'
                                : item.danger
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-gray-700 hover:bg-gray-50'
                        "
                        @click="select(item.key)"
                    >
                        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path v-for="d in item.icon" :key="d" :d="d" />
                        </svg>
                        <span class="min-w-0">
                            <span class="block">{{ item.label }}</span>
                            <span v-if="item.disabledReason" class="block text-[11px] text-gray-400 leading-tight">
                                {{ item.disabledReason }}
                            </span>
                        </span>
                    </button>
                </template>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import type { TeacherAction, TeacherRow } from "~/types/teacher";


const props = defineProps<{ teacher: TeacherRow; isSelf: boolean }>();
const emit = defineEmits<{ action: [action: TeacherAction] }>();

const ICONS = {
    edit: ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7", "M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
    reset: ["M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"],
    on: ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
    off: ["M18.36 6.64a9 9 0 11-12.73 0", "M12 2v10"],
    photo: ["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z", "M12 17a4 4 0 100-8 4 4 0 000 8z"],
    removePhoto: ["M3 6h18", "M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2", "M10 11v6M14 11v6"],
    delete: ["M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"],
};

const items = computed(() => {
    const t = props.teacher;
    const self = props.isSelf;
    const list: {
        key: TeacherAction;
        label: string;
        icon: string[];
        danger?: boolean;
        divider?: boolean;
        disabledReason?: string;
    }[] = [
        { key: "edit", label: "Edit data", icon: ICONS.edit },
        {
            key: "reset",
            label: "Reset password",
            icon: ICONS.reset,
            disabledReason: self ? "Ganti password sendiri lewat Akun Saya" : undefined,
        },
        {
            key: "toggle",
            label: t.isActive ? "Nonaktifkan akun" : "Aktifkan akun",
            icon: t.isActive ? ICONS.off : ICONS.on,
            disabledReason: self ? "Tidak dapat menonaktifkan akun sendiri" : undefined,
        },
        {
            key: "photo",
            label: t.fotoPath ? "Ganti foto" : "Unggah foto",
            icon: ICONS.photo,
            divider: true,
        },
    ];
    if (t.fotoPath) {
        list.push({ key: "removePhoto", label: "Hapus foto", icon: ICONS.removePhoto });
    }
    list.push({
        key: "delete",
        label: "Hapus akun",
        icon: ICONS.delete,
        danger: true,
        divider: true,
        disabledReason: self ? "Tidak dapat menghapus akun sendiri" : undefined,
    });
    return list;
});

const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLDivElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

function position() {
    const rect = trigger.value?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menu.value?.offsetHeight ?? 300;
    const width = 224; // w-56
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    // Buka ke atas kalau ruang di bawah tidak cukup
    const below = rect.bottom + 4;
    const top =
        below + menuHeight > window.innerHeight - 8
            ? Math.max(8, rect.top - menuHeight - 4)
            : below;
    menuStyle.value = { top: `${top}px`, left: `${left}px` };
}

async function toggle() {
    open.value = !open.value;
    if (open.value) {
        position();
        await nextTick();
        position(); // ulangi setelah tinggi menu diketahui
    }
}

function close() {
    open.value = false;
}

function select(action: TeacherAction) {
    close();
    emit("action", action);
}

function onPointerDown(e: PointerEvent) {
    const target = e.target as Node;
    if (!menu.value?.contains(target) && !trigger.value?.contains(target)) close();
}
function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
}

function listen(on: boolean) {
    if (on) {
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeydown);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
    } else {
        document.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("keydown", onKeydown);
        window.removeEventListener("scroll", close, true);
        window.removeEventListener("resize", close);
    }
}
watch(open, listen);
onBeforeUnmount(() => listen(false));
</script>
