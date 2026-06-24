import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from openai import RateLimitError, APIStatusError
from app.config import settings
from app.infrastructure.database.database import SessionLocal
from app.infrastructure.repositories.user_snapshot_repository import get_user_snapshot
from app.infrastructure.repositories.event_repository import get_recent_workout_count, get_recent_meal_events
from app.infrastructure.repositories.recommendation_repository import insert_recommendation
from app.infrastructure.external import gemini_client
from app.infrastructure.messaging.event_publisher import publish_recommendation_generated
from app.application.use_cases.generate_weekly_summary import _generate_for_user
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/v1/ai/admin", tags=["AI Admin"])
_bearer = HTTPBearer()


def _get_user_id(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post(
    "/recommend",
    summary="Forçar geração de recomendação IA (demo/admin)",
    response_description="Recomendação gerada e email enviado",
    responses={
        200: {"description": "Recomendação gerada com sucesso"},
        401: {"description": "Token inválido"},
        429: {"description": "Rate limit do LLM excedida — tenta novamente"},
    },
)
async def force_recommendation(user_id: str = Depends(_get_user_id)):
    """Force-generate an AI recommendation and send notification email."""
    loop = asyncio.get_event_loop()

    def _db_work():
        db = SessionLocal()
        try:
            snapshot = get_user_snapshot(db, user_id)
            workout_count = get_recent_workout_count(db, user_id, days=7)
            meal_events = get_recent_meal_events(db, user_id, days=7)

            calories_list = [m.calories for m in meal_events if m.calories]
            protein_list = [m.protein_g for m in meal_events if m.protein_g]
            avg_calories = sum(calories_list) / max(len(set(m.logged_at.date() for m in meal_events)), 1) if calories_list else 0
            avg_protein = sum(protein_list) / max(len(set(m.logged_at.date() for m in meal_events)), 1) if protein_list else 0

            result = gemini_client.generate_recommendation(
                user_snapshot=snapshot,
                workout_count=workout_count,
                avg_calories=avg_calories,
                avg_protein=avg_protein,
                calorie_goal=None,
                protein_goal=None,
            )

            event_id = str(uuid.uuid4())
            insert_recommendation(db, event_id, user_id, result["recommendation"], result.get("focus_area", "workout"))
            email = snapshot.email if snapshot else None
            return result, email
        finally:
            db.close()

    try:
        result, email = await loop.run_in_executor(None, _db_work)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"Rate limit excedida. Tenta novamente. ({e})")
    except APIStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e.message))

    if email:
        await publish_recommendation_generated(
            user_id=user_id,
            email=email,
            recommendation=result["recommendation"],
            focus_area=result.get("focus_area", "workout"),
        )

    return {
        "triggered": "recommendation_generated",
        "recommendation": result["recommendation"],
        "focus_area": result.get("focus_area"),
        "email_sent": email is not None,
    }


@router.post(
    "/weekly-summary",
    summary="Forçar geração de resumo semanal (demo/admin)",
    response_description="Processamento iniciado em background",
    responses={
        200: {"description": "Resumo semanal a ser gerado em background — verificar Mailpit"},
        401: {"description": "Token inválido"},
    },
)
async def force_weekly_summary(background_tasks: BackgroundTasks, user_id: str = Depends(_get_user_id)):
    """Force-generate and send the weekly summary email for the current user."""
    loop = asyncio.get_event_loop()
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    async def _run():
        try:
            await _generate_for_user(user_id, week_start, now, asyncio.get_event_loop())
        except Exception as e:
            print(f"[Admin] Weekly summary error for {user_id}: {e}")

    background_tasks.add_task(_run)
    return {"triggered": "weekly_summary_generation", "status": "processing", "email": "check Mailpit at :8025"}
