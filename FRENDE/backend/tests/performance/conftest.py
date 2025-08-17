import pytest
import asyncio
import random
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from faker import Faker
from datetime import datetime, timedelta

from core.database import get_async_session
from models.user import User
from models.match import Match
from models.chat import ChatMessage
from models.task import Task
from services.matching import MatchingService
from core.websocket import manager

fake = Faker()

@pytest.fixture
def performance_test_config():
    """Configuration for performance tests"""
    return {
        "concurrent_users": [10, 50, 100, 500, 1000],
        "message_batch_sizes": [10, 50, 100, 500],
        "user_pool_sizes": [100, 500, 1000, 5000],
        "timeout_seconds": 30,
        "max_memory_mb": 512
    }

@pytest.fixture
async def large_user_dataset(session: AsyncSession) -> List[User]:
    """Generate a large dataset of users for performance testing"""
    users = []
    communities = ["tech", "sports", "music", "art", "science", "business", "education"]
    locations = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio"]
    
    for i in range(1000):
        user = User(
            username=f"testuser_{i}",
            email=f"testuser_{i}@example.com",
            name=fake.name(),
            age=random.randint(18, 65),
            profession=fake.job(),
            community=random.choice(communities),
            location=random.choice(locations),
            profile_text=fake.text(max_nb_chars=200),
            available_slots=2,
            total_slots_used=0,
            coins=random.randint(0, 1000),
            is_active=True
        )
        session.add(user)
        users.append(user)
    
    await session.commit()
    return users

@pytest.fixture
async def active_matches_dataset(session: AsyncSession, large_user_dataset: List[User]) -> List[Match]:
    """Generate active matches for performance testing"""
    matches = []
    
    for i in range(0, len(large_user_dataset) - 1, 2):
        user1 = large_user_dataset[i]
        user2 = large_user_dataset[i + 1]
        
        match = Match(
            user1_id=user1.id,
            user2_id=user2.id,
            status="active",
            compatibility_score=random.randint(60, 95),
            slot_used_by_user1=True,
            slot_used_by_user2=True,
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
            started_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
            chat_room_id=f"room_{match.id}" if match.id else f"room_{i}",
            conversation_starter_id=user1.id,
            conversation_started_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 60)),
            greeting_sent=True
        )
        session.add(match)
        matches.append(match)
    
    await session.commit()
    return matches

@pytest.fixture
async def chat_messages_dataset(session: AsyncSession, active_matches_dataset: List[Match]) -> List[ChatMessage]:
    """Generate chat messages for performance testing"""
    messages = []
    
    for match in active_matches_dataset:
        # Generate 50-200 messages per match
        num_messages = random.randint(50, 200)
        
        for i in range(num_messages):
            sender_id = match.user1_id if i % 2 == 0 else match.user2_id
            message = ChatMessage(
                match_id=match.id,
                sender_id=sender_id,
                message_text=fake.text(max_nb_chars=random.randint(10, 200)),
                message_type="text",
                created_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 1440))
            )
            session.add(message)
            messages.append(message)
    
    await session.commit()
    return messages

@pytest.fixture
async def matching_service_instance():
    """Create a matching service instance for testing"""
    return MatchingService()

@pytest.fixture
def websocket_manager():
    """Get the WebSocket manager instance"""
    return manager

@pytest.fixture
async def performance_session():
    """Create a database session for performance tests"""
    async with get_async_session() as session:
        yield session

@pytest.fixture
def benchmark_config():
    """Configuration for pytest-benchmark"""
    return {
        "min_rounds": 10,
        "max_rounds": 100,
        "warmup": True,
        "warmup_iterations": 3,
        "disable_gc": True
    }
