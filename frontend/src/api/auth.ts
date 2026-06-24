import api from './axios'

export interface UserProfile {
  weightKg: number | null
  heightCm: number | null
  age: number | null
  goal: 'lose_weight' | 'maintain_weight' | 'gain_muscle' | null
  gender: 'male' | 'female' | null
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
}

export interface UserGoals {
  targetWeightKg: number | null
  dailyCaloriesKcal: number | null
  dailyProteinG: number | null
}

export function getProfile() {
  return api.get<UserProfile>('/api/v1/users/me/profile')
}

export function updateProfile(data: Partial<UserProfile>) {
  return api.put<UserProfile>('/api/v1/users/me/profile', data)
}

export function getGoals() {
  return api.get<UserGoals>('/api/v1/users/me/goals')
}

export function updateGoals(data: Partial<UserGoals>) {
  return api.put<UserGoals>('/api/v1/users/me/goals', data)
}
