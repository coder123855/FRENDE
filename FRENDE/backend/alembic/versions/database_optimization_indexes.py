"""Database optimization indexes for performance improvement

Revision ID: database_optimization_indexes
Revises: add_task_submissions_table
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'database_optimization_indexes'
down_revision = 'add_task_submissions_table'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # User table optimization indexes
    op.create_index('ix_users_active_age_community', 'users', ['is_active', 'age', 'community'])
    op.create_index('ix_users_active_location', 'users', ['is_active', 'location'])
    op.create_index('ix_users_active_slots', 'users', ['is_active', 'available_slots'])
    op.create_index('ix_users_age_range', 'users', ['age', 'age_preference_min', 'age_preference_max'])
    op.create_index('ix_users_matching_compatibility', 'users', ['is_active', 'age', 'community', 'location'])
    op.create_index('ix_users_search', 'users', ['name', 'username', 'profile_text'])
    op.create_index('ix_users_created_active', 'users', ['created_at', 'is_active'])
    op.create_index('ix_users_slot_reset', 'users', ['slot_reset_time', 'available_slots'])
    
    # Match table optimization indexes
    op.create_index('ix_matches_user_status', 'matches', ['user1_id', 'user2_id', 'status'])
    op.create_index('ix_matches_status_created', 'matches', ['status', 'created_at'])
    op.create_index('ix_matches_active_users', 'matches', ['user1_id', 'user2_id', 'status', 'created_at'])
    op.create_index('ix_matches_compatibility_status', 'matches', ['compatibility_score', 'status'])
    op.create_index('ix_matches_expires_status', 'matches', ['expires_at', 'status'])
    op.create_index('ix_matches_conversation_starter', 'matches', ['conversation_starter_id', 'starter_timeout_at'])
    op.create_index('ix_matches_user1_status', 'matches', ['user1_id', 'status', 'created_at'])
    op.create_index('ix_matches_user2_status', 'matches', ['user2_id', 'status', 'created_at'])
    
    # Chat messages optimization indexes
    op.create_index('ix_chat_messages_match_created_desc', 'chat_messages', ['match_id', 'created_at'], postgresql_ops={'created_at': 'DESC'})
    op.create_index('ix_chat_messages_match_is_read', 'chat_messages', ['match_id', 'is_read'])
    op.create_index('ix_chat_messages_sender_created', 'chat_messages', ['sender_id', 'created_at'])
    op.create_index('ix_chat_messages_task_id', 'chat_messages', ['task_id', 'created_at'])
    op.create_index('ix_chat_messages_type_created', 'chat_messages', ['message_type', 'created_at'])
    op.create_index('ix_chat_messages_unread_count', 'chat_messages', ['match_id', 'is_read', 'created_at'])
    op.create_index('ix_chat_messages_system_created', 'chat_messages', ['is_system_message', 'created_at'])
    
    # Chat rooms optimization indexes
    op.create_index('ix_chat_rooms_active_last_activity', 'chat_rooms', ['is_active', 'last_activity'])
    
    # Tasks optimization indexes
    op.create_index('ix_tasks_match_completed', 'tasks', ['match_id', 'is_completed'])
    op.create_index('ix_tasks_match_expires', 'tasks', ['match_id', 'expires_at'])
    op.create_index('ix_tasks_completed_created', 'tasks', ['is_completed', 'created_at'])
    op.create_index('ix_tasks_expires_active', 'tasks', ['expires_at', 'is_completed'])
    op.create_index('ix_tasks_difficulty_category', 'tasks', ['difficulty', 'category'])
    op.create_index('ix_tasks_ai_generated', 'tasks', ['ai_generated', 'created_at'])
    op.create_index('ix_tasks_validation_status', 'tasks', ['requires_validation', 'validation_approved'])
    op.create_index('ix_tasks_progress_completion', 'tasks', ['progress_percentage', 'is_completed'])
    
    # Task submissions optimization indexes
    op.create_index('ix_task_submissions_task_user', 'task_submissions', ['task_id', 'user_id'])
    op.create_index('ix_task_submissions_status_created', 'task_submissions', ['submission_status', 'submitted_at'])
    op.create_index('ix_task_submissions_user_status', 'task_submissions', ['user_id', 'submission_status'])
    op.create_index('ix_task_submissions_validation', 'task_submissions', ['requires_validation', 'validation_approved'])
    
    # Match requests optimization indexes
    op.create_index('ix_match_requests_sender_receiver', 'match_requests', ['sender_id', 'receiver_id'])
    op.create_index('ix_match_requests_status_created', 'match_requests', ['status', 'created_at'])
    op.create_index('ix_match_requests_expires_status', 'match_requests', ['expires_at', 'status'])
    op.create_index('ix_match_requests_compatibility', 'match_requests', ['compatibility_score', 'status'])
    
    # Queue entries optimization indexes (additional to existing ones)
    op.create_index('ix_queue_entries_priority_status', 'queue_entries', ['priority_score', 'status'])
    op.create_index('ix_queue_entries_expires_status', 'queue_entries', ['expires_at', 'status'])
    op.create_index('ix_queue_entries_created_status', 'queue_entries', ['created_at', 'status'])
    
    # Partial indexes for active data only
    op.execute("CREATE INDEX ix_users_active_only ON users (id, age, community, location) WHERE is_active = true")
    op.execute("CREATE INDEX ix_matches_active_only ON matches (id, user1_id, user2_id, status) WHERE status IN ('active', 'pending')")
    op.execute("CREATE INDEX ix_tasks_active_only ON tasks (id, match_id, is_completed) WHERE is_completed = false")
    op.execute("CREATE INDEX ix_chat_messages_unread_only ON chat_messages (id, match_id, sender_id) WHERE is_read = false")
    
    # Function-based indexes for complex queries
    op.execute("CREATE INDEX ix_users_age_range_active ON users (age, age_preference_min, age_preference_max) WHERE is_active = true AND age IS NOT NULL")
    op.execute("CREATE INDEX ix_matches_compatibility_active ON matches (compatibility_score, created_at) WHERE status = 'active'")
    op.execute("CREATE INDEX ix_tasks_expires_active_only ON tasks (expires_at, match_id) WHERE is_completed = false AND expires_at IS NOT NULL")

def downgrade() -> None:
    # Drop function-based indexes
    op.execute("DROP INDEX IF EXISTS ix_users_age_range_active")
    op.execute("DROP INDEX IF EXISTS ix_matches_compatibility_active")
    op.execute("DROP INDEX IF EXISTS ix_tasks_expires_active_only")
    
    # Drop partial indexes
    op.execute("DROP INDEX IF EXISTS ix_users_active_only")
    op.execute("DROP INDEX IF EXISTS ix_matches_active_only")
    op.execute("DROP INDEX IF EXISTS ix_tasks_active_only")
    op.execute("DROP INDEX IF EXISTS ix_chat_messages_unread_only")
    
    # Drop regular indexes
    op.drop_index('ix_queue_entries_priority_status', table_name='queue_entries')
    op.drop_index('ix_queue_entries_expires_status', table_name='queue_entries')
    op.drop_index('ix_queue_entries_created_status', table_name='queue_entries')
    
    op.drop_index('ix_match_requests_compatibility', table_name='match_requests')
    op.drop_index('ix_match_requests_expires_status', table_name='match_requests')
    op.drop_index('ix_match_requests_status_created', table_name='match_requests')
    op.drop_index('ix_match_requests_sender_receiver', table_name='match_requests')
    
    op.drop_index('ix_task_submissions_validation', table_name='task_submissions')
    op.drop_index('ix_task_submissions_user_status', table_name='task_submissions')
    op.drop_index('ix_task_submissions_status_created', table_name='task_submissions')
    op.drop_index('ix_task_submissions_task_user', table_name='task_submissions')
    
    op.drop_index('ix_tasks_progress_completion', table_name='tasks')
    op.drop_index('ix_tasks_validation_status', table_name='tasks')
    op.drop_index('ix_tasks_ai_generated', table_name='tasks')
    op.drop_index('ix_tasks_difficulty_category', table_name='tasks')
    op.drop_index('ix_tasks_expires_active', table_name='tasks')
    op.drop_index('ix_tasks_completed_created', table_name='tasks')
    op.drop_index('ix_tasks_match_expires', table_name='tasks')
    op.drop_index('ix_tasks_match_completed', table_name='tasks')
    
    op.drop_index('ix_chat_rooms_active_last_activity', table_name='chat_rooms')
    
    op.drop_index('ix_chat_messages_system_created', table_name='chat_messages')
    op.drop_index('ix_chat_messages_unread_count', table_name='chat_messages')
    op.drop_index('ix_chat_messages_type_created', table_name='chat_messages')
    op.drop_index('ix_chat_messages_task_id', table_name='chat_messages')
    op.drop_index('ix_chat_messages_sender_created', table_name='chat_messages')
    op.drop_index('ix_chat_messages_match_is_read', table_name='chat_messages')
    op.drop_index('ix_chat_messages_match_created_desc', table_name='chat_messages')
    
    op.drop_index('ix_matches_user2_status', table_name='matches')
    op.drop_index('ix_matches_user1_status', table_name='matches')
    op.drop_index('ix_matches_conversation_starter', table_name='matches')
    op.drop_index('ix_matches_expires_status', table_name='matches')
    op.drop_index('ix_matches_compatibility_status', table_name='matches')
    op.drop_index('ix_matches_active_users', table_name='matches')
    op.drop_index('ix_matches_status_created', table_name='matches')
    op.drop_index('ix_matches_user_status', table_name='matches')
    
    op.drop_index('ix_users_slot_reset', table_name='users')
    op.drop_index('ix_users_created_active', table_name='users')
    op.drop_index('ix_users_search', table_name='users')
    op.drop_index('ix_users_matching_compatibility', table_name='users')
    op.drop_index('ix_users_age_range', table_name='users')
    op.drop_index('ix_users_active_slots', table_name='users')
    op.drop_index('ix_users_active_location', table_name='users')
    op.drop_index('ix_users_active_age_community', table_name='users')
