const userRepo = require('../../infrastructure/repositories/user.repository');
const { compare } = require('../../domain/services/password.service');
const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('../../domain/services/token.service');
const refreshTokenRepo = require('../../infrastructure/repositories/refresh-token.repository');

async function loginUser({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.passwordHash) {
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  await refreshTokenRepo.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiresAt(),
  });

  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } };
}

module.exports = loginUser;
