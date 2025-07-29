"""Add fastapi-users fields to user table

Revision ID: add_fastapi_users_fields
Revises: 9749b343193b
Create Date: 2025-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_fastapi_users_fields'
down_revision = '9749b343193b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fastapi-users required fields
    op.add_column('users', sa.Column('is_superuser', sa.Boolean(), nullable=True, default=False))
    
    # Update existing columns to match fastapi-users requirements
    # Make username nullable (it was required before)
    op.alter_column('users', 'username', nullable=True)
    
    # Ensure is_active and is_verified have proper defaults
    op.alter_column('users', 'is_active', nullable=False, server_default='1')
    op.alter_column('users', 'is_verified', nullable=False, server_default='0')
    op.alter_column('users', 'is_superuser', nullable=False, server_default='0')


def downgrade() -> None:
    # Remove fastapi-users fields
    op.drop_column('users', 'is_superuser')
    
    # Revert username to required
    op.alter_column('users', 'username', nullable=False)
    
    # Revert boolean fields
    op.alter_column('users', 'is_active', nullable=True, server_default=None)
    op.alter_column('users', 'is_verified', nullable=True, server_default=None) 