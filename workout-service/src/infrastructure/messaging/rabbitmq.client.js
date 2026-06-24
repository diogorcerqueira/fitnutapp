const amqp = require('amqplib');

const EXCHANGE = 'fitness.events';
let channel = null;
let connection = null;

async function connect() {
  connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  console.log('[RabbitMQ] Connected');
}

async function publish(routingKey, payload) {
  if (!channel) throw new Error('RabbitMQ not connected');
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
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
      channel.ack(msg);
    } catch (err) {
      console.error(`[RabbitMQ] handler error on ${routingKey}:`, err.message);
      channel.nack(msg, false, false);
    }
  });
}

module.exports = { connect, publish, subscribe };
