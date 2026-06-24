import asyncio
from datetime import datetime, timedelta, timezone
from app.infrastructure.database.database import SessionLocal
from app.infrastructure.repositories.user_snapshot_repository import get_user_snapshot
from app.infrastructure.repositories.event_repository import (
    get_users_with_activity,
    get_weekly_workout_count,
    get_weekly_meal_events,
)
from app.infrastructure.external import gemini_client
from app.infrastructure.messaging.event_publisher import publish_weekly_summary_generated


async def generate_weekly_summaries():
    """Called by APScheduler every Monday at 08:00."""
    loop = asyncio.get_event_loop()
    now = datetime.now(timezone.utc)
    week_end = now
    week_start = now - timedelta(days=7)

    def _get_active_users():
        db = SessionLocal()
        try:
            return get_users_with_activity(db, week_start, week_end)
        finally:
            db.close()

    active_users = await loop.run_in_executor(None, _get_active_users)
    print(f"[WeeklySummary] Generating for {len(active_users)} users")

    for user_id in active_users:
        try:
            await _generate_for_user(user_id, week_start, week_end, loop)
        except Exception as e:
            print(f"[WeeklySummary] Error for user {user_id}: {e}")


async def _generate_for_user(user_id: str, week_start: datetime, week_end: datetime, loop):
    def _db_work():
        db = SessionLocal()
        try:
            snapshot = get_user_snapshot(db, user_id)
            workout_count = get_weekly_workout_count(db, user_id, week_start, week_end)
            meal_events = get_weekly_meal_events(db, user_id, week_start, week_end)

            calories_by_day: dict = {}
            protein_by_day: dict = {}
            for m in meal_events:
                day = m.logged_at.date().isoformat()
                calories_by_day[day] = calories_by_day.get(day, 0) + (m.calories or 0)
                protein_by_day[day] = protein_by_day.get(day, 0) + (m.protein_g or 0)

            avg_calories = sum(calories_by_day.values()) / max(len(calories_by_day), 1)
            avg_protein = sum(protein_by_day.values()) / max(len(protein_by_day), 1)

            summary = gemini_client.generate_weekly_summary(
                user_snapshot=snapshot,
                workout_count=workout_count,
                avg_calories=avg_calories,
                avg_protein=avg_protein,
                recommendations=[],
            )
            email = snapshot.email if snapshot else None
            return summary, email
        finally:
            db.close()

    summary, email = await loop.run_in_executor(None, _db_work)
    if email:
        await publish_weekly_summary_generated(user_id=user_id, email=email, summary_content=summary)
