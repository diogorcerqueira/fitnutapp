const amqp = require('amqplib');

const EXCHANGE = 'fitness.events';
let channel = null;

async function connect() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  console.log('[RabbitMQ] Connected');
}

async function subscribe(routingKey, queueName, handler) {
  if (!channel) throw new Error('RabbitMQ not connected');
  await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(queueName, EXCHANGE, routingKey);
  channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
    } catch (err) {
      console.error(`[RabbitMQ] handler error on ${routingKey}:`, err.message);
    } finally {
      // Always ack — email failure is logged but not retried (avoids duplicate emails)
      channel.ack(msg);
    }
  });
}

module.exports = { connect, subscribe };
