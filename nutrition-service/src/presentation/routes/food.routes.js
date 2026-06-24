const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth.middleware');
const searchFood = require('../../application/use-cases/search-food');
const foodRepo = require('../../infrastructure/repositories/food.repository');

const router = Router();

/**
 * @swagger
 * /api/v1/foods/search:
 *   get:
 *     summary: Pesquisar alimentos (cache local + Open Food Facts)
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         example: "frango"
 *     responses:
 *       200:
 *         description: Lista de alimentos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   calories: { type: number, description: "kcal por 100g" }
 *                   proteinG: { type: number }
 *                   carbsG: { type: number }
 *                   fatG: { type: number }
 *       400:
 *         description: Parâmetro q obrigatório
 *       401:
 *         description: Não autenticado
 */
router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Parâmetro q obrigatório' });
  try {
    const foods = await searchFood(q);
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/v1/foods/manual:
 *   post:
 *     summary: Adicionar alimento manualmente (fallback quando não encontrado)
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, calories, proteinG, carbsG, fatG]
 *             properties:
 *               name: { type: string, example: "Atum em conserva" }
 *               calories: { type: number, minimum: 0, example: 116 }
 *               proteinG: { type: number, minimum: 0, example: 26 }
 *               carbsG: { type: number, minimum: 0, example: 0 }
 *               fatG: { type: number, minimum: 0, example: 1 }
 *     responses:
 *       201:
 *         description: Alimento criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 name: { type: string }
 *                 calories: { type: number }
 *                 proteinG: { type: number }
 *                 carbsG: { type: number }
 *                 fatG: { type: number }
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Não autenticado
 */
router.post('/manual', authenticate,
  body('name').notEmpty().trim(),
  body('calories').isFloat({ min: 0 }),
  body('proteinG').isFloat({ min: 0 }),
  body('carbsG').isFloat({ min: 0 }),
  body('fatG').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const food = await foodRepo.createManual(req.body);
      res.status(201).json(food);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
