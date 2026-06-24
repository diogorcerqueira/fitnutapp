const { Router } = require('express');
const authenticate = require('../middleware/auth.middleware');
const exerciseRepo = require('../../infrastructure/repositories/exercise.repository');
const searchExercises = require('../../application/use-cases/search-exercises');

const router = Router();

/**
 * @swagger
 * /api/v1/exercises:
 *   get:
 *     summary: Pesquisar catálogo de exercícios
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         example: "supino"
 *       - in: query
 *         name: muscleGroup
 *         schema: { type: string }
 *         example: "peito"
 *       - in: query
 *         name: equipment
 *         schema: { type: string }
 *         example: "barra"
 *     responses:
 *       200:
 *         description: Lista de exercícios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   muscleGroup: { type: string }
 *                   equipment: { type: string }
 *                   description: { type: string, nullable: true }
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { name, muscleGroup, equipment } = req.query;
    const exercises = await searchExercises({ name, muscleGroup, equipment });
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   get:
 *     summary: Obter exercício por ID
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Exercício
 *       404:
 *         description: Exercício não encontrado
 */
router.get('/:id', authenticate, async (req, res) => {
  const exercise = await exerciseRepo.findById(req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Exercício não encontrado' });
  res.json(exercise);
});

module.exports = router;
