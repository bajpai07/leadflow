"""add follow_up_at to discussions

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-13 23:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "discussions",
        sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    with op.batch_alter_table("discussions") as batch_op:
        batch_op.drop_column("follow_up_at")
    # SQLite's batch table rebuild drops the DESC ordering of the composite index, so restore it.
    op.drop_index("ix_discussions_lead_id_created_at", table_name="discussions")
    op.create_index(
        "ix_discussions_lead_id_created_at",
        "discussions",
        ["lead_id", sa.text("created_at DESC")],
    )
