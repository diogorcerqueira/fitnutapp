<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  unit?: string
  total?: number | null
}>()
</script>

<template>
  <div class="bg-gray-800 rounded-lg p-4">
    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">{{ label }}</p>
    <p class="text-2xl font-bold text-white">
      {{ value }}
      <template v-if="total != null">
        <span class="text-lg text-gray-400">/{{ total }}</span>
      </template>
      <span v-if="unit" class="text-sm text-gray-400 ml-1">{{ unit }}</span>
    </p>
    <div v-if="total != null && typeof value === 'number'" class="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all"
        :class="value >= total ? 'bg-green-500' : 'bg-indigo-500'"
        :style="{ width: Math.min(100, Math.round((value / total) * 100)) + '%' }"
      />
    </div>
  </div>
</template>
