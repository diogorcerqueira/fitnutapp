<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchExercises, getPlans, getPlan, createPlan, updatePlan, type Exercise, type WorkoutPlan } from '../api/workouts'

const exercises = ref<Exercise[]>([])
const loading = ref(false)
const error = ref('')

const filterName = ref('')
const filterMuscle = ref('')
const filterEquipment = ref('')

// Add to plan modal
const modal = ref<{ exercise: Exercise; open: boolean }>({ exercise: {} as Exercise, open: false })
const plans = ref<WorkoutPlan[]>([])
const selectedPlanId = ref('')
const addSets = ref(3)
const addReps = ref(10)
const addWeight = ref(0)
const addLoading = ref(false)
const addSuccess = ref('')
const addError = ref('')

const newPlanName = ref('')
const creatingPlan = ref(false)

async function fetchExercises() {
  loading.value = true
  error.value = ''
  try {
    const res = await searchExercises({
      name: filterName.value || undefined,
      muscleGroup: filterMuscle.value || undefined,
      equipment: filterEquipment.value || undefined
    })
    exercises.value = res.data
  } catch {
    error.value = 'Erro ao carregar exercícios.'
  } finally {
    loading.value = false
  }
}

async function openAddModal(ex: Exercise) {
  modal.value = { exercise: ex, open: true }
  addSuccess.value = ''
  addError.value = ''
  selectedPlanId.value = ''
  addSets.value = 3
  addReps.value = 10
  addWeight.value = 0
  newPlanName.value = ''
  try {
    const res = await getPlans()
    plans.value = res.data.filter(p => p.state === 'draft')
  } catch {
    addError.value = 'Erro ao carregar planos.'
  }
}

async function createAndAdd() {
  if (!newPlanName.value.trim()) { addError.value = 'Introduz um nome para o plano.'; return }
  creatingPlan.value = true
  addError.value = ''
  try {
    await createPlan({
      name: newPlanName.value.trim(),
      exercises: [{ exerciseId: modal.value.exercise.id, sets: addSets.value, reps: addReps.value, targetWeightKg: addWeight.value || undefined }]
    })
    addSuccess.value = `Plano "${newPlanName.value.trim()}" criado com "${modal.value.exercise.name}"!`
    newPlanName.value = ''
    const updated = await getPlans()
    plans.value = updated.data.filter(p => p.state === 'draft')
  } catch {
    addError.value = 'Erro ao criar plano.'
  } finally {
    creatingPlan.value = false
  }
}

function closeModal() {
  modal.value.open = false
}

async function confirmAdd() {
  if (!selectedPlanId.value) { addError.value = 'Seleciona um plano.'; return }
  addLoading.value = true
  addError.value = ''
  try {
    const res = await getPlan(selectedPlanId.value)
    const existing = res.data.exercises.map(e => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      reps: e.reps,
      targetWeightKg: e.targetWeightKg,
    }))
    await updatePlan(selectedPlanId.value, {
      exercises: [
        ...existing,
        { exerciseId: modal.value.exercise.id, sets: addSets.value, reps: addReps.value, targetWeightKg: addWeight.value || undefined }
      ]
    })
    addSuccess.value = `"${modal.value.exercise.name}" adicionado ao plano!`
    // refresh plans list to get updated exercise counts
    const updated = await getPlans()
    plans.value = updated.data.filter(p => p.state === 'draft')
  } catch {
    addError.value = 'Erro ao adicionar ao plano.'
  } finally {
    addLoading.value = false
  }
}

onMounted(fetchExercises)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Exercícios</h1>

    <div class="bg-gray-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <input
        v-model="filterName"
        type="text"
        placeholder="Nome do exercício"
        class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
      <input
        v-model="filterMuscle"
        type="text"
        placeholder="Grupo muscular"
        class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
      <input
        v-model="filterEquipment"
        type="text"
        placeholder="Equipamento"
        class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
      <button
        class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        @click="fetchExercises"
      >
        Pesquisar
      </button>
    </div>

    <div v-if="loading" class="text-gray-400">A carregar...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>
    <div v-else-if="exercises.length === 0" class="text-gray-500">Nenhum exercício encontrado.</div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="ex in exercises"
        :key="ex.id"
        class="bg-gray-800 rounded-xl p-4 flex flex-col"
      >
        <h3 class="text-white font-semibold mb-2">{{ ex.name }}</h3>
        <p class="text-sm text-gray-400 mb-1">
          <span class="text-gray-500">Músculo:</span> {{ ex.muscleGroup }}
        </p>
        <p class="text-sm text-gray-400 mb-2">
          <span class="text-gray-500">Equipamento:</span> {{ ex.equipment }}
        </p>
        <p v-if="ex.description" class="text-xs text-gray-500 line-clamp-3 mb-3">{{ ex.description }}</p>
        <div class="mt-auto">
          <button
            class="w-full text-sm bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            @click="openAddModal(ex)"
          >
            + Adicionar a plano
          </button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="modal.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      @click.self="closeModal"
    >
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-white font-semibold text-base mb-1">Adicionar a plano</h2>
        <p class="text-sm text-gray-400 mb-5">{{ modal.exercise.name }}</p>

        <div class="mb-4">
          <label class="text-xs text-gray-400 block mb-1">Adicionar a plano existente</label>
          <select
            v-model="selectedPlanId"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>Seleciona um plano...</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="mb-4 border-t border-gray-700 pt-4">
          <label class="text-xs text-gray-400 block mb-1">Ou criar novo plano</label>
          <div class="flex gap-2">
            <input
              v-model="newPlanName"
              type="text"
              placeholder="Nome do plano..."
              class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              @keyup.enter="createAndAdd"
            />
            <button
              :disabled="creatingPlan || !newPlanName.trim()"
              class="bg-gray-600 hover:bg-gray-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              @click="createAndAdd"
            >
              {{ creatingPlan ? '...' : 'Criar e adicionar' }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 mb-5">
          <div>
            <label class="text-xs text-gray-400 block mb-1">Séries</label>
            <input v-model.number="addSets" type="number" min="1"
              class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Reps</label>
            <input v-model.number="addReps" type="number" min="1"
              class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Peso alvo (kg)</label>
            <input v-model.number="addWeight" type="number" min="0" step="0.5"
              class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div v-if="addError" class="mb-3 text-sm text-red-400">{{ addError }}</div>
        <div v-if="addSuccess" class="mb-3 text-sm text-green-400">{{ addSuccess }}</div>

        <div class="flex gap-3">
          <button
            :disabled="addLoading"
            class="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            @click="confirmAdd"
          >
            {{ addLoading ? 'A adicionar...' : 'Adicionar' }}
          </button>
          <button
            class="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            @click="closeModal"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
