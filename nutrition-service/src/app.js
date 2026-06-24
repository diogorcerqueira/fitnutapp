const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const foodRoutes = require('./presentation/routes/food.routes');
const mealRoutes = require('./presentation/routes/meal.routes');

const app = express();
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Nutrition Service', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/presentation/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/foods', foodRoutes);
app.use('/api/v1/nutrition', mealRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'nutrition-service' }));

module.exports = app;
