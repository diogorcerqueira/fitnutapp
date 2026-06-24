import asyncio
from app.infrastructure.messaging.rabbitmq_client import subscribe
from app.infrastructure.database.database import SessionLocal
from app.infrastructure.repositories.user_snapshot_repository import upsert_user_snapshot
from app.infrastructure.repositories.event_repository import insert_workout_event, insert_meal_event
from app.application.use_cases.generate_recommendation import generate_recommendation
from app.application.use_cases.evaluate_workout_plan import evaluate_workout_plan


async def start_consumers():
    await subscribe("user.registered",                       "ai-service.user-registered",    _handle_user_registered)
    await subscribe("user.profile.updated",                  "ai-service.profile-updated",     _handle_profile_updated)
    await subscribe("workout.completed",                     "ai-service.workout-completed",   _handle_workout_completed)
    await subscribe("meal.logged",                           "ai-service.meal-logged",         _handle_meal_logged)
    await subscribe("workout.plan.evaluation.requested",     "ai-service.plan-eval-requested", _handle_plan_eval_requested)
    print("[Consumers] AI Service listening on 5 queues")


async def _handle_user_registered(payload: dict):
    loop = asyncio.get_event_loop()
    def _db():
        db = SessionLocal()
        try:
            upsert_user_snapshot(db, user_id=payload["user_id"], email=payload["email"])
        finally:
            db.close()
    await loop.run_in_executor(None, _db)


async def _handle_profile_updated(payload: dict):
    loop = asyncio.get_event_loop()
    def _db():
        db = SessionLocal()
        try:
            kwargs = {k: v for k, v in {
                "weight_kg": payload.get("weight_kg"),
                "height_cm": payload.get("height_cm"),
                "age": payload.get("age"),
                "goal": payload.get("goal"),
            }.items() if v is not None}
            email = payload.get("email") or ""
            upsert_user_snapshot(db, user_id=payload["user_id"], email=email, **kwargs)
        finally:
            db.close()
    await loop.run_in_executor(None, _db)


async def _handle_workout_completed(payload: dict):
    loop = asyncio.get_event_loop()
    def _db():
        db = SessionLocal()
        try:
            insert_workout_event(
                db,
                event_id=payload["event_id"],
                user_id=payload["user_id"],
                completed_at=payload["completed_at"],
                exercises_count=payload.get("exercises_count", 0),
            )
        finally:
            db.close()
    await loop.run_in_executor(None, _db)
    # fire-and-forget recommendation generation
    asyncio.create_task(generate_recommendation(payload["user_id"]))


async def _handle_meal_logged(payload: dict):
    loop = asyncio.get_event_loop()
    def _db():
        db = SessionLocal()
        try:
            insert_meal_event(
                db,
                event_id=payload["event_id"],
                user_id=payload["user_id"],
                logged_at=payload["logged_at"],
                meal_type=payload.get("meal_type", ""),
                calories=payload.get("calories", 0),
                protein_g=payload.get("protein_g", 0),
                carbs_g=payload.get("carbs_g", 0),
                fat_g=payload.get("fat_g", 0),
            )
        finally:
            db.close()
    await loop.run_in_executor(None, _db)
    asyncio.create_task(generate_recommendation(payload["user_id"]))


async def _handle_plan_eval_requested(payload: dict):
    # email not in payload — look up from local user snapshot
    loop = asyncio.get_event_loop()
    def _get_email():
        db = SessionLocal()
        try:
            from app.infrastructure.repositories.user_snapshot_repository import get_user_snapshot
            snap = get_user_snapshot(db, payload["user_id"])
            return snap.email if snap else ""
        finally:
            db.close()
    email = await loop.run_in_executor(None, _get_email)
    asyncio.create_task(evaluate_workout_plan(
        workout_plan_id=payload["workout_plan_id"],
        user_id=payload["user_id"],
        plan_data=payload.get("plan_data", {}),
        email=email,
    ))
