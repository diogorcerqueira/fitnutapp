const workoutLogRepo = require('../../infrastructure/repositories/workout-log.repository');
const workoutPlanRepo = require('../../infrastructure/repositories/workout-plan.repository');
const { publishWorkoutCompleted } = require('../../infrastructure/messaging/event-publisher');

async function logWorkout(userId, { planId, executedAt, exercises }) {
  const log = await workoutLogRepo.create(userId, { planId, executedAt, exercises });

  if (planId) {
    await workoutPlanRepo.update(planId, { state: 'completed' });
  }

  await publishWorkoutCompleted({
    userId,
    workoutLogId: log.id,
    completedAt: log.executedAt.toISOString(),
    exercisesCount: log.exercises.length,
  });

  return log;
}

module.exports = logWorkout;
