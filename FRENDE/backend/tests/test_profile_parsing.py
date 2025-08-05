import pytest
from unittest.mock import AsyncMock, MagicMock
from services.users import UserService
from models.user import User

class TestProfileParsing:
    """Test profile data parsing functionality"""
    
    @pytest.fixture
    def user_service(self):
        return UserService()
    
    @pytest.fixture
    def mock_user_tech(self):
        """Mock user with technology interests"""
        user = MagicMock(spec=User)
        user.name = "John Developer"
        user.profession = "Software Engineer"
        user.profile_text = "I love coding and programming. I'm passionate about AI and machine learning. I work in web development and enjoy building mobile apps."
        user.community = "Tech"
        user.location = "San Francisco"
        return user
    
    @pytest.fixture
    def mock_user_music(self):
        """Mock user with music interests"""
        user = MagicMock(spec=User)
        user.name = "Sarah Musician"
        user.profession = "Music Producer"
        user.profile_text = "I love music and playing guitar. I'm passionate about jazz and classical music. I enjoy going to concerts and listening to electronic music."
        user.community = "Arts"
        user.location = "New York"
        return user
    
    @pytest.fixture
    def mock_user_sports(self):
        """Mock user with sports interests"""
        user = MagicMock(spec=User)
        user.name = "Mike Athlete"
        user.profession = "Fitness Trainer"
        user.profile_text = "I love fitness and working out. I'm passionate about running and basketball. I enjoy yoga and swimming."
        user.community = "Sports"
        user.location = "Los Angeles"
        return user
    
    @pytest.mark.asyncio
    async def test_parse_tech_interests(self, user_service, mock_user_tech):
        """Test parsing technology interests"""
        interests = await user_service.parse_profile_interests(mock_user_tech)
        
        # Should extract technology-related interests
        assert 'technology' in interests
        assert 'coding' in interests
        assert 'programming' in interests
        assert 'ai' in interests
        assert 'machine learning' in interests
        assert 'web development' in interests
        assert 'mobile app' in interests
        assert 'love' in interests
        assert 'passionate' in interests
    
    @pytest.mark.asyncio
    async def test_parse_music_interests(self, user_service, mock_user_music):
        """Test parsing music interests"""
        interests = await user_service.parse_profile_interests(mock_user_music)
        
        # Should extract music-related interests
        assert 'music' in interests
        assert 'guitar' in interests
        assert 'jazz' in interests
        assert 'classical' in interests
        assert 'electronic' in interests
        assert 'concert' in interests
        assert 'love' in interests
        assert 'passionate' in interests
    
    @pytest.mark.asyncio
    async def test_parse_sports_interests(self, user_service, mock_user_sports):
        """Test parsing sports interests"""
        interests = await user_service.parse_profile_interests(mock_user_sports)
        
        # Should extract sports-related interests
        assert 'sports' in interests
        assert 'fitness' in interests
        assert 'running' in interests
        assert 'basketball' in interests
        assert 'yoga' in interests
        assert 'swimming' in interests
        assert 'workout' in interests
        assert 'love' in interests
        assert 'passionate' in interests
    
    @pytest.mark.asyncio
    async def test_get_profile_keywords(self, user_service, mock_user_tech):
        """Test getting comprehensive profile analysis"""
        analysis = await user_service.get_profile_keywords(mock_user_tech)
        
        # Check structure
        assert 'interests' in analysis
        assert 'categories' in analysis
        assert 'richness_score' in analysis
        assert 'total_interests' in analysis
        assert 'category_count' in analysis
        
        # Check values
        assert isinstance(analysis['interests'], list)
        assert isinstance(analysis['categories'], dict)
        assert isinstance(analysis['richness_score'], float)
        assert 0 <= analysis['richness_score'] <= 1
        assert analysis['total_interests'] > 0
        assert analysis['category_count'] > 0
        
        # Should have technology category
        assert 'technology' in analysis['categories']
    
    @pytest.mark.asyncio
    async def test_get_common_interests(self, user_service, mock_user_tech, mock_user_music):
        """Test finding common interests between users"""
        common_interests = await user_service._get_common_interests(mock_user_tech, mock_user_music)
        
        # Should find common interest keywords
        assert 'love' in common_interests
        assert 'passionate' in common_interests
    
    def test_extract_additional_keywords(self, user_service):
        """Test additional keyword extraction"""
        text = "I love coding and I am passionate about machine learning. I work in software development."
        keywords = user_service._extract_additional_keywords(text)
        
        # Should extract keywords from patterns
        assert len(keywords) > 0
        assert 'coding' in keywords
        assert 'machine learning' in keywords
        assert 'software development' in keywords
    
    def test_extract_compound_keywords(self, user_service):
        """Test compound keyword extraction"""
        text = "I enjoy web development and mobile app development. I also like video games and rock climbing."
        keywords = user_service._extract_additional_keywords(text)
        
        # Should extract compound keywords
        assert 'web development' in keywords
        assert 'mobile app development' in keywords
        assert 'video games' in keywords
        assert 'rock climbing' in keywords

if __name__ == "__main__":
    pytest.main([__file__]) 