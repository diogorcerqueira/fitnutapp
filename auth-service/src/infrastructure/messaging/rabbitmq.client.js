const amqp = require('amqplib');

const EXCHANGE = 'fitness.events';
let channel = null;

async function connect() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  console.log('[RabbitMQ] Connected');
}

async function publish(routingKey, payload) {
  if (!channel) throw new Error('RabbitMQ not connected');
  const msg = Buffer.from(JSON.stringify(payload));
  channel.publish(EXCHANGE, routingKey, msg, { persistent: true });
}

module.exports = { connect, publish };
