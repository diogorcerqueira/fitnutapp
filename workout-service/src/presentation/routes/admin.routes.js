const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/auth.middleware');
const { publishWorkoutCompleted } = require('../../infrastructure/messaging/event-publisher');

const router = Router();

router.post('/admin/simulate-workout', authenticate, async (req, res) => {
  try {
    const fakeLogId = uuidv4();
    const completedAt = new Date().toISOString();
    await publishWorkoutCompleted({
      userId: req.userId,
      workoutLogId: fakeLogId,
      completedAt,
      exercisesCount: req.body.exercisesCount ?? 5,
    });
    res.json({
      triggered: 'workout.completed',
      workout_log_id: fakeLogId,
      completed_at: completedAt,
      chain: ['ai-service → generate_recommendation', 'notification-service → email'],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
