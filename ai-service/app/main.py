from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.admin import router as admin_router
from app.infrastructure.messaging.rabbitmq_client import connect, disconnect
from app.infrastructure.messaging.event_consumer import start_consumers
from app.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    await start_consumers()
    start_scheduler()
    yield
    stop_scheduler()
    await disconnect()


app = FastAPI(title="AI Recommendation Service", version="1.0.0", lifespan=lifespan)
app.include_router(recommendations_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return JSONResponse({"status": "ok", "service": "ai-service"})
