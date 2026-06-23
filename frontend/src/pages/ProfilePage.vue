<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProfile, updateProfile, getGoals, updateGoals, type UserProfile, type UserGoals } from '../api/auth'

const profile = ref<UserProfile>({ weightKg: null, heightCm: null, age: null, goal: null })
const goals = ref<UserGoals>({ targetWeightKg: null, dailyCaloriesKcal: null, dailyProteinG: null })

const loadingProfile = ref(true)
const loadingGoals = ref(true)
const savingProfile = ref(false)
const savingGoals = ref(false)
const profileError = ref('')
const goalsError = ref('')
const profileSuccess = ref('')
const goalsSuccess = ref('')

const GOAL_OPTIONS: Array<{ value: UserProfile['goal']; label: string }> = [
  { value: 'lose_weight', label: 'Perder peso' },
  { value: 'maintain_weight', label: 'Manter peso' },
  { value: 'gain_muscle', label: 'Ganhar músculo' }
]

onMounted(async () => {
  try {
    const res = await getProfile()
    profile.value = res.data
  } catch {
    profileError.value = 'Erro ao carregar perfil.'
  } finally {
    loadingProfile.value = false
  }

  try {
    const res = await getGoals()
    goals.value = res.data
  } catch {
    goalsError.value = 'Erro ao carregar objetivos.'
  } finally {
    loadingGoals.value = false
  }
})

async function handleSaveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  savingProfile.value = true
  try {
    const res = await updateProfile(profile.value)
    profile.value = res.data
    profileSuccess.value = 'Perfil guardado com sucesso.'
  } catch {
    profileError.value = 'Erro ao guardar perfil.'
  } finally {
    savingProfile.value = false
  }
}

async function handleSaveGoals() {
  goalsError.value = ''
  goalsSuccess.value = ''
  savingGoals.value = true
  try {
    const res = await updateGoals(goals.value)
    goals.value = res.data
    goalsSuccess.value = 'Objetivos guardados com sucesso.'
  } catch {
    goalsError.value = 'Erro ao guardar objetivos.'
  } finally {
    savingGoals.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Perfil</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section class="bg-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Dados Físicos</h2>

        <div v-if="loadingProfile" class="text-gray-400">A carregar...</div>

        <form v-else @submit.prevent="handleSaveProfile" novalidate>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Peso (kg)</label>
            <input
              v-model.number="profile.weightKg"
              type="number"
              step="0.1"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Altura (cm)</label>
            <input
              v-model.number="profile.heightCm"
              type="number"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Idade</label>
            <input
              v-model.number="profile.age"
              type="number"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div class="mb-6">
            <label class="block text-sm text-gray-400 mb-1">Objetivo</label>
            <select
              v-model="profile.goal"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Selecionar...</option>
              <option v-for="opt in GOAL_OPTIONS" :key="opt.value ?? ''" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div v-if="profileError" class="mb-3 text-red-400 text-sm">{{ profileError }}</div>
          <div v-if="profileSuccess" class="mb-3 text-green-400 text-sm">{{ profileSuccess }}</div>

          <button
            type="submit"
            :disabled="savingProfile"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            {{ savingProfile ? 'A guardar...' : 'Guardar' }}
          </button>
        </form>
      </section>

      <section class="bg-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Objetivos Nutricionais</h2>

        <div v-if="loadingGoals" class="text-gray-400">A carregar...</div>

        <form v-else @submit.prevent="handleSaveGoals" novalidate>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Peso alvo (kg)</label>
            <input
              v-model.number="goals.targetWeightKg"
              type="number"
              step="0.1"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Calorias diárias (kcal)</label>
            <input
              v-model.number="goals.dailyCaloriesKcal"
              type="number"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div class="mb-6">
            <label class="block text-sm text-gray-400 mb-1">Proteína diária (g)</label>
            <input
              v-model.number="goals.dailyProteinG"
              type="number"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div v-if="goalsError" class="mb-3 text-red-400 text-sm">{{ goalsError }}</div>
          <div v-if="goalsSuccess" class="mb-3 text-green-400 text-sm">{{ goalsSuccess }}</div>

          <button
            type="submit"
            :disabled="savingGoals"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            {{ savingGoals ? 'A guardar...' : 'Guardar' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
