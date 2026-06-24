import uuid
from app.infrastructure.messaging.rabbitmq_client import publish


async def publish_recommendation_generated(user_id: str, email: str, recommendation: str, focus_area: str):
    await publish("recommendation.generated", {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "email": email,
        "recommendation": recommendation,
        "focus_area": focus_area,
    })


async def publish_plan_evaluated(workout_plan_id: str, user_id: str, email: str,
                                  evaluated_at: str, evaluation: dict):
    await publish("workout.plan.evaluated", {
        "event_id": str(uuid.uuid4()),
        "workout_plan_id": workout_plan_id,
        "user_id": user_id,
        "email": email,
        "evaluated_at": evaluated_at,
        "evaluation": evaluation,
    })


async def publish_weekly_summary_generated(user_id: str, email: str, summary_content: dict):
    await publish("weekly.summary.generated", {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "email": email,
        "summary_content": summary_content,
    })
