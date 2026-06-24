const app = require('./app');
const { connect: connectRabbitMQ } = require('./infrastructure/messaging/rabbitmq.client');
const { startConsumers } = require('./infrastructure/messaging/event-consumer');

const PORT = process.env.PORT || 3002;

async function start() {
  await connectRabbitMQ();
  await startConsumers();
  app.listen(PORT, () => console.log(`[Workout Service] listening on port ${PORT}`));
}

start().catch(err => {
  console.error('[Workout Service] startup error:', err);
  process.exit(1);
});
