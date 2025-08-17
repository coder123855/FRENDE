from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from core.database import Base

class BlacklistedToken(Base):
    __tablename__ = "blacklisted_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
