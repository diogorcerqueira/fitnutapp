const { subscribe } = require('./rabbitmq.client');
const sendWelcomeEmail = require('../../application/use-cases/send-welcome-email');
const sendGoalReachedEmail = require('../../application/use-cases/send-goal-reached-email');
const sendRecommendationEmail = require('../../application/use-cases/send-recommendation-email');
const sendPlanEvaluatedEmail = require('../../application/use-cases/send-plan-evaluated-email');
const sendWeeklySummaryEmail = require('../../application/use-cases/send-weekly-summary-email');

async function startConsumers() {
  await subscribe('user.registered',           'notification-service.user-registered',    sendWelcomeEmail);
  await subscribe('goal.reached',              'notification-service.goal-reached',        sendGoalReachedEmail);
  await subscribe('recommendation.generated',  'notification-service.recommendation',      sendRecommendationEmail);
  await subscribe('workout.plan.evaluated',    'notification-service.plan-evaluated',      sendPlanEvaluatedEmail);
  await subscribe('weekly.summary.generated',  'notification-service.weekly-summary',      sendWeeklySummaryEmail);

  console.log('[Consumers] Notification Service listening on 5 queues');
}

module.exports = { startConsumers };
