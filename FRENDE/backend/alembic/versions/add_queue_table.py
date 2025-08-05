"""Add queue entries table

Revision ID: add_queue_table
Revises: add_compatibility_fields
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_queue_table'
down_revision = 'add_compatibility_fields'
branch_labels = None
depends_on = None

def upgrade():
    # Create queue_entries table
    op.create_table('queue_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('priority_score', sa.Float(), nullable=True),
        sa.Column('compatibility_preferences', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('matched_with_user_id', sa.Integer(), nullable=True),
        sa.Column('match_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.ForeignKeyConstraint(['matched_with_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index(op.f('ix_queue_entries_id'), 'queue_entries', ['id'], unique=False)
    op.create_index('ix_queue_entries_status', 'queue_entries', ['status'], unique=False)
    op.create_index('ix_queue_entries_priority', 'queue_entries', ['priority_score'], unique=False)
    op.create_index('ix_queue_entries_created', 'queue_entries', ['created_at'], unique=False)
    op.create_index('ix_queue_entries_user_id', 'queue_entries', ['user_id'], unique=True)

def downgrade():
    # Drop indexes
    op.drop_index('ix_queue_entries_user_id', table_name='queue_entries')
    op.drop_index('ix_queue_entries_created', table_name='queue_entries')
    op.drop_index('ix_queue_entries_priority', table_name='queue_entries')
    op.drop_index('ix_queue_entries_status', table_name='queue_entries')
    op.drop_index(op.f('ix_queue_entries_id'), table_name='queue_entries')
    
    # Drop table
    op.drop_table('queue_entries') 