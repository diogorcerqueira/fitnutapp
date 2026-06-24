<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getProfile, updateProfile, getGoals, updateGoals, type UserProfile, type UserGoals } from '../api/auth'
import { getAiPreferences, updateAiPreferences } from '../api/ai'

const profile = ref<UserProfile>({ weightKg: null, heightCm: null, age: null, goal: null, gender: null, activityLevel: null })
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

const ACTIVITY_OPTIONS: Array<{ value: UserProfile['activityLevel']; label: string; detail: string }> = [
  { value: 'sedentary',   label: 'Sedentário',         detail: 'Pouco ou nenhum exercício' },
  { value: 'light',       label: 'Ligeiramente ativo',  detail: 'Exercício leve 1–3 dias/semana' },
  { value: 'moderate',    label: 'Moderadamente ativo', detail: 'Exercício moderado 3–5 dias/semana' },
  { value: 'active',      label: 'Ativo',               detail: 'Exercício intenso 6–7 dias/semana' },
  { value: 'very_active', label: 'Muito ativo',          detail: 'Exercício muito intenso ou trabalho físico' },
]

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

// TDEE
const tdee = computed<number | null>(() => {
  const { weightKg, heightCm, age, gender, activityLevel } = profile.value
  if (!weightKg || !heightCm || !age || !gender || !activityLevel) return null
  const bmr = gender === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
})

// Protein multiplier (g/kg) — slider range 1.2–2.4
const proteinMultiplier = ref(1.9)

const PROTEIN_PRESETS = [
  { label: 'Manutenção',     gPerKg: 1.6, desc: 'Preservar massa muscular' },
  { label: 'Desempenho',     gPerKg: 1.9, desc: 'Atletas e praticantes regulares' },
  { label: 'Hipertrofia',    gPerKg: 2.2, desc: 'Máxima síntese proteica' },
]

const activePreset = computed(() =>
  PROTEIN_PRESETS.find(p => Math.abs(p.gPerKg - proteinMultiplier.value) < 0.05) ?? null
)

const dailyProteinComputed = computed<number | null>(() => {
  if (!profile.value.weightKg) return null
  return Math.round(profile.value.weightKg * proteinMultiplier.value)
})

// Zone color based on multiplier
const sliderZone = computed(() => {
  if (proteinMultiplier.value < 1.6) return { label: 'Saúde geral', color: 'text-blue-400' }
  if (proteinMultiplier.value < 1.8) return { label: 'Manutenção', color: 'text-green-400' }
  if (proteinMultiplier.value < 2.1) return { label: 'Desempenho', color: 'text-yellow-400' }
  return { label: 'Hipertrofia', color: 'text-orange-400' }
})

// Equipment
const EQUIPMENT_OPTIONS = [
  'Halteres', 'Barra', 'Máquinas', 'Kettlebell', 'Bandas elásticas',
  'Bola de fitness', 'Corda de saltar', 'Banco', 'Rack de agachamento',
  'Passadeira', 'Bicicleta estática',
]

const selectedEquipment = ref<string[]>([])
const savingEquipment = ref(false)
const equipmentError = ref('')
const equipmentSuccess = ref('')

onMounted(async () => {
  try {
    const res = await getProfile()
    profile.value = { ...res.data, gender: res.data.gender ?? null, activityLevel: res.data.activityLevel ?? null }
  } catch {
    profileError.value = 'Erro ao carregar perfil.'
  } finally {
    loadingProfile.value = false
  }

  try {
    const res = await getGoals()
    goals.value = res.data
    // Init slider from saved protein + weight
    if (res.data.dailyProteinG && profile.value.weightKg) {
      const ratio = res.data.dailyProteinG / profile.value.weightKg
      proteinMultiplier.value = Math.min(2.4, Math.max(1.2, Math.round(ratio * 10) / 10))
    }
  } catch {
    goalsError.value = 'Erro ao carregar objetivos.'
  } finally {
    loadingGoals.value = false
  }

  try {
    const res = await getAiPreferences()
    if (res.data.available_equipment) {
      selectedEquipment.value = res.data.available_equipment.split(',').map((e: string) => e.trim()).filter(Boolean)
    }
  } catch {
    // non-critical
  }
})

async function handleSaveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  savingProfile.value = true
  try {
    const res = await updateProfile(profile.value)
    profile.value = { ...res.data, gender: res.data.gender ?? null, activityLevel: res.data.activityLevel ?? null }
    // auto-persist goals whenever physical data changes — TDEE derives from these fields
    if (tdee.value) {
      const payload: Partial<UserGoals> = { dailyCaloriesKcal: tdee.value }
      if (dailyProteinComputed.value) payload.dailyProteinG = dailyProteinComputed.value
      const goalsRes = await updateGoals(payload)
      goals.value = goalsRes.data
    }
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
    const payload: Partial<UserGoals> = {}
    if (tdee.value) payload.dailyCaloriesKcal = tdee.value
    if (dailyProteinComputed.value) payload.dailyProteinG = dailyProteinComputed.value
    const res = await updateGoals(payload)
    goals.value = res.data
    goalsSuccess.value = 'Objetivos guardados com sucesso.'
  } catch {
    goalsError.value = 'Erro ao guardar objetivos.'
  } finally {
    savingGoals.value = false
  }
}

async function handleSaveEquipment() {
  equipmentError.value = ''
  equipmentSuccess.value = ''
  savingEquipment.value = true
  try {
    await updateAiPreferences({
      available_equipment: selectedEquipment.value.length > 0 ? selectedEquipment.value.join(', ') : null
    })
    equipmentSuccess.value = 'Equipamento guardado com sucesso.'
  } catch {
    equipmentError.value = 'Erro ao guardar equipamento.'
  } finally {
    savingEquipment.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Perfil</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Physical data -->
      <section class="bg-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Dados Físicos</h2>

        <div v-if="loadingProfile" class="text-gray-400">A carregar...</div>

        <form v-else @submit.prevent="handleSaveProfile" novalidate>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Sexo</label>
            <select
              v-model="profile.gender"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option :value="null">Selecionar...</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Peso (kg)</label>
            <input
              v-model.number="profile.weightKg"
              type="number" step="0.1"
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
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1">Nível de atividade</label>
            <select
              v-model="profile.activityLevel"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option :value="null">Selecionar...</option>
              <option v-for="opt in ACTIVITY_OPTIONS" :key="opt.value ?? ''" :value="opt.value">
                {{ opt.label }} — {{ opt.detail }}
              </option>
            </select>
          </div>
          <div class="mb-6">
            <label class="block text-sm text-gray-400 mb-1">Objetivo</label>
            <select
              v-model="profile.goal"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option :value="null">Selecionar...</option>
              <option v-for="opt in GOAL_OPTIONS" :key="opt.value ?? ''" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div v-if="profileError" class="mb-3 text-red-400 text-sm">{{ profileError }}</div>
          <div v-if="profileSuccess" class="mb-3 text-green-400 text-sm">{{ profileSuccess }}</div>

          <button type="submit" :disabled="savingProfile"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
            {{ savingProfile ? 'A guardar...' : 'Guardar' }}
          </button>
        </form>
      </section>

      <!-- Goals -->
      <section class="bg-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Objetivos Nutricionais</h2>

        <div v-if="loadingGoals" class="text-gray-400">A carregar...</div>

        <form v-else @submit.prevent="handleSaveGoals" novalidate>
          <!-- TDEE calories (auto-computed) -->
          <div class="mb-6">
            <label class="block text-sm text-gray-400 mb-1">Calorias diárias (kcal)</label>
            <div v-if="tdee"
              class="w-full bg-gray-700 border border-indigo-500 rounded-lg px-4 py-2 text-white flex items-center justify-between">
              <span class="font-semibold text-indigo-300">{{ tdee }} kcal</span>
              <span class="text-xs text-gray-400">Calculado pelo TDEE</span>
            </div>
            <div v-else
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-500 text-sm">
              Preenche sexo, peso, altura, idade e nível de atividade para calcular automaticamente.
            </div>
          </div>

          <!-- Protein selector -->
          <div class="mb-6">
            <div class="flex items-baseline justify-between mb-2">
              <label class="text-sm text-gray-400">Proteína diária</label>
              <div class="text-right">
                <span class="text-lg font-bold text-white">
                  {{ dailyProteinComputed !== null ? dailyProteinComputed + ' g' : '— g' }}
                </span>
                <span class="text-sm ml-1" :class="sliderZone.color">
                  {{ proteinMultiplier.toFixed(1) }} g/kg · {{ sliderZone.label }}
                </span>
              </div>
            </div>

            <!-- Presets -->
            <div class="flex gap-2 mb-3">
              <button
                v-for="p in PROTEIN_PRESETS"
                :key="p.gPerKg"
                type="button"
                @click="proteinMultiplier = p.gPerKg"
                :class="[
                  'flex-1 rounded-lg py-2 px-1 text-center text-xs font-semibold border transition-colors',
                  activePreset?.gPerKg === p.gPerKg
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-indigo-500'
                ]"
              >
                <div>{{ p.label }}</div>
                <div class="font-normal opacity-75 mt-0.5">{{ p.gPerKg }} g/kg</div>
              </button>
            </div>

            <!-- Slider -->
            <div class="relative">
              <input
                type="range"
                v-model.number="proteinMultiplier"
                min="1.2" max="2.4" step="0.1"
                class="w-full accent-indigo-500 cursor-pointer"
              />
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>1.2 g/kg</span>
                <span>1.7 g/kg</span>
                <span>2.2 g/kg</span>
                <span>2.4 g/kg</span>
              </div>
            </div>

            <p v-if="!profile.weightKg" class="text-xs text-gray-500 mt-2">
              Preenche o peso para ver o total em gramas.
            </p>
          </div>

          <div v-if="goalsError" class="mb-3 text-red-400 text-sm">{{ goalsError }}</div>
          <div v-if="goalsSuccess" class="mb-3 text-green-400 text-sm">{{ goalsSuccess }}</div>

          <button type="submit" :disabled="savingGoals"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
            {{ savingGoals ? 'A guardar...' : 'Guardar' }}
          </button>
        </form>
      </section>
    </div>

    <!-- Equipment -->
    <section class="bg-gray-800 rounded-xl p-6 mt-6">
      <h2 class="text-lg font-semibold text-white mb-1">Equipamento Disponível</h2>
      <p class="text-sm text-gray-400 mb-4">
        Indica o equipamento que tens disponível para treinar. A IA usa esta informação para personalizar as recomendações.
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <label v-for="item in EQUIPMENT_OPTIONS" :key="item" class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" :value="item" v-model="selectedEquipment" class="w-4 h-4 accent-indigo-500" />
          <span class="text-sm text-gray-300">{{ item }}</span>
        </label>
      </div>

      <div v-if="equipmentError" class="mb-3 text-red-400 text-sm">{{ equipmentError }}</div>
      <div v-if="equipmentSuccess" class="mb-3 text-green-400 text-sm">{{ equipmentSuccess }}</div>

      <button :disabled="savingEquipment" @click="handleSaveEquipment"
        class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
        {{ savingEquipment ? 'A guardar...' : 'Guardar equipamento' }}
      </button>
    </section>
  </div>
</template>
