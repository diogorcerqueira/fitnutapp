const prisma = require('../database/prisma.client');

async function findByUserId(userId) {
  return prisma.userGoalCache.findUnique({ where: { userId } });
}

async function upsert(userId, { email, dailyCaloriesKcal, dailyProteinG }) {
  return prisma.userGoalCache.upsert({
    where: { userId },
    update: { email, dailyCaloriesKcal, dailyProteinG },
    create: { userId, email, dailyCaloriesKcal, dailyProteinG },
  });
}

async function upsertEmail(userId, email) {
  return prisma.userGoalCache.upsert({
    where: { userId },
    update: { email },
    create: { userId, email },
  });
}

module.exports = { findByUserId, upsert, upsertEmail };
