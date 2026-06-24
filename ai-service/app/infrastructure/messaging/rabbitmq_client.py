import aio_pika
import asyncio
from app.config import settings

EXCHANGE = "fitness.events"
_connection = None
_channel = None
_exchange = None


async def connect():
    global _connection, _channel, _exchange
    _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    _channel = await _connection.channel()
    _exchange = await _channel.declare_exchange(EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)
    print("[RabbitMQ] Connected")


async def publish(routing_key: str, payload: dict):
    if not _exchange:
        raise RuntimeError("RabbitMQ not connected")
    import json
    message = aio_pika.Message(
        body=json.dumps(payload).encode(),
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await _exchange.publish(message, routing_key=routing_key)


async def subscribe(routing_key: str, queue_name: str, handler):
    if not _channel:
        raise RuntimeError("RabbitMQ not connected")
    queue = await _channel.declare_queue(queue_name, durable=True)
    await queue.bind(_exchange, routing_key=routing_key)

    async def on_message(message: aio_pika.IncomingMessage):
        import json
        async with message.process():
            try:
                payload = json.loads(message.body.decode())
                await handler(payload)
            except Exception as e:
                print(f"[RabbitMQ] handler error on {routing_key}: {e}")

    await queue.consume(on_message)


async def disconnect():
    global _connection
    if _connection and not _connection.is_closed:
        await _connection.close()
    print("[RabbitMQ] Disconnected")
