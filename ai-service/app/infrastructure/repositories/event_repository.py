from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.infrastructure.database.models import WorkoutEvent, MealEvent
from datetime import datetime, timezone


def insert_workout_event(db: Session, event_id: str, user_id: str, completed_at: str, exercises_count: int):
    stmt = insert(WorkoutEvent).values(
        event_id=event_id,
        user_id=user_id,
        completed_at=datetime.fromisoformat(completed_at.replace("Z", "+00:00")),
        exercises_count=exercises_count,
    ).on_conflict_do_nothing(index_elements=["event_id"])
    db.execute(stmt)
    db.commit()


def insert_meal_event(db: Session, event_id: str, user_id: str, logged_at: str,
                      meal_type: str, calories: float, protein_g: float, carbs_g: float, fat_g: float):
    stmt = insert(MealEvent).values(
        event_id=event_id,
        user_id=user_id,
        logged_at=datetime.fromisoformat(logged_at.replace("Z", "+00:00")),
        meal_type=meal_type,
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
    ).on_conflict_do_nothing(index_elements=["event_id"])
    db.execute(stmt)
    db.commit()


def get_weekly_workout_count(db: Session, user_id: str, week_start: datetime, week_end: datetime) -> int:
    return db.query(WorkoutEvent).filter(
        WorkoutEvent.user_id == user_id,
        WorkoutEvent.completed_at >= week_start,
        WorkoutEvent.completed_at <= week_end,
    ).count()


def get_weekly_meal_events(db: Session, user_id: str, week_start: datetime, week_end: datetime) -> list[MealEvent]:
    return db.query(MealEvent).filter(
        MealEvent.user_id == user_id,
        MealEvent.logged_at >= week_start,
        MealEvent.logged_at <= week_end,
    ).all()


def get_users_with_activity(db: Session, week_start: datetime, week_end: datetime) -> list[str]:
    workout_users = {row.user_id for row in db.query(WorkoutEvent.user_id).filter(
        WorkoutEvent.completed_at >= week_start, WorkoutEvent.completed_at <= week_end
    ).all()}
    meal_users = {row.user_id for row in db.query(MealEvent.user_id).filter(
        MealEvent.logged_at >= week_start, MealEvent.logged_at <= week_end
    ).all()}
    return list(workout_users | meal_users)


def get_recent_workout_count(db: Session, user_id: str, days: int = 7) -> int:
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return db.query(WorkoutEvent).filter(
        WorkoutEvent.user_id == user_id,
        WorkoutEvent.completed_at >= since,
    ).count()


def get_recent_meal_events(db: Session, user_id: str, days: int = 7) -> list[MealEvent]:
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return db.query(MealEvent).filter(
        MealEvent.user_id == user_id,
        MealEvent.logged_at >= since,
    ).all()
