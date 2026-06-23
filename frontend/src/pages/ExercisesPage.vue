<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { searchExercises, type Exercise } from '../api/workouts'

const exercises = ref<Exercise[]>([])
const loading = ref(false)
const error = ref('')

const filterName = ref('')
const filterMuscle = ref('')
const filterEquipment = ref('')

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
        class="bg-gray-800 rounded-xl p-4"
      >
        <h3 class="text-white font-semibold mb-2">{{ ex.name }}</h3>
        <p class="text-sm text-gray-400 mb-1">
          <span class="text-gray-500">Músculo:</span> {{ ex.muscleGroup }}
        </p>
        <p class="text-sm text-gray-400 mb-2">
          <span class="text-gray-500">Equipamento:</span> {{ ex.equipment }}
        </p>
        <p v-if="ex.description" class="text-xs text-gray-500 line-clamp-3">{{ ex.description }}</p>
      </div>
    </div>
  </div>
</template>
