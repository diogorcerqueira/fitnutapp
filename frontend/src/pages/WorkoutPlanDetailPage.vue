<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPlan, deletePlan, evaluatePlan, type WorkoutPlan } from '../api/workouts'
import StateBadge from '../components/StateBadge.vue'

const route = useRoute()
const router = useRouter()
const planId = route.params.id as string

const plan = ref<WorkoutPlan | null>(null)
const loading = ref(true)
const error = ref('')
const evaluating = ref(false)
const evaluateMessage = ref('')
const evaluateError = ref('')
const deleting = ref(false)

onMounted(async () => {
  try {
    const res = await getPlan(planId)
    plan.value = res.data
  } catch {
    error.value = 'Erro ao carregar plano.'
  } finally {
    loading.value = false
  }
})

async function handleEvaluate() {
  evaluateError.value = ''
  evaluateMessage.value = ''
  evaluating.value = true
  try {
    const res = await evaluatePlan(planId)
    evaluateMessage.value = res.data.message || 'Avaliação em curso, receberás um email quando estiver pronta.'
  } catch {
    evaluateError.value = 'Erro ao solicitar avaliação.'
  } finally {
    evaluating.value = false
  }
}

async function handleDelete() {
  if (!confirm('Eliminar este plano? Esta acção não pode ser revertida.')) return
  deleting.value = true
  try {
    await deletePlan(planId)
    router.push('/workout-plans')
  } catch {
    alert('Erro ao eliminar plano.')
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <button
      class="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-1 transition-colors"
      @click="router.push('/workout-plans')"
    >
      &#8592; Voltar aos planos
    </button>

    <div v-if="loading" class="text-gray-400">A carregar...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <template v-else-if="plan">
      <div class="flex items-center gap-4 mb-6">
        <h1 class="text-2xl font-bold text-white">{{ plan.name }}</h1>
        <StateBadge :state="plan.state" />
      </div>

      <section class="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-300 mb-4">Exercícios</h2>
        <div v-if="plan.exercises.length === 0" class="text-gray-500">Nenhum exercício neste plano.</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 text-left border-b border-gray-700">
              <th class="pb-2 pr-4">Exercício</th>
              <th class="pb-2 pr-4">Músculo</th>
              <th class="pb-2 pr-4">Séries</th>
              <th class="pb-2 pr-4">Reps</th>
              <th class="pb-2">Peso alvo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ex in plan.exercises"
              :key="ex.id"
              class="border-b border-gray-700/50 last:border-0"
            >
              <td class="py-3 pr-4 text-white font-medium">{{ ex.exercise.name }}</td>
              <td class="py-3 pr-4 text-gray-400">{{ ex.exercise.muscleGroup }}</td>
              <td class="py-3 pr-4 text-gray-300">{{ ex.sets }}</td>
              <td class="py-3 pr-4 text-gray-300">{{ ex.reps }}</td>
              <td class="py-3 text-gray-300">{{ ex.targetWeightKg != null ? `${ex.targetWeightKg} kg` : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div v-if="plan.state === 'draft'" class="mb-6">
        <div v-if="evaluateMessage" class="mb-3 text-green-400 text-sm">{{ evaluateMessage }}</div>
        <div v-if="evaluateError" class="mb-3 text-red-400 text-sm">{{ evaluateError }}</div>
        <button
          :disabled="evaluating"
          class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          @click="handleEvaluate"
        >
          {{ evaluating ? 'A solicitar...' : 'Avaliar com IA' }}
        </button>
      </div>

      <section v-if="plan.state === 'ready' && plan.evaluation" class="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-300 mb-4">Avaliação por IA</h2>
        <div class="mb-4">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Avaliação geral</p>
          <p class="text-gray-300">{{ plan.evaluation.general_assessment }}</p>
        </div>
        <div class="mb-4">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Sugestões</p>
          <ul class="space-y-1">
            <li
              v-for="(suggestion, i) in plan.evaluation.suggestions"
              :key="i"
              class="text-gray-300 text-sm flex gap-2"
            >
              <span class="text-indigo-400 shrink-0">&#x2022;</span>
              {{ suggestion }}
            </li>
          </ul>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Adequação ao objetivo</p>
          <p class="text-gray-300">{{ plan.evaluation.goal_adequacy }}</p>
        </div>
      </section>

      <button
        :disabled="deleting"
        class="bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 font-semibold px-6 py-2 rounded-lg transition-colors"
        @click="handleDelete"
      >
        {{ deleting ? 'A eliminar...' : 'Eliminar Plano' }}
      </button>
    </template>
  </div>
</template>
