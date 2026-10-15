<template>
    <div>
        <label :for="id" class="block text-sm font-medium mb-1 text-gray-600">
            {{ label }}
        </label>
        <div class="relative">
            <input
                :id="id"
                v-model="model"
                :type="visible ? 'text' : 'password'"
                :autocomplete="autocomplete"
                :aria-invalid="!!error"
                :aria-describedby="error ? `${id}-error` : undefined"
                class="w-full border rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2"
                :class="
                    error
                        ? 'border-red-400 focus:ring-red-300'
                        : 'border-gray-200 focus:ring-primary-400'
                "
            />
            <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                :aria-label="visible ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="visible = !visible"
            >
                <svg
                    class="w-[18px] h-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <template v-if="visible">
                        <path
                            d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24"
                        />
                        <path d="M1 1l22 22" />
                    </template>
                    <template v-else>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </template>
                </svg>
            </button>
        </div>
        <p v-if="error" :id="`${id}-error`" class="text-red-600 text-xs mt-1">
            {{ error }}
        </p>
        <slot />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    id: string;
    label: string;
    autocomplete?: string;
    error?: string;
}>();
const model = defineModel<string>({ required: true });
const visible = ref(false);
</script>
