"""Add slot reset time and last purchase fields

Revision ID: add_slot_fields
Revises: add_fastapi_users_fields
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_slot_fields'
down_revision = 'add_fastapi_users_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add slot reset time field
    op.add_column('users', sa.Column('slot_reset_time', sa.DateTime(timezone=True), nullable=True))
    
    # Add last slot purchase field
    op.add_column('users', sa.Column('last_slot_purchase', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove slot fields
    op.drop_column('users', 'slot_reset_time')
    op.drop_column('users', 'last_slot_purchase') 