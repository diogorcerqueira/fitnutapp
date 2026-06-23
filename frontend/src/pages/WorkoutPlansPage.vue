<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPlans, createPlan, deletePlan, searchExercises, type WorkoutPlan, type Exercise } from '../api/workouts'
import StateBadge from '../components/StateBadge.vue'

const router = useRouter()
const plans = ref<WorkoutPlan[]>([])
const loading = ref(true)
const error = ref('')

const showModal = ref(false)
const newPlanName = ref('')
const exerciseRows = ref<Array<{ exerciseId: string; sets: number; reps: number; targetWeightKg: number | undefined; searchQuery: string; results: Exercise[]; selected: Exercise | null }>>([])
const creating = ref(false)
const createError = ref('')

function addExerciseRow() {
  exerciseRows.value.push({ exerciseId: '', sets: 3, reps: 10, targetWeightKg: undefined, searchQuery: '', results: [], selected: null })
}

function removeRow(index: number) {
  exerciseRows.value.splice(index, 1)
}

async function searchForExercise(index: number) {
  const row = exerciseRows.value[index]
  if (!row.searchQuery.trim()) return
  try {
    const res = await searchExercises({ name: row.searchQuery })
    row.results = res.data.slice(0, 10)
  } catch {
    // silent — user can retry
  }
}

function selectExercise(index: number, ex: Exercise) {
  const row = exerciseRows.value[index]
  row.selected = ex
  row.exerciseId = ex.id
  row.searchQuery = ex.name
  row.results = []
}

function openModal() {
  newPlanName.value = ''
  exerciseRows.value = []
  createError.value = ''
  addExerciseRow()
  showModal.value = true
}

async function fetchPlans() {
  loading.value = true
  error.value = ''
  try {
    const res = await getPlans()
    plans.value = res.data
  } catch {
    error.value = 'Erro ao carregar planos de treino.'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  createError.value = ''
  if (!newPlanName.value.trim()) {
    createError.value = 'O nome do plano é obrigatório.'
    return
  }
  const rows = exerciseRows.value.filter((r) => r.exerciseId)
  if (rows.length === 0) {
    createError.value = 'Adiciona pelo menos um exercício.'
    return
  }
  creating.value = true
  try {
    await createPlan({
      name: newPlanName.value,
      exercises: rows.map((r) => ({
        exerciseId: r.exerciseId,
        sets: r.sets,
        reps: r.reps,
        targetWeightKg: r.targetWeightKg
      }))
    })
    showModal.value = false
    await fetchPlans()
  } catch {
    createError.value = 'Erro ao criar plano.'
  } finally {
    creating.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm('Eliminar este plano?')) return
  try {
    await deletePlan(id)
    plans.value = plans.value.filter((p) => p.id !== id)
  } catch {
    alert('Erro ao eliminar plano.')
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT')
}

onMounted(fetchPlans)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">Planos de Treino</h1>
      <button
        class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        @click="openModal"
      >
        Novo Plano
      </button>
    </div>

    <div v-if="loading" class="text-gray-400">A carregar...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>
    <div v-else-if="plans.length === 0" class="text-gray-500">Nenhum plano criado ainda.</div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="bg-gray-800 rounded-xl p-5 flex flex-col"
      >
        <div class="flex items-start justify-between mb-3">
          <h3 class="text-white font-semibold">{{ plan.name }}</h3>
          <StateBadge :state="plan.state" />
        </div>
        <p class="text-sm text-gray-400 mb-1">{{ plan.exercises.length }} exercício(s)</p>
        <p class="text-xs text-gray-500 mb-4">Criado em {{ formatDate(plan.createdAt) }}</p>
        <div class="flex gap-2 mt-auto">
          <button
            class="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-sm font-medium py-1.5 rounded-lg transition-colors"
            @click="router.push(`/workout-plans/${plan.id}`)"
          >
            Ver detalhes
          </button>
          <button
            class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium py-1.5 rounded-lg transition-colors"
            @click="handleDelete(plan.id)"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold text-white mb-4">Novo Plano de Treino</h2>

        <div class="mb-4">
          <label class="block text-sm text-gray-400 mb-1">Nome do plano</label>
          <input
            v-model="newPlanName"
            type="text"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            placeholder="Ex: Peito e Tríceps"
          />
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-300">Exercícios</p>
            <button
              class="text-xs text-indigo-400 hover:text-indigo-300"
              @click="addExerciseRow"
            >
              + Adicionar
            </button>
          </div>

          <div v-for="(row, i) in exerciseRows" :key="i" class="bg-gray-700 rounded-lg p-3 mb-2">
            <div class="relative mb-2">
              <input
                v-model="row.searchQuery"
                type="text"
                placeholder="Pesquisar exercício..."
                class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                @input="searchForExercise(i)"
              />
              <ul v-if="row.results.length > 0" class="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded mt-1 max-h-40 overflow-y-auto">
                <li
                  v-for="ex in row.results"
                  :key="ex.id"
                  class="px-3 py-2 text-sm text-gray-200 hover:bg-gray-500 cursor-pointer"
                  @click="selectExercise(i, ex)"
                >
                  {{ ex.name }}
                </li>
              </ul>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-xs text-gray-400">Séries</label>
                <input v-model.number="row.sets" type="number" min="1" class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-gray-400">Reps</label>
                <input v-model.number="row.reps" type="number" min="1" class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-gray-400">Peso alvo (kg)</label>
                <input v-model.number="row.targetWeightKg" type="number" step="0.5" class="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <button class="mt-2 text-xs text-red-400 hover:text-red-300" @click="removeRow(i)">Remover</button>
          </div>
        </div>

        <div v-if="createError" class="mb-3 text-red-400 text-sm">{{ createError }}</div>

        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            @click="showModal = false"
          >
            Cancelar
          </button>
          <button
            :disabled="creating"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
            @click="handleCreate"
          >
            {{ creating ? 'A criar...' : 'Criar Plano' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
