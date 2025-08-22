from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from core.database import Base

class User(SQLAlchemyBaseUserTable[int], Base):
    __tablename__ = "users"
    
    # FastAPI Users required fields
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Custom profile fields
    username = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=True, index=True)
    age = Column(Integer, nullable=True, index=True)
    profession = Column(String(100), nullable=True, index=True)
    profile_picture_url = Column(String(500), nullable=True)
    profile_text = Column(Text, nullable=True)  # max 100 words
    
    # Matching preferences
    community = Column(String(100), nullable=True, index=True)
    location = Column(String(100), nullable=True, index=True)
    interests = Column(Text, nullable=True)  # JSON string of interest tags
    age_preference_min = Column(Integer, nullable=True)
    age_preference_max = Column(Integer, nullable=True)
    
    # Slot system
    available_slots = Column(Integer, default=2, index=True)
    total_slots_used = Column(Integer, default=0)
    slot_reset_time = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Coin system
    coins = Column(Integer, default=0, index=True)
    last_slot_purchase = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"

# Performance optimization indexes
Index('ix_users_active_age_community', User.is_active, User.age, User.community)
Index('ix_users_active_location', User.is_active, User.location)
Index('ix_users_active_slots', User.is_active, User.available_slots)
Index('ix_users_age_range', User.age, User.age_preference_min, User.age_preference_max)
Index('ix_users_matching_compatibility', User.is_active, User.age, User.community, User.location)
Index('ix_users_search', User.name, User.username, User.profile_text)
Index('ix_users_created_active', User.created_at, User.is_active)
Index('ix_users_slot_reset', User.slot_reset_time, User.available_slots) 