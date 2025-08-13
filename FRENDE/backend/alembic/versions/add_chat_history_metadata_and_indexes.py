"""Add chat message metadata and history indexes

Revision ID: add_chat_history_metadata_and_indexes
Revises: 9749b343193b
Create Date: 2025-08-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_chat_history_metadata_and_indexes'
down_revision = '9749b343193b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add metadata column to chat_messages
    op.add_column('chat_messages', sa.Column('metadata', sa.JSON(), nullable=True))

    # Add helpful indexes for history and unread queries
    op.create_index('ix_chat_messages_match_created_desc', 'chat_messages', ['match_id', 'created_at'], unique=False)
    op.create_index('ix_chat_messages_match_is_read', 'chat_messages', ['match_id', 'is_read'], unique=False)
    op.create_index('ix_chat_messages_match_id', 'chat_messages', ['match_id', 'id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_chat_messages_match_id', table_name='chat_messages')
    op.drop_index('ix_chat_messages_match_is_read', table_name='chat_messages')
    op.drop_index('ix_chat_messages_match_created_desc', table_name='chat_messages')
    op.drop_column('chat_messages', 'metadata')


