const prisma = require('../database/prisma.client');

async function findByUserId(userId) {
  return prisma.profile.findUnique({ where: { userId } });
}

async function upsert(userId, data) {
  return prisma.profile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

module.exports = { findByUserId, upsert };
