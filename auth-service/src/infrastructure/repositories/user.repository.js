const prisma = require('../database/prisma.client');

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function findByGoogleId(googleId) {
  return prisma.user.findUnique({ where: { googleId } });
}

async function create({ name, email, passwordHash, googleId }) {
  return prisma.user.create({
    data: { name, email, passwordHash, googleId },
  });
}

async function linkGoogleId(id, googleId) {
  return prisma.user.update({ where: { id }, data: { googleId } });
}

module.exports = { findByEmail, findById, findByGoogleId, create, linkGoogleId };
