const app = require('./app');
const { connect: connectRabbitMQ } = require('./infrastructure/messaging/rabbitmq.client');
const { startConsumers } = require('./infrastructure/messaging/event-consumer');

const PORT = process.env.PORT || 3005;

async function start() {
  await connectRabbitMQ();
  await startConsumers();
  app.listen(PORT, () => console.log(`[Notification Service] listening on port ${PORT}`));
}

start().catch(err => {
  console.error('[Notification Service] startup error:', err);
  process.exit(1);
});
