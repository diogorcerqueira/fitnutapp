const prisma = require('../database/prisma.client');

async function findByUserId(userId) {
  return prisma.goals.findUnique({ where: { userId } });
}

async function upsert(userId, data) {
  return prisma.goals.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

module.exports = { findByUserId, upsert };
