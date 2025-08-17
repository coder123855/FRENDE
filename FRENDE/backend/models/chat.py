from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Match relationship
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Message content
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text, task_submission, system
    
    # Message metadata
    is_read = Column(Boolean, default=False)
    is_system_message = Column(Boolean, default=False)  # For auto-generated messages
    message_metadata = Column(JSON, nullable=True)
    
    # Task-related messages
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    match = relationship("Match", back_populates="messages")
    sender = relationship("User")
    task = relationship("Task")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, sender_id={self.sender_id}, match_id={self.match_id})>"
    
    def mark_as_read(self):
        """Mark message as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Room identification
    room_id = Column(String(100), unique=True, nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), unique=True, nullable=False)
    
    # Room status
    is_active = Column(Boolean, default=True)
    
    # Conversation starter tracking
    conversation_starter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    starter_message_sent = Column(Boolean, default=False)
    auto_greeting_sent = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="chat_room")
    conversation_starter = relationship("User")
    
    def __repr__(self):
        return f"<ChatRoom(id={self.id}, room_id='{self.room_id}', match_id={self.match_id})>"
    
    def update_last_activity(self):
        """Update the last activity timestamp"""
        self.last_activity = datetime.utcnow() 