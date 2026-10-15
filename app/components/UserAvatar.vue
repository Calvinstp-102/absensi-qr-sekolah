<template>
    <img
        v-if="src && !failed"
        :src="src"
        alt=""
        class="rounded-full object-cover bg-gray-100 shrink-0"
        :class="sizeClass"
        @error="failed = true"
    />
    <div
        v-else
        class="rounded-full flex items-center justify-center font-semibold shrink-0 select-none"
        :class="[sizeClass, colorClass]"
        :aria-label="nama"
    >
        {{ initials }}
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        nama: string;
        uuid?: string;
        fotoPath?: string | null;
        size?: "sm" | "md" | "lg" | "xl";
        /** Foto guru (default) atau foto siswa */
        kind?: "teachers" | "students";
        /** Warna latar inisial, mis. di sidebar yang gelap */
        colorClass?: string;
    }>(),
    { size: "md", kind: "teachers", colorClass: "bg-primary-100 text-primary-700" },
);

// fotoPath berubah setiap upload -> ikut dipakai sebagai versi URL agar cache browser berganti
const src = computed(() =>
    props.uuid && props.fotoPath
        ? `/api/photos/${props.kind}/${props.uuid}?v=${encodeURIComponent(props.fotoPath)}`
        : null,
);

const failed = ref(false);
watch(src, () => (failed.value = false));

const initials = computed(() =>
    props.nama
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join(""),
);

const sizeClass = computed(
    () =>
        ({
            sm: "w-9 h-9 text-sm",
            md: "w-10 h-10 text-sm",
            lg: "w-16 h-16 text-xl",
            xl: "w-24 h-24 text-3xl",
        })[props.size],
);
</script>
