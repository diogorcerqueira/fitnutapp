const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const exerciseRoutes = require('./presentation/routes/exercise.routes');
const workoutPlanRoutes = require('./presentation/routes/workout-plan.routes');
const workoutLogRoutes = require('./presentation/routes/workout-log.routes');
const adminRoutes = require('./presentation/routes/admin.routes');

const app = express();
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Workout Service', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/presentation/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/exercises', exerciseRoutes);
app.use('/api/v1/workouts', workoutPlanRoutes);
app.use('/api/v1/workouts', workoutLogRoutes);
app.use('/api/v1/workouts', adminRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'workout-service' }));

module.exports = app;
