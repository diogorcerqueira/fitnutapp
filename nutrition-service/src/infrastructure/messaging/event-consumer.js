const { subscribe } = require('./rabbitmq.client');
const goalCacheRepo = require('../repositories/user-goal-cache.repository');

async function handleUserRegistered(payload) {
  const { user_id, email } = payload;
  await goalCacheRepo.upsertEmail(user_id, email);
}

async function handleGoalUpdated(payload) {
  const { user_id, email, daily_calories_kcal, daily_protein_g } = payload;
  await goalCacheRepo.upsert(user_id, {
    email,
    dailyCaloriesKcal: daily_calories_kcal,
    dailyProteinG: daily_protein_g,
  });
}

async function startConsumers() {
  await subscribe('user.registered', 'nutrition-service.user-registered', handleUserRegistered);
  await subscribe('goal.updated', 'nutrition-service.goal-updated', handleGoalUpdated);
  console.log('[Consumers] nutrition-service listening for user.registered, goal.updated');
}

module.exports = { startConsumers };
