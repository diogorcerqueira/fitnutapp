import asyncio
import uuid
from app.infrastructure.database.database import SessionLocal
from app.infrastructure.repositories.user_snapshot_repository import get_user_snapshot
from app.infrastructure.repositories.event_repository import get_recent_workout_count, get_recent_meal_events
from app.infrastructure.repositories.recommendation_repository import insert_recommendation
from app.infrastructure.external import gemini_client
from app.infrastructure.messaging.event_publisher import publish_recommendation_generated


async def generate_recommendation(user_id: str):
    loop = asyncio.get_event_loop()

    def _db_work():
        db = SessionLocal()
        try:
            snapshot = get_user_snapshot(db, user_id)
            workout_count = get_recent_workout_count(db, user_id, days=7)
            meal_events = get_recent_meal_events(db, user_id, days=7)

            if not meal_events and workout_count == 0 and not snapshot:
                return None

            # Aggregate meal data
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
            return result, snapshot.email if snapshot else None
        finally:
            db.close()

    result = await loop.run_in_executor(None, _db_work)
    if result is None:
        return

    data, email = result
    if email:
        await publish_recommendation_generated(
            user_id=user_id,
            email=email,
            recommendation=data["recommendation"],
            focus_area=data.get("focus_area", "workout"),
        )
