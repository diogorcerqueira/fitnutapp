<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLogs, type WorkoutLog } from '../api/workouts'

const logs = ref<WorkoutLog[]>([])
const loading = ref(true)
const error = ref('')

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  try {
    const res = await getLogs()
    logs.value = res.data
  } catch {
    error.value = 'Erro ao carregar histórico de treinos.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Histórico de Treinos</h1>

    <div v-if="loading" class="text-gray-400">A carregar...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>
    <div v-else-if="logs.length === 0" class="text-gray-500">Nenhum treino registado ainda.</div>

    <div v-else class="space-y-4">
      <div
        v-for="log in logs"
        :key="log.id"
        class="bg-gray-800 rounded-xl p-5"
      >
        <p class="text-white font-semibold mb-3">{{ formatDate(log.executedAt) }}</p>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-500 text-left border-b border-gray-700 text-xs uppercase tracking-wider">
              <th class="pb-2 pr-4">Exercício</th>
              <th class="pb-2 pr-4">Séries</th>
              <th class="pb-2 pr-4">Reps</th>
              <th class="pb-2">Peso</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ex in log.exercises"
              :key="ex.exerciseId"
              class="border-b border-gray-700/40 last:border-0"
            >
              <td class="py-2 pr-4 text-gray-300">{{ ex.exercise.name }}</td>
              <td class="py-2 pr-4 text-gray-400">{{ ex.sets }}</td>
              <td class="py-2 pr-4 text-gray-400">{{ ex.reps }}</td>
              <td class="py-2 text-gray-400">{{ ex.weightKg > 0 ? `${ex.weightKg} kg` : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
