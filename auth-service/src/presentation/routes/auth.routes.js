const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const registerUser = require('../../application/use-cases/register-user');
const loginUser = require('../../application/use-cases/login-user');
const logoutUser = require('../../application/use-cases/logout-user');
const refreshAccessToken = require('../../application/use-cases/refresh-token');
const { generateAccessToken, generateRefreshToken, hashToken, refreshTokenExpiresAt } = require('../../domain/services/token.service');
const refreshTokenRepo = require('../../infrastructure/repositories/refresh-token.repository');
const { publishUserRegistered } = require('../../infrastructure/messaging/event-publisher');
const userRepo = require('../../infrastructure/repositories/user.repository');

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registar novo utilizador
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "João Silva" }
 *               email: { type: string, format: email, example: "joao@email.com" }
 *               password: { type: string, minLength: 8, example: "password123" }
 *     responses:
 *       201:
 *         description: Utilizador criado — retorna tokens e id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 userId: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *       400:
 *         description: Validação falhou
 *       409:
 *         description: Email já registado
 */
router.post('/register',
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const result = await registerUser(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login com email e password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "joao@email.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login bem sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 userId: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const result = await loginUser(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout — invalida refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204:
 *         description: Logout efectuado
 *       400:
 *         description: Token em falta
 */
router.post('/logout',
  body('refreshToken').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      await logoutUser(req.body.refreshToken);
      res.status(204).send();
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Emite novo access token via refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Novo access token emitido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400:
 *         description: Token em falta
 *       401:
 *         description: Refresh token inválido ou expirado
 */
router.post('/refresh',
  body('refreshToken').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const result = await refreshAccessToken(req.body.refreshToken);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Iniciar autenticação Google OAuth 2.0
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redireciona para Google
 *       501:
 *         description: Google OAuth não configurado
 */
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ error: 'Google OAuth não configurado' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Callback Google OAuth — redireciona para frontend com tokens
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redireciona para /oauth-callback?accessToken=...&refreshToken=...
 *       501:
 *         description: Google OAuth não configurado
 */
router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ error: 'Google OAuth não configurado' });
    }
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: '/login-failed' }),
  async (req, res) => {
    const user = req.user;
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    await refreshTokenRepo.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt(),
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      userId: user.id,
      name: user.name,
      email: user.email,
    });
    res.redirect(`${frontendUrl}/oauth-callback?${params.toString()}`);
  }
);

module.exports = router;
