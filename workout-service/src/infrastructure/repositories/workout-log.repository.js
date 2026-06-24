const prisma = require('../database/prisma.client');

async function findAllByUser(userId) {
  return prisma.workoutLog.findMany({
    where: { userId },
    include: { exercises: { include: { exercise: true } } },
    orderBy: { executedAt: 'desc' },
  });
}

async function findById(id) {
  return prisma.workoutLog.findUnique({
    where: { id },
    include: { exercises: { include: { exercise: true } } },
  });
}

async function create(userId, { planId, executedAt, exercises }) {
  return prisma.workoutLog.create({
    data: {
      userId,
      planId,
      executedAt: new Date(executedAt),
      exercises: {
        create: exercises.map(e => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          weightKg: e.weightKg,
        })),
      },
    },
    include: { exercises: { include: { exercise: true } } },
  });
}

async function getProgressByExercise(userId, exerciseId) {
  return prisma.workoutLogExercise.findMany({
    where: {
      exerciseId,
      log: { userId },
    },
    include: { log: { select: { executedAt: true } } },
    orderBy: { log: { executedAt: 'asc' } },
  });
}

module.exports = { findAllByUser, findById, create, getProgressByExercise };
