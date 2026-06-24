import asyncio
import uuid
import json
from datetime import datetime, timezone
from app.infrastructure.database.database import SessionLocal
from app.infrastructure.repositories.user_snapshot_repository import get_user_snapshot
from app.infrastructure.repositories.recommendation_repository import insert_plan_evaluation
from app.infrastructure.external import gemini_client
from app.infrastructure.messaging.event_publisher import publish_plan_evaluated


async def evaluate_workout_plan(workout_plan_id: str, user_id: str, plan_data: dict, email: str):
    loop = asyncio.get_event_loop()

    def _db_work():
        db = SessionLocal()
        try:
            snapshot = get_user_snapshot(db, user_id)
            result = gemini_client.evaluate_workout_plan(snapshot, plan_data)

            event_id = str(uuid.uuid4())
            insert_plan_evaluation(
                db,
                event_id=event_id,
                workout_plan_id=workout_plan_id,
                user_id=user_id,
                general_assessment=result.get("general_assessment", ""),
                suggestions=json.dumps(result.get("suggestions", []), ensure_ascii=False),
                goal_adequacy=result.get("goal_adequacy", ""),
            )
            return result, event_id
        finally:
            db.close()

    result, event_id = await loop.run_in_executor(None, _db_work)
    evaluated_at = datetime.now(timezone.utc).isoformat()

    await publish_plan_evaluated(
        workout_plan_id=workout_plan_id,
        user_id=user_id,
        email=email,
        evaluated_at=evaluated_at,
        evaluation={
            "general_assessment": result.get("general_assessment", ""),
            "suggestions": result.get("suggestions", []),
            "goal_adequacy": result.get("goal_adequacy", ""),
        },
    )
