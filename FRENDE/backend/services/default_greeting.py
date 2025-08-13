from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, List, Optional
from datetime import datetime
import logging
import random

from models.user import User
from core.database import get_async_session

logger = logging.getLogger(__name__)

class DefaultGreetingService:
    """Service for managing default greeting messages and templates"""
    
    def __init__(self):
        self.default_template = "Hello, my name is {name}, I am shy and can't think of a cool opening line :( Wanna be friends?"
        self.greeting_templates = [
            {
                "id": "default",
                "template": "Hello, my name is {name}, I am shy and can't think of a cool opening line :( Wanna be friends?",
                "name": "Default Shy Greeting",
                "is_default": True
            },
            {
                "id": "friendly",
                "template": "Hey! I'm {name} and I'm a bit nervous about starting conversations. Want to be friends? 😊",
                "name": "Friendly Nervous",
                "is_default": False
            },
            {
                "id": "casual",
                "template": "Hi there! I'm {name} and I'm not great at opening lines. Friends? 🙈",
                "name": "Casual Awkward",
                "is_default": False
            },
            {
                "id": "playful",
                "template": "Hello! I'm {name} and I'm awkward at first messages. Let's be friends? 😅",
                "name": "Playful Awkward",
                "is_default": False
            },
            {
                "id": "warm",
                "template": "Hey! I'm {name} and I'm shy about starting chats. Want to be friends? 🤗",
                "name": "Warm Shy",
                "is_default": False
            },
            {
                "id": "honest",
                "template": "Hi! I'm {name} and I'm terrible at first messages. Friends? 😬",
                "name": "Honest Awkward",
                "is_default": False
            },
            {
                "id": "simple",
                "template": "Hey, I'm {name}. Want to be friends? 😊",
                "name": "Simple Direct",
                "is_default": False
            },
            {
                "id": "emoji",
                "template": "Hi! I'm {name} 👋 Friends? 🤝",
                "name": "Emoji Greeting",
                "is_default": False
            }
        ]
    
    def get_default_greeting(self, user_name: str, template_id: Optional[str] = None) -> str:
        """Get default greeting with user name substitution"""
        try:
            if template_id:
                template = self._get_template_by_id(template_id)
            else:
                template = self._get_default_template()
            
            if not template:
                template = self.default_template
            
            return template.format(name=user_name)
            
        except Exception as e:
            logger.error(f"Error generating default greeting: {str(e)}")
            return self.default_template.format(name=user_name)
    
    def get_random_greeting(self, user_name: str) -> str:
        """Get a random greeting template"""
        try:
            template = random.choice(self.greeting_templates)
            return template["template"].format(name=user_name)
            
        except Exception as e:
            logger.error(f"Error generating random greeting: {str(e)}")
            return self.default_template.format(name=user_name)
    
    def get_all_templates(self) -> List[Dict]:
        """Get all available greeting templates"""
        return self.greeting_templates.copy()
    
    def get_template_by_id(self, template_id: str) -> Optional[Dict]:
        """Get a specific template by ID"""
        return self._get_template_by_id(template_id)
    
    def _get_template_by_id(self, template_id: str) -> Optional[str]:
        """Get template text by ID"""
        for template in self.greeting_templates:
            if template["id"] == template_id:
                return template["template"]
        return None
    
    def _get_default_template(self) -> str:
        """Get the default template"""
        for template in self.greeting_templates:
            if template["is_default"]:
                return template["template"]
        return self.default_template
    
    def personalize_greeting(self, template: str, user_name: str, user_data: Optional[Dict] = None) -> str:
        """Personalize a greeting with user data"""
        try:
            # Basic name substitution
            personalized = template.format(name=user_name)
            
            # Add user-specific personalization if data is available
            if user_data:
                # Could add age, interests, etc. for more personalization
                pass
            
            return personalized
            
        except Exception as e:
            logger.error(f"Error personalizing greeting: {str(e)}")
            return template.format(name=user_name)
    
    def validate_template(self, template: str) -> bool:
        """Validate a greeting template"""
        try:
            # Check if template has required placeholder
            if "{name}" not in template:
                return False
            
            # Check template length
            if len(template) > 500:
                return False
            
            # Check for potentially harmful content
            harmful_words = ["script", "javascript", "onload", "onerror"]
            template_lower = template.lower()
            for word in harmful_words:
                if word in template_lower:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating template: {str(e)}")
            return False
    
    def sanitize_user_name(self, user_name: str) -> str:
        """Sanitize user name for safe use in greetings"""
        try:
            # Remove potentially harmful characters
            sanitized = user_name.strip()
            
            # Limit length
            if len(sanitized) > 50:
                sanitized = sanitized[:50]
            
            # Remove HTML tags
            import re
            sanitized = re.sub(r'<[^>]+>', '', sanitized)
            
            return sanitized
            
        except Exception as e:
            logger.error(f"Error sanitizing user name: {str(e)}")
            return "User"
    
    async def get_user_greeting_preference(self, user_id: int, session: AsyncSession = None) -> Optional[str]:
        """Get user's preferred greeting template"""
        if not session:
            async with get_async_session() as session:
                return await self._get_user_greeting_preference_internal(user_id, session)
        
        return await self._get_user_greeting_preference_internal(user_id, session)
    
    async def _get_user_greeting_preference_internal(self, user_id: int, session: AsyncSession) -> Optional[str]:
        """Internal method to get user greeting preference"""
        try:
            # This would query a user_greeting_preferences table
            # For now, return default template
            return "default"
            
        except Exception as e:
            logger.error(f"Error getting user greeting preference: {str(e)}")
            return "default"
    
    async def save_user_greeting_preference(self, user_id: int, template_id: str, session: AsyncSession = None) -> bool:
        """Save user's preferred greeting template"""
        if not session:
            async with get_async_session() as session:
                return await self._save_user_greeting_preference_internal(user_id, template_id, session)
        
        return await self._save_user_greeting_preference_internal(user_id, template_id, session)
    
    async def _save_user_greeting_preference_internal(self, user_id: int, template_id: str, session: AsyncSession) -> bool:
        """Internal method to save user greeting preference"""
        try:
            # This would save to a user_greeting_preferences table
            # For now, just log the preference
            logger.info(f"User {user_id} prefers greeting template: {template_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving user greeting preference: {str(e)}")
            return False
    
    def get_greeting_statistics(self) -> Dict:
        """Get statistics about greeting usage"""
        return {
            "total_templates": len(self.greeting_templates),
            "default_template": self._get_default_template(),
            "template_ids": [t["id"] for t in self.greeting_templates],
            "template_names": [t["name"] for t in self.greeting_templates]
        }

# Global default greeting service instance
default_greeting_service = DefaultGreetingService() 