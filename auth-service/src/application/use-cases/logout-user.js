const { hashToken } = require('../../domain/services/token.service');
const refreshTokenRepo = require('../../infrastructure/repositories/refresh-token.repository');

async function logoutUser(refreshToken) {
  await refreshTokenRepo.deleteByTokenHash(hashToken(refreshToken));
}

module.exports = logoutUser;
