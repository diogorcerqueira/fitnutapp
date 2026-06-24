const prisma = require('../database/prisma.client');

async function findAllByUser(userId) {
  return prisma.workoutPlan.findMany({
    where: { userId },
    include: { exercises: { include: { exercise: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function findById(id) {
  return prisma.workoutPlan.findUnique({
    where: { id },
    include: { exercises: { include: { exercise: true } } },
  });
}

async function create(userId, { name, exercises }) {
  return prisma.workoutPlan.create({
    data: {
      userId,
      name,
      exercises: {
        create: exercises.map(e => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          targetWeightKg: e.targetWeightKg,
        })),
      },
    },
    include: { exercises: { include: { exercise: true } } },
  });
}

async function update(id, data) {
  return prisma.workoutPlan.update({
    where: { id },
    data,
    include: { exercises: { include: { exercise: true } } },
  });
}

async function updateExercises(id, exercises) {
  return prisma.$transaction([
    prisma.workoutPlanExercise.deleteMany({ where: { planId: id } }),
    prisma.workoutPlan.update({
      where: { id },
      data: {
        state: 'draft',
        evaluation: null,
        exercises: {
          create: exercises.map(e => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            targetWeightKg: e.targetWeightKg,
          })),
        },
      },
      include: { exercises: { include: { exercise: true } } },
    }),
  ]).then(([, plan]) => plan);
}

async function deleteById(id) {
  return prisma.workoutPlan.delete({ where: { id } });
}

module.exports = { findAllByUser, findById, create, update, updateExercises, deleteById };
