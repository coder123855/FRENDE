"""Add task submissions table

Revision ID: add_task_submissions_table
Revises: 428e4fd66675
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_task_submissions_table'
down_revision = '428e4fd66675'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create task_submissions table
    op.create_table('task_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('submission_text', sa.Text(), nullable=True),
        sa.Column('submission_evidence_url', sa.String(length=500), nullable=True),
        sa.Column('submission_evidence_type', sa.String(length=50), nullable=True),
        sa.Column('submission_status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('validator_id', sa.Integer(), nullable=True),
        sa.Column('validation_notes', sa.Text(), nullable=True),
        sa.Column('requires_validation', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('validation_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_task_submissions_id'), 'task_submissions', ['id'], unique=False)
    op.create_index(op.f('ix_task_submissions_task_id'), 'task_submissions', ['task_id'], unique=False)
    op.create_index(op.f('ix_task_submissions_user_id'), 'task_submissions', ['user_id'], unique=False)
    op.create_index(op.f('ix_task_submissions_submission_status'), 'task_submissions', ['submission_status'], unique=False)
    
    # Add foreign key constraints
    op.create_foreign_key(None, 'task_submissions', 'tasks', ['task_id'], ['id'])
    op.create_foreign_key(None, 'task_submissions', 'users', ['user_id'], ['id'])
    op.create_foreign_key(None, 'task_submissions', 'users', ['validator_id'], ['id'])


def downgrade() -> None:
    # Drop foreign key constraints
    op.drop_constraint(None, 'task_submissions', type_='foreignkey')
    op.drop_constraint(None, 'task_submissions', type_='foreignkey')
    op.drop_constraint(None, 'task_submissions', type_='foreignkey')
    
    # Drop indexes
    op.drop_index(op.f('ix_task_submissions_submission_status'), table_name='task_submissions')
    op.drop_index(op.f('ix_task_submissions_user_id'), table_name='task_submissions')
    op.drop_index(op.f('ix_task_submissions_task_id'), table_name='task_submissions')
    op.drop_index(op.f('ix_task_submissions_id'), table_name='task_submissions')
    
    # Drop table
    op.drop_table('task_submissions') 