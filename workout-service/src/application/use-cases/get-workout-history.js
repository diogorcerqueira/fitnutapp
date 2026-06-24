const workoutLogRepo = require('../../infrastructure/repositories/workout-log.repository');

async function getWorkoutHistory(userId) {
  const logs = await workoutLogRepo.findAllByUser(userId);

  return logs.map(log => ({
    id: log.id,
    executedAt: log.executedAt,
    planId: log.planId,
    totalVolume: log.exercises.reduce((sum, e) => sum + e.sets * e.reps * e.weightKg, 0),
    exercises: log.exercises.map(e => ({
      exerciseId: e.exerciseId,
      sets: e.sets,
      reps: e.reps,
      weightKg: e.weightKg,
      exercise: {
        id: e.exercise.id,
        name: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
        equipment: e.exercise.equipment,
      },
    })),
  }));
}

async function getExerciseProgress(userId, exerciseId) {
  const entries = await workoutLogRepo.getProgressByExercise(userId, exerciseId);
  return entries.map(e => ({
    executedAt: e.log.executedAt,
    sets: e.sets,
    reps: e.reps,
    weightKg: e.weightKg,
    volume: e.sets * e.reps * e.weightKg,
  }));
}

module.exports = { getWorkoutHistory, getExerciseProgress };
