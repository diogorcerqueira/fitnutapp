const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth.middleware');
const logWorkout = require('../../application/use-cases/log-workout');
const { getWorkoutHistory, getExerciseProgress } = require('../../application/use-cases/get-workout-history');

const router = Router();

/**
 * @swagger
 * /api/v1/workouts/logs:
 *   get:
 *     summary: Histórico de treinos realizados
 *     tags: [WorkoutLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sessões de treino
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   executedAt: { type: string, format: date-time }
 *                   planId: { type: string, format: uuid, nullable: true }
 *                   totalVolume: { type: number, description: "sets × reps × peso kg" }
 *                   exercises:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         exerciseId: { type: string }
 *                         sets: { type: integer }
 *                         reps: { type: integer }
 *                         weightKg: { type: number }
 *                         exercise:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             name: { type: string }
 *                             muscleGroup: { type: string }
 *                             equipment: { type: string }
 *       401:
 *         description: Não autenticado
 */
router.get('/logs', authenticate, async (req, res) => {
  const history = await getWorkoutHistory(req.userId);
  res.json(history);
});

/**
 * @swagger
 * /api/v1/workouts/logs/progress/{exerciseId}:
 *   get:
 *     summary: Evolução de carga num exercício
 *     tags: [WorkoutLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Série histórica de carga para o exercício
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   executedAt: { type: string, format: date-time }
 *                   sets: { type: integer }
 *                   reps: { type: integer }
 *                   weightKg: { type: number }
 *                   volume: { type: number }
 *       401:
 *         description: Não autenticado
 */
router.get('/logs/progress/:exerciseId', authenticate, async (req, res) => {
  const progress = await getExerciseProgress(req.userId, req.params.exerciseId);
  res.json(progress);
});

/**
 * @swagger
 * /api/v1/workouts/logs:
 *   post:
 *     summary: Registar treino realizado
 *     tags: [WorkoutLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [executedAt, exercises]
 *             properties:
 *               executedAt: { type: string, format: date-time, example: "2026-06-24T09:00:00.000Z" }
 *               planId: { type: string, format: uuid, description: "Opcional — plano de origem" }
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [exerciseId, sets, reps, weightKg]
 *                   properties:
 *                     exerciseId: { type: string, format: uuid }
 *                     sets: { type: integer, minimum: 1 }
 *                     reps: { type: integer, minimum: 1 }
 *                     weightKg: { type: number, minimum: 0 }
 *     responses:
 *       201:
 *         description: Treino registado
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Não autenticado
 */
router.post('/logs', authenticate,
  body('executedAt').isISO8601(),
  body('exercises').isArray({ min: 1 }),
  body('exercises.*.exerciseId').notEmpty(),
  body('exercises.*.sets').isInt({ min: 1 }),
  body('exercises.*.reps').isInt({ min: 1 }),
  body('exercises.*.weightKg').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const log = await logWorkout(req.userId, req.body);
      res.status(201).json(log);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

module.exports = router;
