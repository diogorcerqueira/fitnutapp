<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createLog, searchExercises, getPlans, getPlan, type Exercise, type WorkoutPlan } from '../api/workouts'

const router = useRouter()

interface LogRow {
  exerciseId: string
  sets: number
  reps: number
  weightKg: number
  searchQuery: string
  results: Exercise[]
  selected: Exercise | null
}

const executedAt = ref(new Date().toISOString().slice(0, 10))
const rows = ref<LogRow[]>([])
const submitting = ref(false)
const error = ref('')
const success = ref('')

// Import from plan
const plans = ref<WorkoutPlan[]>([])
const selectedImportPlanId = ref('')
const importLoading = ref(false)

async function loadPlans() {
  try {
    const res = await getPlans()
    plans.value = res.data
  } catch {
    // silent
  }
}

async function importFromPlan() {
  if (!selectedImportPlanId.value) return
  importLoading.value = true
  try {
    const res = await getPlan(selectedImportPlanId.value)
    rows.value = res.data.exercises.map(e => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      reps: e.reps,
      weightKg: e.targetWeightKg ?? 0,
      searchQuery: e.exercise.name,
      results: [],
      selected: e.exercise,
    }))
    selectedImportPlanId.value = ''
  } catch {
    error.value = 'Erro ao importar plano.'
  } finally {
    importLoading.value = false
  }
}

function addRow() {
  rows.value.push({ exerciseId: '', sets: 3, reps: 10, weightKg: 0, searchQuery: '', results: [], selected: null })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}

async function searchExercise(index: number) {
  const row = rows.value[index]
  if (!row.searchQuery.trim()) return
  try {
    const res = await searchExercises({ name: row.searchQuery })
    row.results = res.data.slice(0, 10)
  } catch {
    // silent
  }
}

function selectExercise(index: number, ex: Exercise) {
  const row = rows.value[index]
  row.selected = ex
  row.exerciseId = ex.id
  row.searchQuery = ex.name
  row.results = []
}

async function handleSubmit() {
  error.value = ''
  success.value = ''
  const validRows = rows.value.filter((r) => r.exerciseId)
  if (validRows.length === 0) {
    error.value = 'Adiciona pelo menos um exercício.'
    return
  }
  submitting.value = true
  try {
    await createLog({
      executedAt: `${executedAt.value}T00:00:00.000Z`,
      exercises: validRows.map((r) => ({
        exerciseId: r.exerciseId,
        sets: r.sets,
        reps: r.reps,
        weightKg: r.weightKg
      }))
    })
    success.value = 'Treino registado com sucesso!'
    rows.value = []
    addRow()
  } catch {
    error.value = 'Erro ao registar treino.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  addRow()
  loadPlans()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">Registar Treino</h1>
      <button
        class="text-sm text-gray-400 hover:text-white transition-colors"
        @click="router.push('/workouts/history')"
      >
        Ver histórico &#8594;
      </button>
    </div>

    <div class="bg-gray-800 rounded-xl p-6">
      <div class="mb-6">
        <label class="block text-sm text-gray-400 mb-1">Data do treino</label>
        <input
          v-model="executedAt"
          type="date"
          class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <!-- Import from plan -->
      <div class="mb-6 bg-gray-700 rounded-lg p-4">
        <p class="text-sm font-medium text-gray-300 mb-3">Importar de plano existente</p>
        <div class="flex gap-3">
          <select
            v-model="selectedImportPlanId"
            class="flex-1 bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>Seleciona um plano...</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">
              {{ p.name }} <span v-if="p.state === 'ready'"> ✓</span>
            </option>
          </select>
          <button
            :disabled="!selectedImportPlanId || importLoading"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            @click="importFromPlan"
          >
            {{ importLoading ? '...' : 'Importar' }}
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">Pré-preenche os exercícios com base no plano. Podes ajustar antes de guardar.</p>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-gray-300">Exercícios</p>
          <button class="text-sm text-indigo-400 hover:text-indigo-300" @click="addRow">+ Adicionar exercício</button>
        </div>

        <div v-for="(row, i) in rows" :key="i" class="bg-gray-700 rounded-lg p-4 mb-3">
          <div class="relative mb-3">
            <input
              v-model="row.searchQuery"
              type="text"
              placeholder="Pesquisar exercício..."
              class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              @input="searchExercise(i)"
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

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-xs text-gray-400 block mb-1">Séries</label>
              <input
                v-model.number="row.sets"
                type="number"
                min="1"
                class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Reps</label>
              <input
                v-model.number="row.reps"
                type="number"
                min="1"
                class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Peso (kg)</label>
              <input
                v-model.number="row.weightKg"
                type="number"
                step="0.5"
                min="0"
                class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button class="mt-3 text-xs text-red-400 hover:text-red-300" @click="removeRow(i)">Remover</button>
        </div>

        <div v-if="rows.length === 0" class="text-gray-500 text-sm">Nenhum exercício adicionado.</div>
      </div>

      <div v-if="error" class="mb-3 text-red-400 text-sm">{{ error }}</div>
      <div v-if="success" class="mb-3 text-green-400 text-sm">{{ success }}</div>

      <button
        :disabled="submitting"
        class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        @click="handleSubmit"
      >
        {{ submitting ? 'A registar...' : 'Guardar Treino' }}
      </button>
    </div>
  </div>
</template>
