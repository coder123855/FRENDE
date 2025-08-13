"""Add conversation starter fields to matches table

Revision ID: add_conversation_starter_fields
Revises: 428e4fd66675
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_conversation_starter_fields'
down_revision = '428e4fd66675'
branch_labels = None
depends_on = None

def upgrade():
    # Add conversation starter fields to matches table
    op.add_column('matches', sa.Column('conversation_starter_id', sa.Integer(), nullable=True))
    op.add_column('matches', sa.Column('conversation_started_at', sa.DateTime(), nullable=True))
    op.add_column('matches', sa.Column('greeting_sent', sa.Boolean(), nullable=True, default=False))
    op.add_column('matches', sa.Column('starter_timeout_at', sa.DateTime(), nullable=True))
    
    # Create index for conversation starter queries
    op.create_index(op.f('ix_matches_conversation_starter_id'), 'matches', ['conversation_starter_id'], unique=False)
    op.create_index(op.f('ix_matches_starter_timeout_at'), 'matches', ['starter_timeout_at'], unique=False)
    
    # Add foreign key constraint
    op.create_foreign_key(None, 'matches', 'users', ['conversation_starter_id'], ['id'])

def downgrade():
    # Remove foreign key constraint
    op.drop_constraint(None, 'matches', type_='foreignkey')
    
    # Remove indexes
    op.drop_index(op.f('ix_matches_starter_timeout_at'), table_name='matches')
    op.drop_index(op.f('ix_matches_conversation_starter_id'), table_name='matches')
    
    # Remove columns
    op.drop_column('matches', 'starter_timeout_at')
    op.drop_column('matches', 'greeting_sent')
    op.drop_column('matches', 'conversation_started_at')
    op.drop_column('matches', 'conversation_starter_id') 