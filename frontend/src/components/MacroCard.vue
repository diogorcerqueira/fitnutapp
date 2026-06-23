<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  unit?: string
}>()
</script>

<template>
  <div class="bg-gray-800 rounded-lg p-4">
    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">{{ label }}</p>
    <p class="text-2xl font-bold text-white">
      {{ value }}<span v-if="unit" class="text-sm text-gray-400 ml-1">{{ unit }}</span>
    </p>
  </div>
</template>
