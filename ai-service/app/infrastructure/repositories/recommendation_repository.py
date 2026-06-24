from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.infrastructure.database.models import Recommendation, WorkoutPlanEvaluation
from datetime import datetime, timezone


def insert_recommendation(db: Session, event_id: str, user_id: str, recommendation: str, focus_area: str):
    stmt = insert(Recommendation).values(
        event_id=event_id,
        user_id=user_id,
        recommendation=recommendation,
        focus_area=focus_area,
        created_at=datetime.now(timezone.utc),
    ).on_conflict_do_nothing(index_elements=["event_id"])
    db.execute(stmt)
    db.commit()


def insert_plan_evaluation(db: Session, event_id: str, workout_plan_id: str, user_id: str,
                            general_assessment: str, suggestions: str, goal_adequacy: str):
    stmt = insert(WorkoutPlanEvaluation).values(
        event_id=event_id,
        workout_plan_id=workout_plan_id,
        user_id=user_id,
        general_assessment=general_assessment,
        suggestions=suggestions,
        goal_adequacy=goal_adequacy,
        evaluated_at=datetime.now(timezone.utc),
    ).on_conflict_do_nothing(index_elements=["event_id"])
    db.execute(stmt)
    db.commit()


def get_user_recommendations(db: Session, user_id: str, limit: int = 10) -> list[Recommendation]:
    return db.query(Recommendation).filter(
        Recommendation.user_id == user_id
    ).order_by(Recommendation.created_at.desc()).limit(limit).all()
