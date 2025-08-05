"""Add compatibility fields to users table

Revision ID: add_compatibility_fields
Revises: add_slot_fields
Create Date: 2025-01-27 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_compatibility_fields'
down_revision = 'add_slot_fields'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add new compatibility fields to users table
    op.add_column('users', sa.Column('interests', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('age_preference_min', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('age_preference_max', sa.Integer(), nullable=True))

def downgrade() -> None:
    # Remove compatibility fields from users table
    op.drop_column('users', 'age_preference_max')
    op.drop_column('users', 'age_preference_min')
    op.drop_column('users', 'interests') 