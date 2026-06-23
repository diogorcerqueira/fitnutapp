<script setup lang="ts">
import type { WorkoutPlanState } from '../api/workouts'

const props = defineProps<{ state: WorkoutPlanState }>()

const STATE_LABELS: Record<WorkoutPlanState, string> = {
  draft: 'Rascunho',
  ready: 'Pronto',
  completed: 'Concluído'
}

const STATE_CLASSES: Record<WorkoutPlanState, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  ready: 'bg-green-500/20 text-green-400 border border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
}
</script>

<template>
  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="STATE_CLASSES[props.state]">
    {{ STATE_LABELS[props.state] }}
  </span>
</template>
