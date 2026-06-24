from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class UserSnapshot(Base):
    __tablename__ = "user_snapshots"
    __table_args__ = {"schema": "ai"}

    user_id = Column(String, primary_key=True)
    email = Column(String, nullable=False)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    goal = Column(String, nullable=True)
    available_equipment = Column(String, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WorkoutEvent(Base):
    __tablename__ = "workout_events"
    __table_args__ = {"schema": "ai"}

    event_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=False)
    exercises_count = Column(Integer, nullable=True)


class MealEvent(Base):
    __tablename__ = "meal_events"
    __table_args__ = {"schema": "ai"}

    event_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    logged_at = Column(DateTime, nullable=False)
    meal_type = Column(String, nullable=True)
    calories = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)


class Recommendation(Base):
    __tablename__ = "recommendations"
    __table_args__ = {"schema": "ai"}

    event_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    recommendation = Column(Text, nullable=False)
    focus_area = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WorkoutPlanEvaluation(Base):
    __tablename__ = "workout_plan_evaluations"
    __table_args__ = {"schema": "ai"}

    event_id = Column(String, primary_key=True)
    workout_plan_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    general_assessment = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)
    goal_adequacy = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
