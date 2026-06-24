import api from './axios'

export type FocusArea = 'nutrition' | 'workout' | 'recovery'

export interface Recommendation {
  id: string
  recommendation: string
  focus_area: FocusArea
  created_at: string
}

export interface RecommendationsResponse {
  user_id: string
  recommendations: Recommendation[]
}

export interface AiPreferences {
  available_equipment: string | null
}

export function getRecommendations(userId: string) {
  return api.get<RecommendationsResponse>(`/api/v1/ai/recommendations/${userId}`)
}

export function getAiPreferences() {
  return api.get<AiPreferences>('/api/v1/ai/preferences')
}

export function updateAiPreferences(data: AiPreferences) {
  return api.put<AiPreferences>('/api/v1/ai/preferences', data)
}
