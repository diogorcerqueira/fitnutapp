const { Router } = require('express');
const { body, query, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth.middleware');
const logMeal = require('../../application/use-cases/log-meal');
const getDailySummary = require('../../application/use-cases/get-daily-summary');
const mealEntryRepo = require('../../infrastructure/repositories/meal-entry.repository');

const router = Router();

/**
 * @swagger
 * /api/v1/nutrition/summary:
 *   get:
 *     summary: Resumo nutricional diário
 *     tags: [Nutrition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         example: "2026-06-24"
 *     responses:
 *       200:
 *         description: Totais nutricionais do dia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date: { type: string, format: date }
 *                 mealCount: { type: integer }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     calories: { type: number }
 *                     proteinG: { type: number }
 *                     carbsG: { type: number }
 *                     fatG: { type: number }
 *       400:
 *         description: Data inválida
 *       401:
 *         description: Não autenticado
 */
router.get('/summary', authenticate,
  query('date').isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const summary = await getDailySummary(req.userId, req.query.date);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/nutrition/meals:
 *   get:
 *     summary: Listar entradas alimentares
 *     tags: [Nutrition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Filtrar por data (omitir para todas)
 *     responses:
 *       200:
 *         description: Lista de entradas alimentares
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   mealType: { type: string, enum: [breakfast, lunch, snack, dinner] }
 *                   quantityG: { type: number }
 *                   loggedAt: { type: string, format: date-time }
 *                   food:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       calories: { type: number }
 *                       proteinG: { type: number }
 *                       carbsG: { type: number }
 *                       fatG: { type: number }
 *       401:
 *         description: Não autenticado
 */
router.get('/meals', authenticate,
  query('date').optional().isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const entries = req.query.date
      ? await mealEntryRepo.findByUserAndDate(req.userId, req.query.date)
      : await mealEntryRepo.findAllByUser(req.userId);
    res.json(entries);
  }
);

/**
 * @swagger
 * /api/v1/nutrition/meals:
 *   post:
 *     summary: Registar entrada alimentar
 *     tags: [Nutrition]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [foodId, mealType, quantityG, loggedAt]
 *             properties:
 *               foodId: { type: string, format: uuid }
 *               mealType: { type: string, enum: [breakfast, lunch, snack, dinner] }
 *               quantityG: { type: number, minimum: 1, example: 150 }
 *               loggedAt: { type: string, format: date-time, example: "2026-06-24T12:00:00.000Z" }
 *     responses:
 *       201:
 *         description: Entrada criada
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Não autenticado
 */
router.post('/meals', authenticate,
  body('foodId').notEmpty(),
  body('mealType').isIn(['breakfast', 'lunch', 'snack', 'dinner']),
  body('quantityG').isFloat({ min: 1 }),
  body('loggedAt').isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const entry = await logMeal(req.userId, req.body);
      res.status(201).json(entry);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/nutrition/meals/{id}:
 *   delete:
 *     summary: Eliminar entrada alimentar
 *     tags: [Nutrition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Eliminado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Entrada não encontrada
 */
router.delete('/meals/:id', authenticate, async (req, res) => {
  const entry = await mealEntryRepo.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entrada não encontrada' });
  if (entry.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });
  await mealEntryRepo.deleteById(req.params.id);
  res.status(204).send();
});

module.exports = router;
