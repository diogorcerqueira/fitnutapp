const goalRepo = require('../../infrastructure/repositories/goal.repository');
const userRepo = require('../../infrastructure/repositories/user.repository');
const { publishGoalUpdated } = require('../../infrastructure/messaging/event-publisher');

async function updateGoals(userId, { targetWeightKg, dailyCaloriesKcal, dailyProteinG }) {
  const [goals, user] = await Promise.all([
    goalRepo.upsert(userId, { targetWeightKg, dailyCaloriesKcal, dailyProteinG }),
    userRepo.findById(userId),
  ]);

  await publishGoalUpdated({
    userId,
    email: user.email,
    dailyCaloriesKcal: goals.dailyCaloriesKcal,
    dailyProteinG: goals.dailyProteinG,
  });

  return goals;
}

module.exports = updateGoals;
