const app = require('./app');
const { connect: connectRabbitMQ } = require('./infrastructure/messaging/rabbitmq.client');

const PORT = process.env.PORT || 3001;

async function start() {
  await connectRabbitMQ();
  app.listen(PORT, () => console.log(`[Auth Service] listening on port ${PORT}`));
}

start().catch(err => {
  console.error('[Auth Service] startup error:', err);
  process.exit(1);
});
