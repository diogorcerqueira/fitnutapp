const { subscribe } = require('./rabbitmq.client');
const prisma = require('../database/prisma.client');

async function startConsumers() {
  await subscribe(
    'workout.plan.evaluated',
    'workout-service.plan-evaluated',
    handlePlanEvaluated,
  );
  console.log('[Consumers] workout-service listening for workout.plan.evaluated');
}

async function handlePlanEvaluated(payload) {
  const { workout_plan_id, evaluation } = payload;

  await prisma.workoutPlan.update({
    where: { id: workout_plan_id },
    data: {
      state: 'ready',
      evaluation: {
        general_assessment: evaluation.general_assessment,
        suggestions: evaluation.suggestions,
        goal_adequacy: evaluation.goal_adequacy,
      },
    },
  });
}

module.exports = { startConsumers };
