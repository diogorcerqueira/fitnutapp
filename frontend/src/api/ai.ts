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

export function getRecommendations(userId: string) {
  return api.get<RecommendationsResponse>(`/api/v1/ai/recommendations/${userId}`)
}
