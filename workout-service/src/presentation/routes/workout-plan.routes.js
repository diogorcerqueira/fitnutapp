const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth.middleware');
const workoutPlanRepo = require('../../infrastructure/repositories/workout-plan.repository');
const requestPlanEvaluation = require('../../application/use-cases/request-plan-evaluation');

const router = Router();

/**
 * @swagger
 * /api/v1/workouts/plans:
 *   get:
 *     summary: Listar planos de treino do utilizador
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de planos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   state: { type: string, enum: [draft, active, archived] }
 *                   exercises: { type: array }
 *                   evaluation: { type: object, nullable: true }
 *       401:
 *         description: Não autenticado
 */
router.get('/plans', authenticate, async (req, res) => {
  const plans = await workoutPlanRepo.findAllByUser(req.userId);
  res.json(plans);
});

/**
 * @swagger
 * /api/v1/workouts/plans/{id}:
 *   get:
 *     summary: Obter plano por ID
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Plano detalhado
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Plano não encontrado
 */
router.get('/plans/:id', authenticate, async (req, res) => {
  const plan = await workoutPlanRepo.findById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
  if (plan.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });
  res.json(plan);
});

/**
 * @swagger
 * /api/v1/workouts/plans:
 *   post:
 *     summary: Criar plano de treino
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, exercises]
 *             properties:
 *               name: { type: string, example: "Push Day" }
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [exerciseId, sets, reps]
 *                   properties:
 *                     exerciseId: { type: string, format: uuid }
 *                     sets: { type: integer, minimum: 1 }
 *                     reps: { type: integer, minimum: 1 }
 *                     targetWeightKg: { type: number, minimum: 0 }
 *     responses:
 *       201:
 *         description: Plano criado
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Não autenticado
 */
router.post('/plans', authenticate,
  body('name').notEmpty().trim(),
  body('exercises').isArray({ min: 1 }),
  body('exercises.*.exerciseId').notEmpty(),
  body('exercises.*.sets').isInt({ min: 1 }),
  body('exercises.*.reps').isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const plan = await workoutPlanRepo.create(req.userId, req.body);
      res.status(201).json(plan);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/workouts/plans/{id}:
 *   put:
 *     summary: Actualizar exercícios do plano (reset para draft)
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exercises]
 *             properties:
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [exerciseId, sets, reps]
 *                   properties:
 *                     exerciseId: { type: string, format: uuid }
 *                     sets: { type: integer, minimum: 1 }
 *                     reps: { type: integer, minimum: 1 }
 *                     targetWeightKg: { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Plano actualizado (estado reposto para draft)
 *       400:
 *         description: Validação falhou
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Plano não encontrado
 */
router.put('/plans/:id', authenticate,
  body('exercises').isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const existing = await workoutPlanRepo.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Plano não encontrado' });
    if (existing.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });
    try {
      const plan = await workoutPlanRepo.updateExercises(req.params.id, req.body.exercises);
      res.json(plan);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/workouts/plans/{id}/evaluate:
 *   post:
 *     summary: Solicitar avaliação do plano por IA (assíncrono via RabbitMQ)
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       202:
 *         description: Pedido aceite — avaliação processada em background; resultado guardado no plano
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Plano não encontrado
 */
router.post('/plans/:id/evaluate', authenticate, async (req, res) => {
  try {
    const result = await requestPlanEvaluation(req.userId, req.params.id);
    res.status(202).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/v1/workouts/plans/{id}:
 *   delete:
 *     summary: Eliminar plano de treino
 *     tags: [WorkoutPlans]
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
 *         description: Plano não encontrado
 */
router.delete('/plans/:id', authenticate, async (req, res) => {
  const existing = await workoutPlanRepo.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plano não encontrado' });
  if (existing.userId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });
  await workoutPlanRepo.deleteById(req.params.id);
  res.status(204).send();
});

module.exports = router;
