from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class Community(str, Enum):
    """Predefined community options"""
    TECH = "Tech"
    ARTS = "Arts"
    SPORTS = "Sports"
    BUSINESS = "Business"
    EDUCATION = "Education"
    HEALTHCARE = "Healthcare"
    ENTERTAINMENT = "Entertainment"
    SCIENCE = "Science"
    ENVIRONMENT = "Environment"
    OTHER = "Other"

class Location(str, Enum):
    """Predefined location options"""
    NEW_YORK = "New York"
    LOS_ANGELES = "Los Angeles"
    CHICAGO = "Chicago"
    HOUSTON = "Houston"
    PHOENIX = "Phoenix"
    PHILADELPHIA = "Philadelphia"
    SAN_ANTONIO = "San Antonio"
    SAN_DIEGO = "San Diego"
    DALLAS = "Dallas"
    SAN_JOSE = "San Jose"
    REMOTE = "Remote"
    OTHER = "Other"

class InterestCategory(str, Enum):
    """Predefined interest categories"""
    TECHNOLOGY = "Technology"
    MUSIC = "Music"
    SPORTS = "Sports"
    TRAVEL = "Travel"
    FOOD = "Food"
    READING = "Reading"
    GAMING = "Gaming"
    FITNESS = "Fitness"
    ART = "Art"
    PHOTOGRAPHY = "Photography"
    COOKING = "Cooking"
    DANCING = "Dancing"
    WRITING = "Writing"
    LANGUAGES = "Languages"
    VOLUNTEERING = "Volunteering"
    OTHER = "Other"

class CompatibilityFactor(BaseModel):
    """Schema for individual compatibility factor"""
    score: int = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=1)
    details: str

class CompatibilityResult(BaseModel):
    """Schema for compatibility calculation result"""
    score: int = Field(..., ge=0, le=100)
    factors: Dict[str, CompatibilityFactor]
    details: str
    random_factor: int = Field(..., ge=-5, le=5)

class CompatibilityPreviewRequest(BaseModel):
    """Schema for compatibility preview request"""
    target_user_id: int

class CompatibilityPreviewResponse(BaseModel):
    """Schema for compatibility preview response"""
    target_user: dict  # UserRead schema
    compatibility: CompatibilityResult
    message: str = "Compatibility calculated successfully"

class CommunityLocationOptions(BaseModel):
    """Schema for available community and location options"""
    communities: List[str]
    locations: List[str]
    interest_categories: List[str]

class AgePreferenceUpdate(BaseModel):
    """Schema for updating age preferences"""
    age_preference_min: Optional[int] = Field(None, ge=18, le=100)
    age_preference_max: Optional[int] = Field(None, ge=18, le=100)

class InterestUpdate(BaseModel):
    """Schema for updating interests"""
    interests: str  # JSON string of interest tags

class MatchingPreferences(BaseModel):
    """Schema for matching preferences"""
    community: Optional[str] = None
    location: Optional[str] = None
    interests: Optional[str] = None
    age_preference_min: Optional[int] = Field(None, ge=18, le=100)
    age_preference_max: Optional[int] = Field(None, ge=18, le=100) 