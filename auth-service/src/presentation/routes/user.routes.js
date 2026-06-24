const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth.middleware');
const updateProfile = require('../../application/use-cases/update-profile');
const updateGoals = require('../../application/use-cases/update-goals');
const profileRepo = require('../../infrastructure/repositories/profile.repository');
const goalRepo = require('../../infrastructure/repositories/goal.repository');
const userRepo = require('../../infrastructure/repositories/user.repository');

const router = Router();

/**
 * @swagger
 * /api/v1/users/me/profile:
 *   get:
 *     summary: Obter perfil do utilizador autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil físico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weightKg: { type: number, example: 75.5 }
 *                 heightCm: { type: number, example: 175 }
 *                 age: { type: integer, example: 28 }
 *                 goal: { type: string, enum: [lose_weight, maintain_weight, gain_muscle] }
 *                 gender: { type: string, enum: [male, female] }
 *                 activityLevel: { type: string, enum: [sedentary, light, moderate, active, very_active] }
 *       401:
 *         description: Não autenticado
 */
router.get('/me/profile', authenticate, async (req, res) => {
  const profile = await profileRepo.findByUserId(req.userId);
  res.json(profile || {});
});

/**
 * @swagger
 * /api/v1/users/me/profile:
 *   put:
 *     summary: Actualizar perfil físico
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weightKg: { type: number, minimum: 1, maximum: 500, example: 75.5 }
 *               heightCm: { type: number, minimum: 50, maximum: 300, example: 175 }
 *               age: { type: integer, minimum: 1, maximum: 150, example: 28 }
 *               goal: { type: string, enum: [lose_weight, maintain_weight, gain_muscle] }
 *               gender: { type: string, enum: [male, female] }
 *               activityLevel: { type: string, enum: [sedentary, light, moderate, active, very_active] }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Não autenticado
 */
router.put('/me/profile', authenticate,
  body('weightKg').optional().isFloat({ min: 1, max: 500 }),
  body('heightCm').optional().isFloat({ min: 50, max: 300 }),
  body('age').optional().isInt({ min: 1, max: 150 }),
  body('goal').optional().isIn(['lose_weight', 'maintain_weight', 'gain_muscle']),
  body('gender').optional().isIn(['male', 'female']),
  body('activityLevel').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const profile = await updateProfile(req.userId, req.body);
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/me/goals:
 *   get:
 *     summary: Obter objetivos do utilizador autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Objetivos actuais
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 targetWeightKg: { type: number, example: 70 }
 *                 dailyCaloriesKcal: { type: integer, example: 2200 }
 *                 dailyProteinG: { type: integer, example: 150 }
 *       401:
 *         description: Não autenticado
 */
router.get('/me/goals', authenticate, async (req, res) => {
  const goals = await goalRepo.findByUserId(req.userId);
  res.json(goals || {});
});

/**
 * @swagger
 * /api/v1/users/me/goals:
 *   put:
 *     summary: Definir ou actualizar objetivos
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetWeightKg: { type: number, minimum: 1, example: 70 }
 *               dailyCaloriesKcal: { type: integer, minimum: 1, example: 2200 }
 *               dailyProteinG: { type: integer, minimum: 1, example: 150 }
 *     responses:
 *       200:
 *         description: Objetivos actualizados
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Não autenticado
 */
router.put('/me/goals', authenticate,
  body('targetWeightKg').optional().isFloat({ min: 1 }),
  body('dailyCaloriesKcal').optional().isInt({ min: 1 }),
  body('dailyProteinG').optional().isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const goals = await updateGoals(req.userId, req.body);
      res.json(goals);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: "[Interno] Resolver dados de utilizador por ID"
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dados básicos do utilizador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string }
 *       404:
 *         description: Utilizador não encontrado
 */
// Internal endpoint — used by other services to resolve user email
router.get('/:id', authenticate, async (req, res) => {
  const user = await userRepo.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = router;
