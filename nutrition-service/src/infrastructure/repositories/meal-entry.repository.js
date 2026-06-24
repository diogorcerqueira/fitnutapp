const prisma = require('../database/prisma.client');

async function create({ userId, foodId, mealType, quantityG, loggedAt }) {
  return prisma.mealEntry.create({
    data: { userId, foodId, mealType, quantityG, loggedAt: new Date(loggedAt) },
    include: { food: true },
  });
}

async function findByUserAndDate(userId, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return prisma.mealEntry.findMany({
    where: {
      userId,
      loggedAt: { gte: start, lte: end },
    },
    include: { food: true },
    orderBy: { loggedAt: 'asc' },
  });
}

async function findAllByUser(userId) {
  return prisma.mealEntry.findMany({
    where: { userId },
    include: { food: true },
    orderBy: { loggedAt: 'desc' },
  });
}

async function deleteById(id) {
  return prisma.mealEntry.delete({ where: { id } });
}

async function findById(id) {
  return prisma.mealEntry.findUnique({ where: { id }, include: { food: true } });
}

module.exports = { create, findByUserAndDate, findAllByUser, deleteById, findById };
