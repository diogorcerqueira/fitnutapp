const app = require('./app');
const { connect: connectRabbitMQ } = require('./infrastructure/messaging/rabbitmq.client');
const { startConsumers } = require('./infrastructure/messaging/event-consumer');

const PORT = process.env.PORT || 3003;

async function start() {
  await connectRabbitMQ();
  await startConsumers();
  app.listen(PORT, () => console.log(`[Nutrition Service] listening on port ${PORT}`));
}

start().catch(err => {
  console.error('[Nutrition Service] startup error:', err);
  process.exit(1);
});
