import api from './axios'

export interface Exercise {
  id: string
  externalId?: string
  name: string
  muscleGroup: string
  equipment: string
  description?: string
}

export interface WorkoutPlanExercise {
  id: string
  exerciseId: string
  sets: number
  reps: number
  targetWeightKg?: number
  exercise: Exercise
}

export interface WorkoutEvaluation {
  general_assessment: string
  suggestions: string[]
  goal_adequacy: string
}

export type WorkoutPlanState = 'draft' | 'ready' | 'completed'

export interface WorkoutPlan {
  id: string
  userId: string
  name: string
  state: WorkoutPlanState
  evaluation: WorkoutEvaluation | null
  createdAt: string
  updatedAt: string
  exercises: WorkoutPlanExercise[]
}

export interface WorkoutLogExercise {
  exerciseId: string
  sets: number
  reps: number
  weightKg: number
  exercise: Exercise
}

export interface WorkoutLog {
  id: string
  userId: string
  executedAt: string
  exercises: WorkoutLogExercise[]
}

export interface CreatePlanBody {
  name: string
  exercises: Array<{ exerciseId: string; sets: number; reps: number; targetWeightKg?: number }>
}

export interface CreateLogBody {
  executedAt: string
  exercises: Array<{ exerciseId: string; sets: number; reps: number; weightKg: number }>
}

export function searchExercises(params: { name?: string; muscleGroup?: string; equipment?: string }) {
  return api.get<Exercise[]>('/api/v1/exercises/', { params })
}

export function getPlans() {
  return api.get<WorkoutPlan[]>('/api/v1/workouts/plans')
}

export function getPlan(id: string) {
  return api.get<WorkoutPlan>(`/api/v1/workouts/plans/${id}`)
}

export function createPlan(body: CreatePlanBody) {
  return api.post<WorkoutPlan>('/api/v1/workouts/plans', body)
}

export function updatePlan(id: string, body: { exercises: CreatePlanBody['exercises'] }) {
  return api.put<WorkoutPlan>(`/api/v1/workouts/plans/${id}`, body)
}

export function deletePlan(id: string) {
  return api.delete(`/api/v1/workouts/plans/${id}`)
}

export function evaluatePlan(id: string) {
  return api.post<{ message: string }>(`/api/v1/workouts/plans/${id}/evaluate`)
}

export function getLogs() {
  return api.get<WorkoutLog[]>('/api/v1/workouts/logs')
}

export function createLog(body: CreateLogBody) {
  return api.post<WorkoutLog>('/api/v1/workouts/logs', body)
}
