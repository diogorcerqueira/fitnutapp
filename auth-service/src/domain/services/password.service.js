const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function hash(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function compare(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hash, compare };
