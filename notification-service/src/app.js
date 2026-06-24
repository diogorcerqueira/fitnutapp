const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service',
      version: '1.0.0',
      description: `Serviço de notificações — sem endpoints HTTP próprios (excepto /health).
Consome eventos RabbitMQ do exchange \`fitness.events\` (topic) e envia emails via SMTP (Mailpit em dev).

## Eventos consumidos

| Routing Key | Descrição | Email enviado |
|---|---|---|
| \`user.registered\` | Novo utilizador registado | Boas-vindas com nome e email |
| \`recommendation.generated\` | IA gerou recomendação personalizada | Recomendação + área de foco |
| \`workout.completed\` | Utilizador registou treino | Confirmação com nº de exercícios e volume total |
| \`weekly.summary.generated\` | Resumo semanal calculado | Estatísticas da semana (treinos, calorias, proteína) |

## Infraestrutura

- **Exchange:** \`fitness.events\` (topic)
- **SMTP:** porta 1025 (Mailpit — UI em :8025 em dev)
- **Filas:** declaradas e ligadas no arranque do serviço`,
    },
  },
  apis: [],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'notification-service' }));

module.exports = app;
