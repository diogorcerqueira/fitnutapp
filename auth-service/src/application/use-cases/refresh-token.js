const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('../../domain/services/token.service');
const refreshTokenRepo = require('../../infrastructure/repositories/refresh-token.repository');

async function refreshAccessToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokenRepo.findByTokenHash(tokenHash);

  if (!stored || stored.expiresAt < new Date()) {
    const err = new Error('Refresh token inválido ou expirado');
    err.status = 401;
    throw err;
  }

  await refreshTokenRepo.deleteByTokenHash(tokenHash);

  const newAccessToken = generateAccessToken(stored.userId);
  const newRefreshToken = generateRefreshToken();
  await refreshTokenRepo.create({
    userId: stored.userId,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: refreshTokenExpiresAt(),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

module.exports = refreshAccessToken;
