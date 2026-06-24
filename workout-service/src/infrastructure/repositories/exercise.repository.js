const prisma = require('../database/prisma.client');

async function findAll({ name, muscleGroup, equipment } = {}) {
  return prisma.exercise.findMany({
    where: {
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(muscleGroup && { muscleGroup: { contains: muscleGroup, mode: 'insensitive' } }),
      ...(equipment && { equipment: { contains: equipment, mode: 'insensitive' } }),
    },
    orderBy: { name: 'asc' },
  });
}

async function findById(id) {
  return prisma.exercise.findUnique({ where: { id } });
}

async function upsertMany(exercises) {
  return Promise.all(
    exercises.map(ex =>
      prisma.exercise.upsert({
        where: { externalId: ex.externalId },
        update: { name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment, description: ex.description },
        create: ex,
      })
    )
  );
}

module.exports = { findAll, findById, upsertMany };
