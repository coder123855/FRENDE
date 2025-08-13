import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from services.ai import (
    GeminiService, TaskContext, RateLimiter, TaskCache, PromptBuilder
)
from core.exceptions import AIGenerationError, RateLimitError
from models.user import User
from models.match import Match

# Test data
@pytest.fixture
def mock_user1():
    user = Mock(spec=User)
    user.id = 1
    user.name = "Alice"
    user.age = 25
    user.profession = "Software Engineer"
    user.profile_text = "I love coding, music, and hiking. I enjoy reading sci-fi books and playing guitar."
    return user

@pytest.fixture
def mock_user2():
    user = Mock(spec=User)
    user.id = 2
    user.name = "Bob"
    user.age = 28
    user.profession = "Data Scientist"
    user.profile_text = "I'm passionate about data analysis, music, and travel. I love playing piano and hiking."
    return user

@pytest.fixture
def mock_match():
    match = Mock(spec=Match)
    match.id = 1
    match.user1_id = 1
    match.user2_id = 2
    match.status = "active"
    match.compatibility_score = 85
    return match

@pytest.fixture
def task_context(mock_user1, mock_user2, mock_match):
    return TaskContext(
        user1=mock_user1,
        user2=mock_user2,
        match=mock_match,
        task_type="bonding",
        previous_tasks=["Tell your friend about your first pet"],
        compatibility_score=85,
        common_interests=["music", "hiking"]
    )

class TestRateLimiter:
    """Test rate limiter functionality"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_initial_state(self):
        """Test rate limiter starts with full tokens"""
        limiter = RateLimiter(max_requests=10, window=60)
        
        # Should have full tokens initially
        for _ in range(10):
            assert await limiter.acquire() is True
        
        # Should be rate limited after using all tokens
        assert await limiter.acquire() is False
    
    @pytest.mark.asyncio
    async def test_rate_limiter_token_refill(self):
        """Test rate limiter token refill over time"""
        limiter = RateLimiter(max_requests=10, window=60)
        
        # Use all tokens
        for _ in range(10):
            await limiter.acquire()
        
        # Wait for some tokens to refill (simulate time passing)
        with patch('time.time') as mock_time:
            mock_time.return_value = 30  # 30 seconds later
            assert await limiter.acquire() is True  # Should have 5 tokens refilled
    
    @pytest.mark.asyncio
    async def test_rate_limiter_concurrent_access(self):
        """Test rate limiter with concurrent access"""
        limiter = RateLimiter(max_requests=5, window=60)
        
        # Simulate concurrent access
        async def acquire_token():
            return await limiter.acquire()
        
        # Run multiple concurrent requests
        tasks = [acquire_token() for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        # Should have exactly 5 True and 5 False
        assert results.count(True) == 5
        assert results.count(False) == 5

class TestTaskCache:
    """Test task cache functionality"""
    
    def test_cache_set_and_get(self):
        """Test basic cache set and get operations"""
        cache = TaskCache(max_size=10, ttl=3600)
        
        cache.set("test_key", "test_value")
        result = cache.get("test_key")
        
        assert result == "test_value"
    
    def test_cache_expiration(self):
        """Test cache expiration"""
        cache = TaskCache(max_size=10, ttl=1)  # 1 second TTL
        
        cache.set("test_key", "test_value")
        
        # Should be available immediately
        assert cache.get("test_key") == "test_value"
        
        # Simulate time passing
        with patch('time.time') as mock_time:
            mock_time.return_value = 2  # 2 seconds later
            assert cache.get("test_key") is None
    
    def test_cache_size_limit(self):
        """Test cache size limit enforcement"""
        cache = TaskCache(max_size=2, ttl=3600)
        
        # Add 3 items to a cache with size 2
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")
        
        # Oldest item should be evicted
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"

class TestPromptBuilder:
    """Test prompt builder functionality"""
    
    def test_build_bonding_prompt(self, task_context):
        """Test bonding prompt generation"""
        builder = PromptBuilder()
        prompt = builder.build_bonding_prompt(task_context)
        
        # Should contain user information
        assert "Alice" in prompt
        assert "Bob" in prompt
        assert "Software Engineer" in prompt
        assert "Data Scientist" in prompt
        
        # Should contain compatibility score
        assert "85/100" in prompt
        
        # Should contain common interests
        assert "music" in prompt.lower()
        assert "hiking" in prompt.lower()
    
    def test_build_conversation_starter_prompt(self, task_context):
        """Test conversation starter prompt generation"""
        builder = PromptBuilder()
        prompt = builder.build_conversation_starter_prompt(task_context)
        
        # Should contain user names
        assert "Alice" in prompt
        assert "Bob" in prompt
        
        # Should be a conversation starter prompt
        assert "conversation starter" in prompt.lower()
    
    def test_extract_interests(self):
        """Test interest extraction from profile text"""
        builder = PromptBuilder()
        
        # Test with various interests
        profile_text = "I love music, reading, and travel. I enjoy cooking and sports too."
        interests = builder._extract_interests(profile_text)
        
        assert "music" in interests
        assert "reading" in interests
        assert "travel" in interests
        assert "cooking" in interests
        assert "sports" in interests
        
        # Test with no interests
        profile_text = "I am a person who likes to work."
        interests = builder._extract_interests(profile_text)
        assert len(interests) == 0
        
        # Test with empty text
        interests = builder._extract_interests("")
        assert len(interests) == 0

class TestGeminiService:
    """Test Gemini service functionality"""
    
    @pytest.fixture
    def mock_gemini_model(self):
        """Mock Gemini model"""
        mock_model = Mock()
        mock_response = Mock()
        mock_response.text = "What's your favorite childhood memory?"
        mock_model.generate_content.return_value = mock_response
        return mock_model
    
    @pytest.fixture
    def gemini_service(self, mock_gemini_model):
        """Create Gemini service with mocked model"""
        with patch('services.ai.genai') as mock_genai:
            with patch('services.ai.settings') as mock_settings:
                mock_settings.GEMINI_API_KEY = "test_key"
                mock_settings.AI_RATE_LIMIT_PER_MINUTE = 60
                
                mock_genai.configure.return_value = None
                mock_genai.GenerativeModel.return_value = mock_gemini_model
                
                service = GeminiService()
                return service
    
    @pytest.mark.asyncio
    async def test_generate_task_success(self, gemini_service, task_context):
        """Test successful task generation"""
        title, description = await gemini_service.generate_task(task_context)
        
        assert title == "AI-Generated Task"
        assert "childhood memory" in description.lower()
    
    @pytest.mark.asyncio
    async def test_generate_task_no_api_key(self):
        """Test task generation when API key is not configured"""
        with patch('services.ai.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = None
            
            service = GeminiService()
            
            with pytest.raises(AIGenerationError, match="Gemini AI not configured"):
                await service.generate_task(Mock())
    
    @pytest.mark.asyncio
    async def test_generate_task_rate_limit(self, gemini_service, task_context):
        """Test task generation with rate limiting"""
        # Exhaust rate limit
        for _ in range(60):
            await gemini_service.rate_limiter.acquire()
        
        with pytest.raises(RateLimitError, match="AI API rate limit exceeded"):
            await gemini_service.generate_task(task_context)
    
    @pytest.mark.asyncio
    async def test_generate_task_api_error(self, gemini_service, task_context):
        """Test task generation with API error"""
        # Mock API error
        gemini_service.model.generate_content.side_effect = Exception("API Error")
        
        with pytest.raises(AIGenerationError, match="Failed to generate AI task"):
            await gemini_service.generate_task(task_context)
    
    @pytest.mark.asyncio
    async def test_generate_task_empty_response(self, gemini_service, task_context):
        """Test task generation with empty response"""
        # Mock empty response
        mock_response = Mock()
        mock_response.text = ""
        gemini_service.model.generate_content.return_value = mock_response
        
        with pytest.raises(AIGenerationError, match="Empty response from Gemini API"):
            await gemini_service.generate_task(task_context)
    
    @pytest.mark.asyncio
    async def test_generate_conversation_starter(self, gemini_service, task_context):
        """Test conversation starter generation"""
        starter = await gemini_service.generate_conversation_starter(task_context)
        
        assert "childhood memory" in starter.lower()
    
    def test_clean_response(self, gemini_service):
        """Test response cleaning"""
        # Test normal response
        cleaned = gemini_service._clean_response("  Hello   World  ")
        assert cleaned == "Hello World"
        
        # Test long response
        long_response = "A" * 300
        cleaned = gemini_service._clean_response(long_response)
        assert len(cleaned) <= 203  # 200 + "..."
        assert cleaned.endswith("...")
        
        # Test short response
        with pytest.raises(AIGenerationError, match="Response too short"):
            gemini_service._clean_response("Hi")
        
        # Test empty response
        with pytest.raises(AIGenerationError, match="Empty response from AI"):
            gemini_service._clean_response("")
    
    def test_generate_cache_key(self, gemini_service, task_context):
        """Test cache key generation"""
        key = gemini_service._generate_cache_key(task_context)
        assert key == "task_1_2_bonding"
    
    def test_is_available(self):
        """Test service availability check"""
        # Test with API key
        with patch('services.ai.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = "test_key"
            service = GeminiService()
            assert service.is_available() is True
        
        # Test without API key
        with patch('services.ai.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = None
            service = GeminiService()
            assert service.is_available() is False

class TestAIIntegration:
    """Integration tests for AI service"""
    
    @pytest.mark.asyncio
    async def test_ai_service_integration(self, task_context):
        """Test full AI service integration"""
        # This test requires a real API key to run
        # For now, we'll test the fallback behavior
        with patch('services.ai.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY = None
            
            service = GeminiService()
            assert service.is_available() is False
    
    @pytest.mark.asyncio
    async def test_task_context_creation(self, mock_user1, mock_user2, mock_match):
        """Test TaskContext creation and validation"""
        context = TaskContext(
            user1=mock_user1,
            user2=mock_user2,
            match=mock_match,
            task_type="bonding",
            previous_tasks=["Task 1", "Task 2"],
            compatibility_score=85,
            common_interests=["music", "hiking"]
        )
        
        assert context.user1.id == 1
        assert context.user2.id == 2
        assert context.match.id == 1
        assert context.task_type == "bonding"
        assert len(context.previous_tasks) == 2
        assert context.compatibility_score == 85
        assert len(context.common_interests) == 2

# Performance tests
class TestAIPerformance:
    """Performance tests for AI service"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_performance(self):
        """Test rate limiter performance under load"""
        limiter = RateLimiter(max_requests=100, window=60)
        
        # Test concurrent access performance
        start_time = asyncio.get_event_loop().time()
        
        async def acquire_tokens():
            results = []
            for _ in range(50):
                results.append(await limiter.acquire())
            return results
        
        # Run multiple concurrent operations
        tasks = [acquire_tokens() for _ in range(4)]
        results = await asyncio.gather(*tasks)
        
        end_time = asyncio.get_event_loop().time()
        
        # Should complete within reasonable time
        assert end_time - start_time < 1.0
        
        # Should have correct number of successful acquisitions
        total_successful = sum(sum(result) for result in results)
        assert total_successful == 100  # Rate limit
    
    def test_cache_performance(self):
        """Test cache performance"""
        cache = TaskCache(max_size=1000, ttl=3600)
        
        # Test cache set performance
        start_time = asyncio.get_event_loop().time()
        
        for i in range(1000):
            cache.set(f"key_{i}", f"value_{i}")
        
        end_time = asyncio.get_event_loop().time()
        
        # Should complete within reasonable time
        assert end_time - start_time < 1.0
        
        # Test cache get performance
        start_time = asyncio.get_event_loop().time()
        
        for i in range(1000):
            cache.get(f"key_{i}")
        
        end_time = asyncio.get_event_loop().time()
        
        # Should complete within reasonable time
        assert end_time - start_time < 1.0 