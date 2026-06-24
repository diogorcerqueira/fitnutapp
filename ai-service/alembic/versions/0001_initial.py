"""initial

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE SCHEMA IF NOT EXISTS ai")

    op.create_table(
        "user_snapshots",
        sa.Column("user_id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("goal", sa.String(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        schema="ai",
    )

    op.create_table(
        "workout_events",
        sa.Column("event_id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.Column("exercises_count", sa.Integer(), nullable=True),
        schema="ai",
    )
    op.create_index("ix_ai_workout_events_user_id", "workout_events", ["user_id"], schema="ai")

    op.create_table(
        "meal_events",
        sa.Column("event_id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("meal_type", sa.String(), nullable=True),
        sa.Column("calories", sa.Float(), nullable=True),
        sa.Column("protein_g", sa.Float(), nullable=True),
        sa.Column("carbs_g", sa.Float(), nullable=True),
        sa.Column("fat_g", sa.Float(), nullable=True),
        schema="ai",
    )
    op.create_index("ix_ai_meal_events_user_id", "meal_events", ["user_id"], schema="ai")

    op.create_table(
        "recommendations",
        sa.Column("event_id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("focus_area", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        schema="ai",
    )
    op.create_index("ix_ai_recommendations_user_id", "recommendations", ["user_id"], schema="ai")

    op.create_table(
        "workout_plan_evaluations",
        sa.Column("event_id", sa.String(), primary_key=True),
        sa.Column("workout_plan_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("general_assessment", sa.Text(), nullable=True),
        sa.Column("suggestions", sa.Text(), nullable=True),
        sa.Column("goal_adequacy", sa.Text(), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(), nullable=True),
        schema="ai",
    )
    op.create_index("ix_ai_workout_plan_evaluations_workout_plan_id", "workout_plan_evaluations", ["workout_plan_id"], schema="ai")


def downgrade():
    op.drop_table("workout_plan_evaluations", schema="ai")
    op.drop_table("recommendations", schema="ai")
    op.drop_table("meal_events", schema="ai")
    op.drop_table("workout_events", schema="ai")
    op.drop_table("user_snapshots", schema="ai")
