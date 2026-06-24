const workoutPlanRepo = require('../../infrastructure/repositories/workout-plan.repository');
const { publishWorkoutPlanEvaluationRequested } = require('../../infrastructure/messaging/event-publisher');

async function requestPlanEvaluation(userId, planId) {
  const plan = await workoutPlanRepo.findById(planId);

  if (!plan) {
    const err = new Error('Plano não encontrado');
    err.status = 404;
    throw err;
  }

  if (plan.userId !== userId) {
    const err = new Error('Sem permissão');
    err.status = 403;
    throw err;
  }

  if (plan.state !== 'draft') {
    const err = new Error('Apenas planos em estado draft podem ser avaliados');
    err.status = 400;
    throw err;
  }

  const planData = {
    name: plan.name,
    exercises: plan.exercises.map(e => ({
      name: e.exercise.name,
      muscleGroup: e.exercise.muscleGroup,
      sets: e.sets,
      reps: e.reps,
      targetWeightKg: e.targetWeightKg,
    })),
  };

  await publishWorkoutPlanEvaluationRequested({ workoutPlanId: plan.id, userId, planData });

  return { message: 'Avaliação solicitada. Será notificado por email quando estiver pronta.' };
}

module.exports = requestPlanEvaluation;
