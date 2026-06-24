const userRepo = require('../../infrastructure/repositories/user.repository');
const { hash } = require('../../domain/services/password.service');
const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('../../domain/services/token.service');
const refreshTokenRepo = require('../../infrastructure/repositories/refresh-token.repository');
const { publishUserRegistered } = require('../../infrastructure/messaging/event-publisher');

async function registerUser({ name, email, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const err = new Error('Email já registado');
    err.status = 409;
    throw err;
  }

  const passwordHash = await hash(password);
  const user = await userRepo.create({ name, email, passwordHash });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  await refreshTokenRepo.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiresAt(),
  });

  await publishUserRegistered({ userId: user.id, email: user.email, name: user.name });

  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } };
}

module.exports = registerUser;
