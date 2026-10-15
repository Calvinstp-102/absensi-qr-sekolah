<template>
    <div class="inline-block">
        <button
            ref="trigger"
            type="button"
            class="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            :class="{ 'bg-gray-100 text-gray-800': open }"
            :aria-expanded="open"
            aria-haspopup="menu"
            :aria-label="label"
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

<script setup lang="ts" generic="K extends string">
// Menu titik tiga generik (pola dari guru/ActionMenu.vue)
import type { ActionMenuItem } from "~/types/ui";

defineProps<{ items: ActionMenuItem<K>[]; label: string }>();
const emit = defineEmits<{ select: [key: K] }>();

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

function select(key: K) {
    close();
    emit("select", key);
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
