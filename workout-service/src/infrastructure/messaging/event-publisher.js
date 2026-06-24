const { publish } = require('./rabbitmq.client');
const { v4: uuidv4 } = require('uuid');

async function publishWorkoutCompleted({ userId, workoutLogId, completedAt, exercisesCount }) {
  await publish('workout.completed', {
    event_id: uuidv4(),
    user_id: userId,
    workout_log_id: workoutLogId,
    completed_at: completedAt,
    exercises_count: exercisesCount,
  });
}

async function publishWorkoutPlanEvaluationRequested({ workoutPlanId, userId, planData }) {
  await publish('workout.plan.evaluation.requested', {
    event_id: uuidv4(),
    workout_plan_id: workoutPlanId,
    user_id: userId,
    plan_data: planData,
  });
}

module.exports = { publishWorkoutCompleted, publishWorkoutPlanEvaluationRequested };
