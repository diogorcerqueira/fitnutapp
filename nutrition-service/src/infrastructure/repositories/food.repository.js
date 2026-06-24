const prisma = require('../database/prisma.client');

async function findByExternalId(externalId) {
  return prisma.food.findUnique({ where: { externalId } });
}

async function searchLocal(name) {
  return prisma.food.findMany({
    where: { name: { contains: name, mode: 'insensitive' } },
    take: 10,
  });
}

async function upsertFromApi(data) {
  return prisma.food.upsert({
    where: { externalId: data.externalId },
    update: { ...data, cachedAt: new Date() },
    create: { ...data, source: 'open_food_facts', cachedAt: new Date() },
  });
}

async function createManual({ name, calories, proteinG, carbsG, fatG }) {
  return prisma.food.create({
    data: { name, calories, proteinG, carbsG, fatG, source: 'manual' },
  });
}

async function findById(id) {
  return prisma.food.findUnique({ where: { id } });
}

module.exports = { findByExternalId, searchLocal, upsertFromApi, createManual, findById };
