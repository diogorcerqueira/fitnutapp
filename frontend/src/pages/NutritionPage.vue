<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  getNutritionSummary,
  getMeals,
  addMeal,
  deleteMeal,
  searchFoods,
  type NutritionSummary,
  type MealEntry,
  type MealType,
  type Food
} from '../api/nutrition'
import MacroCard from '../components/MacroCard.vue'

const MEAL_SECTIONS: Array<{ type: MealType; label: string }> = [
  { type: 'breakfast', label: 'Pequeno-almoço' },
  { type: 'lunch', label: 'Almoço' },
  { type: 'snack', label: 'Lanche' },
  { type: 'dinner', label: 'Jantar' }
]

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const summary = ref<NutritionSummary | null>(null)
const allMeals = ref<MealEntry[]>([])
const loadingData = ref(true)
const dataError = ref('')

const addingForMeal = ref<MealType | null>(null)
const foodQuery = ref('')
const foodResults = ref<Food[]>([])
const selectedFood = ref<Food | null>(null)
const quantityG = ref(100)
const addingMeal = ref(false)
const addError = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | undefined

const mealsForDate = computed(() => {
  return allMeals.value.filter((m) => m.loggedAt.slice(0, 10) === selectedDate.value)
})

function mealsOfType(type: MealType) {
  return mealsForDate.value.filter((m) => m.mealType === type)
}

async function loadData() {
  loadingData.value = true
  dataError.value = ''
  try {
    const [summaryRes, mealsRes] = await Promise.all([
      getNutritionSummary(selectedDate.value),
      getMeals()
    ])
    summary.value = summaryRes.data
    allMeals.value = mealsRes.data
  } catch {
    dataError.value = 'Erro ao carregar dados nutricionais.'
  } finally {
    loadingData.value = false
  }
}

watch(selectedDate, loadData)
onMounted(loadData)

function openAddFood(mealType: MealType) {
  addingForMeal.value = mealType
  foodQuery.value = ''
  foodResults.value = []
  selectedFood.value = null
  quantityG.value = 100
  addError.value = ''
}

function cancelAdd() {
  addingForMeal.value = null
}

function onFoodQueryInput() {
  clearTimeout(debounceTimer)
  selectedFood.value = null
  if (!foodQuery.value.trim()) {
    foodResults.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      const res = await searchFoods(foodQuery.value)
      foodResults.value = res.data
    } catch {
      // silent — user sees empty list
    }
  }, 300)
}

function pickFood(food: Food) {
  selectedFood.value = food
  foodQuery.value = food.name
  foodResults.value = []
}

async function handleAddMeal() {
  if (!selectedFood.value || !addingForMeal.value) return
  addError.value = ''
  addingMeal.value = true
  try {
    const res = await addMeal({
      foodId: selectedFood.value.id,
      mealType: addingForMeal.value,
      quantityG: quantityG.value,
      loggedAt: `${selectedDate.value}T12:00:00.000Z`
    })
    allMeals.value.push(res.data)
    const summaryRes = await getNutritionSummary(selectedDate.value)
    summary.value = summaryRes.data
    addingForMeal.value = null
  } catch {
    addError.value = 'Erro ao adicionar alimento.'
  } finally {
    addingMeal.value = false
  }
}

async function handleDeleteMeal(id: string) {
  try {
    await deleteMeal(id)
    allMeals.value = allMeals.value.filter((m) => m.id !== id)
    const summaryRes = await getNutritionSummary(selectedDate.value)
    summary.value = summaryRes.data
  } catch {
    alert('Erro ao remover alimento.')
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Nutrição</h1>

    <div class="mb-6 flex items-center gap-4">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Data</label>
        <input
          v-model="selectedDate"
          type="date"
          class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
        />
      </div>
    </div>

    <div v-if="loadingData" class="text-gray-400 mb-6">A carregar...</div>
    <div v-else-if="dataError" class="text-red-400 mb-6">{{ dataError }}</div>

    <template v-else>
      <section class="mb-8">
        <h2 class="text-lg font-semibold text-gray-300 mb-3">Totais do dia</h2>
        <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MacroCard label="Calorias" :value="summary.calories" unit="kcal" />
          <MacroCard label="Proteína" :value="summary.proteinG" unit="g" />
          <MacroCard label="Hidratos" :value="summary.carbsG" unit="g" />
          <MacroCard label="Gordura" :value="summary.fatG" unit="g" />
        </div>
      </section>

      <section>
        <div v-for="section in MEAL_SECTIONS" :key="section.type" class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-gray-300">{{ section.label }}</h2>
            <button
              class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              @click="openAddFood(section.type)"
            >
              + Adicionar
            </button>
          </div>

          <div class="bg-gray-800 rounded-xl overflow-hidden">
            <div v-if="mealsOfType(section.type).length === 0" class="p-4 text-sm text-gray-500">
              Sem entradas para esta refeição.
            </div>
            <div
              v-for="entry in mealsOfType(section.type)"
              :key="entry.id"
              class="flex items-center justify-between px-4 py-3 border-b border-gray-700 last:border-0"
            >
              <div>
                <p class="text-white text-sm font-medium">{{ entry.food.name }}</p>
                <p class="text-xs text-gray-400">{{ entry.quantityG }}g &bull; {{ Math.round(entry.food.calories * entry.quantityG / 100) }} kcal</p>
              </div>
              <button
                class="text-xs text-red-400 hover:text-red-300 transition-colors ml-4"
                @click="handleDeleteMeal(entry.id)"
              >
                Remover
              </button>
            </div>
          </div>

          <div v-if="addingForMeal === section.type" class="mt-3 bg-gray-800 rounded-xl p-4">
            <p class="text-sm font-medium text-gray-300 mb-3">Adicionar alimento — {{ section.label }}</p>
            <div class="relative mb-3">
              <input
                v-model="foodQuery"
                type="text"
                placeholder="Pesquisar alimento..."
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                @input="onFoodQueryInput"
              />
              <ul v-if="foodResults.length > 0" class="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                <li
                  v-for="food in foodResults"
                  :key="food.id"
                  class="px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer"
                  @click="pickFood(food)"
                >
                  <span class="font-medium">{{ food.name }}</span>
                  <span class="text-gray-400 ml-2 text-xs">{{ food.calories }} kcal/100g</span>
                </li>
              </ul>
            </div>

            <div v-if="selectedFood" class="mb-3">
              <label class="block text-xs text-gray-400 mb-1">Quantidade (g)</label>
              <input
                v-model.number="quantityG"
                type="number"
                min="1"
                class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm w-32"
              />
            </div>

            <div v-if="addError" class="mb-2 text-red-400 text-sm">{{ addError }}</div>

            <div class="flex gap-2">
              <button
                v-if="selectedFood"
                :disabled="addingMeal"
                class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                @click="handleAddMeal"
              >
                {{ addingMeal ? 'A adicionar...' : 'Confirmar' }}
              </button>
              <button
                class="text-sm text-gray-400 hover:text-white px-4 py-1.5 transition-colors"
                @click="cancelAdd"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
