<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getNutritionSummary, type NutritionSummary } from '../api/nutrition'
import { getLogs, type WorkoutLog } from '../api/workouts'
import { getRecommendations, type Recommendation } from '../api/ai'
import MacroCard from '../components/MacroCard.vue'

const authStore = useAuthStore()

const summary = ref<NutritionSummary | null>(null)
const recentLogs = ref<WorkoutLog[]>([])
const latestRec = ref<Recommendation | null>(null)
const loading = ref(true)
const error = ref('')

const FOCUS_LABELS: Record<string, string> = {
  nutrition: 'Nutrição',
  workout: 'Treino',
  recovery: 'Recuperação'
}

const FOCUS_CLASSES: Record<string, string> = {
  nutrition: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  workout: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  recovery: 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(async () => {
  try {
    const [summaryRes, logsRes] = await Promise.all([
      getNutritionSummary(today()),
      getLogs()
    ])
    summary.value = summaryRes.data
    recentLogs.value = logsRes.data.slice(0, 3)

    if (authStore.user?.id) {
      const recRes = await getRecommendations(authStore.user.id)
      latestRec.value = recRes.data.recommendations[0] ?? null
    }
  } catch {
    error.value = 'Erro ao carregar dados do dashboard.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Dashboard</h1>

    <div v-if="loading" class="text-gray-400">A carregar...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <template v-else>
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-gray-300 mb-3">Macros de Hoje</h2>
        <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MacroCard label="Calorias" :value="summary.totals.calories" unit="kcal" />
          <MacroCard label="Proteína" :value="summary.totals.proteinG" unit="g" />
          <MacroCard label="Hidratos" :value="summary.totals.carbsG" unit="g" />
          <MacroCard label="Gordura" :value="summary.totals.fatG" unit="g" />
        </div>
        <p v-else class="text-gray-500 text-sm">Sem dados nutricionais para hoje.</p>
      </section>

      <section class="mb-8">
        <h2 class="text-lg font-semibold text-gray-300 mb-3">Treinos Recentes</h2>
        <div v-if="recentLogs.length > 0" class="space-y-3">
          <div
            v-for="log in recentLogs"
            :key="log.id"
            class="bg-gray-800 rounded-lg p-4"
          >
            <p class="text-white font-medium">{{ formatDate(log.executedAt) }}</p>
            <p class="text-gray-400 text-sm mt-1">{{ log.exercises.length }} exercício(s)</p>
          </div>
        </div>
        <p v-else class="text-gray-500 text-sm">Nenhum treino registado.</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-300 mb-3">Última Recomendação de IA</h2>
        <div v-if="latestRec" class="bg-gray-800 rounded-lg p-4">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
            :class="FOCUS_CLASSES[latestRec.focus_area] ?? 'bg-gray-700 text-gray-300'"
          >
            {{ FOCUS_LABELS[latestRec.focus_area] ?? latestRec.focus_area }}
          </span>
          <p class="text-gray-300 text-sm">{{ latestRec.recommendation }}</p>
        </div>
        <p v-else class="text-gray-500 text-sm">Sem recomendações disponíveis.</p>
      </section>
    </template>
  </div>
</template>
