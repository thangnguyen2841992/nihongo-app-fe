<script setup lang="ts">
defineProps<{ page: number; totalPages: number; totalElements: number; busy: boolean }>()
defineEmits<{ change: [page: number] }>()
</script>
<template><nav class="ops-pager" aria-label="Phân trang"><span>{{ totalElements }} kết quả<span v-if="totalPages"> · Trang {{ page + 1 }} / {{ totalPages }}</span></span><button v-if="totalPages > 1" class="ops-button secondary" :disabled="busy || page === 0" @click="$emit('change', page - 1)">Trước</button><button v-if="totalPages > 1" class="ops-button secondary" :disabled="busy || page + 1 >= totalPages" @click="$emit('change', page + 1)">Sau</button></nav></template>

