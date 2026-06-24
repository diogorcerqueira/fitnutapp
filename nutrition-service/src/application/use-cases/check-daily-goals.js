const goalCacheRepo = require('../../infrastructure/repositories/user-goal-cache.repository');
const { publishGoalReached } = require('../../infrastructure/messaging/event-publisher');
const getDailySummary = require('./get-daily-summary');
const prisma = require('../../infrastructure/database/prisma.client');

async function wasGoalAlreadyNotifiedToday(userId, goalType, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const count = await prisma.goalNotification.count({
    where: { userId, goalType, notifiedAt: { gte: start, lte: end } },
  });
  return count > 0;
}

async function recordGoalNotification(userId, goalType) {
  await prisma.goalNotification.create({ data: { userId, goalType } });
}

async function checkDailyGoals(userId, date) {
  const cached = await goalCacheRepo.findByUserId(userId);
  if (!cached) return;

  const summary = await getDailySummary(userId, date);
  const { calories, proteinG } = summary.totals;

  if (cached.dailyCaloriesKcal && calories >= cached.dailyCaloriesKcal) {
    const alreadyNotified = await wasGoalAlreadyNotifiedToday(userId, 'daily_calories', date);
    if (!alreadyNotified) {
      await publishGoalReached({ userId, email: cached.email, goalType: 'daily_calories', value: calories });
      await recordGoalNotification(userId, 'daily_calories');
    }
  }

  if (cached.dailyProteinG && proteinG >= cached.dailyProteinG) {
    const alreadyNotified = await wasGoalAlreadyNotifiedToday(userId, 'daily_protein', date);
    if (!alreadyNotified) {
      await publishGoalReached({ userId, email: cached.email, goalType: 'daily_protein', value: proteinG });
      await recordGoalNotification(userId, 'daily_protein');
    }
  }
}

module.exports = checkDailyGoals;
