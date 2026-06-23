import api from './axios'

export interface Food {
  id: string
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  source?: string
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface MealEntry {
  id: string
  userId: string
  foodId: string
  mealType: MealType
  quantityG: number
  loggedAt: string
  food: Food
}

export interface NutritionSummary {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export function getNutritionSummary(date: string) {
  return api.get<NutritionSummary>('/api/v1/nutrition/summary', { params: { date } })
}

export function getMeals() {
  return api.get<MealEntry[]>('/api/v1/nutrition/meals')
}

export function addMeal(body: {
  foodId: string
  mealType: MealType
  quantityG: number
  loggedAt: string
}) {
  return api.post<MealEntry>('/api/v1/nutrition/meals', body)
}

export function deleteMeal(id: string) {
  return api.delete(`/api/v1/nutrition/meals/${id}`)
}

export function searchFoods(q: string) {
  return api.get<Food[]>('/api/v1/foods/search', { params: { q } })
}

export function createFood(body: {
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}) {
  return api.post<Food>('/api/v1/foods/manual', body)
}
