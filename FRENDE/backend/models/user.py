from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
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
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Custom profile fields
    username = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    profession = Column(String(100), nullable=True)
    profile_picture_url = Column(String(500), nullable=True)
    profile_text = Column(Text, nullable=True)  # 4 lines, 10 chars each max
    
    # Matching preferences
    community = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    interests = Column(Text, nullable=True)  # JSON string of interest tags
    age_preference_min = Column(Integer, nullable=True)
    age_preference_max = Column(Integer, nullable=True)
    
    # Slot system
    available_slots = Column(Integer, default=2)
    total_slots_used = Column(Integer, default=0)
    slot_reset_time = Column(DateTime(timezone=True), nullable=True)
    
    # Coin system
    coins = Column(Integer, default=0)
    last_slot_purchase = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>" 