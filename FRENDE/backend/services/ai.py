import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from core.config import settings
from core.exceptions import AIGenerationError, RateLimitError
from models.user import User
from models.match import Match

logger = logging.getLogger(__name__)

@dataclass
class TaskContext:
    """Context for AI task generation"""
    user1: User
    user2: User
    match: Match
    task_type: str = "bonding"
    previous_tasks: List[str] = None
    compatibility_score: int = 0
    common_interests: List[str] = None

class RateLimiter:
    """Token bucket rate limiter for AI API calls"""
    
    def __init__(self, max_requests: int = 60, window: int = 60):
        self.max_requests = max_requests
        self.window = window
        self.tokens = max_requests
        self.last_refill = time.time()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """Acquire a token for API call"""
        async with self._lock:
            now = time.time()
            
            # Refill tokens based on time passed
            time_passed = now - self.last_refill
            tokens_to_add = int(time_passed * self.max_requests / self.window)
            
            if tokens_to_add > 0:
                self.tokens = min(self.max_requests, self.tokens + tokens_to_add)
                self.last_refill = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            
            return False

class TaskCache:
    """Simple cache for AI-generated tasks"""
    
    def __init__(self, max_size: int = 100, ttl: int = 3600):
        self.max_size = max_size
        self.ttl = ttl
        self.cache: Dict[str, Tuple[str, float]] = {}
    
    def get(self, key: str) -> Optional[str]:
        """Get cached task"""
        if key in self.cache:
            task, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return task
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, task: str):
        """Cache a task"""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
        
        self.cache[key] = (task, time.time())

class PromptBuilder:
    """Builds context-aware prompts for AI task generation"""
    
    def __init__(self):
        self.base_prompts = {
            "bonding": {
                "ice_breaker": """Generate a fun, engaging ice-breaker question for two friends who are getting to know each other. 
                The question should be light-hearted, easy to answer, and help them discover common interests.
                
                Requirements:
                - Keep it under 100 words
                - Make it conversational and friendly
                - Avoid controversial topics
                - Encourage sharing personal experiences
                
                Format: Return only the question, no additional text.""",
                
                "deep_conversation": """Create a thoughtful, meaningful question that helps two friends have a deeper conversation and strengthen their bond.
                The question should encourage vulnerability, self-reflection, and genuine connection.
                
                Requirements:
                - Keep it under 100 words
                - Make it thought-provoking but not too heavy
                - Encourage sharing personal stories
                - Focus on values, dreams, or life experiences
                
                Format: Return only the question, no additional text.""",
                
                "shared_experience": """Suggest a fun activity or challenge that two friends can do together to create a shared experience.
                The activity should be easy to do, enjoyable, and help them bond.
                
                Requirements:
                - Keep it under 100 words
                - Make it practical and doable
                - Focus on creativity or collaboration
                - Can be done remotely or in person
                
                Format: Return only the activity description, no additional text.""",
                
                "personal_growth": """Generate a question that encourages personal reflection and growth, helping friends understand each other better.
                The question should inspire self-discovery and meaningful conversation.
                
                Requirements:
                - Keep it under 100 words
                - Make it introspective but not overwhelming
                - Focus on personal development or life lessons
                - Encourage sharing wisdom or experiences
                
                Format: Return only the question, no additional text."""
            }
        }
    
    def build_bonding_prompt(self, context: TaskContext) -> str:
        """Build a context-aware prompt for bonding tasks"""
        user1 = context.user1
        user2 = context.user2
        
        # Get user interests and details
        user1_interests = self._extract_interests(user1.profile_text or "")
        user2_interests = self._extract_interests(user2.profile_text or "")
        
        # Find common interests
        common_interests = list(set(user1_interests) & set(user2_interests))
        
        # Build context string
        context_str = f"""
        User 1: {user1.name} ({user1.age} years old, {user1.profession or 'Not specified'})
        User 2: {user2.name} ({user2.age} years old, {user2.profession or 'Not specified'})
        
        User 1 interests: {', '.join(user1_interests) if user1_interests else 'Not specified'}
        User 2 interests: {', '.join(user2_interests) if user2_interests else 'Not specified'}
        Common interests: {', '.join(common_interests) if common_interests else 'None identified'}
        Compatibility score: {context.compatibility_score}/100
        
        Previous tasks completed: {len(context.previous_tasks or [])}
        """
        
        # Select appropriate prompt template
        if context.compatibility_score >= 80:
            prompt_type = "deep_conversation"
        elif context.compatibility_score >= 60:
            prompt_type = "shared_experience"
        elif common_interests:
            prompt_type = "ice_breaker"
        else:
            prompt_type = "personal_growth"
        
        base_prompt = self.base_prompts["bonding"][prompt_type]
        
        return f"{base_prompt}\n\nContext:{context_str}"
    
    def build_conversation_starter_prompt(self, context: TaskContext) -> str:
        """Build prompt for conversation starters"""
        return f"""Generate a friendly, engaging conversation starter for two people who just matched.
        
        User 1: {context.user1.name} ({context.user1.age} years old)
        User 2: {context.user2.name} ({context.user2.age} years old)
        
        Requirements:
        - Keep it under 50 words
        - Make it light and friendly
        - Encourage a response
        - Avoid generic greetings
        
        Format: Return only the conversation starter, no additional text."""
    
    def _extract_interests(self, profile_text: str) -> List[str]:
        """Extract interests from profile text"""
        if not profile_text:
            return []
        
        # Simple keyword extraction (can be enhanced with NLP)
        interest_keywords = [
            "music", "reading", "travel", "cooking", "sports", "gaming",
            "art", "photography", "dancing", "hiking", "movies", "writing",
            "technology", "fitness", "yoga", "meditation", "gardening",
            "pets", "volunteering", "learning", "fashion", "food"
        ]
        
        text_lower = profile_text.lower()
        found_interests = [interest for interest in interest_keywords if interest in text_lower]
        
        return found_interests[:5]  # Limit to top 5 interests

class GeminiService:
    """Service for Gemini AI integration"""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = "gemini-pro"
        self.rate_limiter = RateLimiter(
            max_requests=settings.AI_RATE_LIMIT_PER_MINUTE,
            window=60
        )
        self.cache = TaskCache()
        self.prompt_builder = PromptBuilder()
        
        # Configure Gemini
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                }
            )
        else:
            self.model = None
            logger.warning("Gemini API key not configured - AI features will be disabled")
    
    async def generate_task(self, context: TaskContext) -> Tuple[str, str]:
        """Generate an AI-powered task for a match"""
        if not self.model:
            raise AIGenerationError("Gemini AI not configured")
        
        # Check rate limit
        if not await self.rate_limiter.acquire():
            raise RateLimitError("AI API rate limit exceeded")
        
        # Check cache first
        cache_key = self._generate_cache_key(context)
        cached_task = self.cache.get(cache_key)
        if cached_task:
            logger.info(f"Using cached task for match {context.match.id}")
            return "AI-Generated Task", cached_task
        
        try:
            # Build prompt
            prompt = self.prompt_builder.build_bonding_prompt(context)
            
            # Generate response
            response = await self._generate_response(prompt)
            
            # Validate and clean response
            task_content = self._clean_response(response)
            
            # Cache the result
            self.cache.set(cache_key, task_content)
            
            logger.info(f"Generated AI task for match {context.match.id}")
            return "AI-Generated Task", task_content
            
        except Exception as e:
            logger.error(f"AI task generation failed: {str(e)}")
            raise AIGenerationError(f"Failed to generate AI task: {str(e)}")
    
    async def generate_conversation_starter(self, context: TaskContext) -> str:
        """Generate a conversation starter for matched users"""
        if not self.model:
            raise AIGenerationError("Gemini AI not configured")
        
        # Check rate limit
        if not await self.rate_limiter.acquire():
            raise RateLimitError("AI API rate limit exceeded")
        
        try:
            # Build prompt
            prompt = self.prompt_builder.build_conversation_starter_prompt(context)
            
            # Generate response
            response = await self._generate_response(prompt)
            
            # Validate and clean response
            starter = self._clean_response(response)
            
            logger.info(f"Generated conversation starter for match {context.match.id}")
            return starter
            
        except Exception as e:
            logger.error(f"Conversation starter generation failed: {str(e)}")
            raise AIGenerationError(f"Failed to generate conversation starter: {str(e)}")
    
    async def _generate_response(self, prompt: str) -> str:
        """Generate response from Gemini API"""
        try:
            # Use asyncio to run the synchronous Gemini call
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content(prompt)
            )
            
            if response.text:
                return response.text.strip()
            else:
                raise AIGenerationError("Empty response from Gemini API")
                
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise AIGenerationError(f"Gemini API error: {str(e)}")
    
    def _clean_response(self, response: str) -> str:
        """Clean and validate AI response"""
        if not response:
            raise AIGenerationError("Empty response from AI")
        
        # Remove extra whitespace and newlines
        cleaned = " ".join(response.split())
        
        # Ensure it's not too long
        if len(cleaned) > 200:
            cleaned = cleaned[:200] + "..."
        
        # Ensure it's not too short
        if len(cleaned) < 10:
            raise AIGenerationError("Response too short")
        
        return cleaned
    
    def _generate_cache_key(self, context: TaskContext) -> str:
        """Generate cache key for task context"""
        # Create a unique key based on user IDs and task type
        return f"task_{context.user1.id}_{context.user2.id}_{context.task_type}"
    
    def is_available(self) -> bool:
        """Check if AI service is available"""
        return self.model is not None and self.api_key is not None

# Global AI service instance
ai_service = GeminiService() 