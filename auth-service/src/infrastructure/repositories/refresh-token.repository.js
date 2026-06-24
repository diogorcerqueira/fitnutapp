const prisma = require('../database/prisma.client');

async function create({ userId, tokenHash, expiresAt }) {
  return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
}

async function findByTokenHash(tokenHash) {
  return prisma.refreshToken.findFirst({ where: { tokenHash } });
}

async function deleteByTokenHash(tokenHash) {
  return prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

async function deleteByUserId(userId) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}

module.exports = { create, findByTokenHash, deleteByTokenHash, deleteByUserId };
