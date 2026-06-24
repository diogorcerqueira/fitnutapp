"""add available_equipment to user_snapshots

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-23 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_snapshots",
        sa.Column("available_equipment", sa.String(), nullable=True),
        schema="ai",
    )


def downgrade():
    op.drop_column("user_snapshots", "available_equipment", schema="ai")
