"""Add roles to payer accounts.

Revision ID: 20261005_0002
Revises: 20261005_0001
Create Date: 2026-10-05
"""

import sqlalchemy as sa
from alembic import op

revision = "20261005_0002"
down_revision = "20261005_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payers",
        sa.Column(
            "role",
            sa.String(length=20),
            server_default="user",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_payers_role",
        "payers",
        "role IN ('admin', 'user')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_payers_role", "payers", type_="check")
    op.drop_column("payers", "role")
