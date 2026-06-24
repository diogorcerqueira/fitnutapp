import api from './axios'

export function triggerRecommendation() {
  return api.post('/api/v1/ai/admin/recommend')
}

export function triggerWeeklySummary() {
  return api.post('/api/v1/ai/admin/weekly-summary')
}

export function triggerSimulateWorkout(exercisesCount = 5) {
  return api.post('/api/v1/workouts/admin/simulate-workout', { exercisesCount })
}
