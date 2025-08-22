import re
from typing import List, Optional, Dict, Any, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from datetime import datetime, timedelta
import logging

from models.user import User
from models.match import Match
from models.task import Task
from schemas.user import UserUpdate
from core.database import get_async_session
from core.config import settings
from core.exceptions import UserNotFoundError, InsufficientCoinsError
from services.image_processing import image_processor
from services.file_storage import file_storage_service

logger = logging.getLogger(__name__)

class UserService:
    """Service for managing user profiles and slot management"""
    
    def __init__(self):
        self.slot_reset_interval = timedelta(days=2)
        self.slot_purchase_cost = settings.SLOT_PURCHASE_COST
        
        # Predefined interest categories and keywords
        self.interest_categories = {
            'technology': ['coding', 'programming', 'software', 'tech', 'computer', 'ai', 'machine learning', 'data science', 'web development', 'mobile app', 'startup', 'innovation'],
            'sports': ['fitness', 'gym', 'running', 'basketball', 'football', 'soccer', 'tennis', 'swimming', 'yoga', 'workout', 'exercise', 'athlete', 'sports'],
            'music': ['music', 'guitar', 'piano', 'singing', 'concert', 'band', 'jazz', 'rock', 'pop', 'classical', 'electronic', 'dj', 'producer'],
            'art': ['art', 'painting', 'drawing', 'photography', 'design', 'creative', 'artist', 'gallery', 'museum', 'sketch', 'digital art', 'illustration'],
            'travel': ['travel', 'trip', 'vacation', 'explore', 'adventure', 'backpacking', 'tourism', 'culture', 'language', 'international', 'world'],
            'food': ['cooking', 'baking', 'restaurant', 'food', 'cuisine', 'chef', 'recipe', 'dining', 'wine', 'coffee', 'tea', 'culinary'],
            'books': ['reading', 'books', 'literature', 'novel', 'author', 'library', 'bookstore', 'fiction', 'non-fiction', 'poetry', 'writing'],
            'gaming': ['gaming', 'video games', 'gamer', 'esports', 'console', 'pc gaming', 'mobile games', 'rpg', 'fps', 'strategy'],
            'nature': ['outdoors', 'hiking', 'camping', 'nature', 'environment', 'sustainability', 'green', 'eco-friendly', 'gardening', 'plants'],
            'business': ['entrepreneur', 'business', 'startup', 'marketing', 'finance', 'investment', 'consulting', 'management', 'strategy', 'innovation'],
            'education': ['learning', 'study', 'university', 'college', 'course', 'online learning', 'skill', 'knowledge', 'research', 'academic'],
            'social': ['friends', 'social', 'community', 'networking', 'meetup', 'events', 'party', 'socializing', 'people', 'relationships'],
            'health': ['health', 'wellness', 'meditation', 'mental health', 'nutrition', 'fitness', 'yoga', 'mindfulness', 'self-care', 'therapy'],
            'fashion': ['fashion', 'style', 'clothing', 'designer', 'trend', 'beauty', 'makeup', 'accessories', 'shopping', 'outfit'],
            'movies': ['movies', 'film', 'cinema', 'tv shows', 'netflix', 'streaming', 'actor', 'director', 'theater', 'entertainment'],
            'pets': ['pets', 'dogs', 'cats', 'animals', 'pet care', 'veterinary', 'animal welfare', 'pet training', 'adoption'],
            'volunteer': ['volunteer', 'charity', 'nonprofit', 'community service', 'helping', 'donation', 'social impact', 'philanthropy'],
            'diy': ['diy', 'crafts', 'handmade', 'projects', 'building', 'repair', 'woodworking', 'sewing', 'knitting', 'creative projects']
        }
        
        # Common keywords that indicate interests
        self.common_keywords = [
            'love', 'enjoy', 'passionate', 'interested', 'fascinated', 'excited', 'curious',
            'hobby', 'interest', 'activity', 'skill', 'talent', 'expertise', 'experience',
            'learn', 'study', 'practice', 'improve', 'develop', 'grow', 'explore', 'discover'
        ]
    
    async def get_user_profile(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[User]:
        """Get user profile by ID"""
        if not session:
            async with get_async_session() as session:
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                return result.scalar_one_or_none()
        
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def update_user_profile(
        self,
        user_id: int,
        profile_update: UserUpdate,
        session: AsyncSession = None
    ) -> User:
        """Update user profile"""
        if not session:
            async with get_async_session() as session:
                return await self._update_user_profile_internal(user_id, profile_update, session)
        
        return await self._update_user_profile_internal(user_id, profile_update, session)

    async def _update_user_profile_internal(
        self,
        user_id: int,
        profile_update: UserUpdate,
        session: AsyncSession
    ) -> User:
        """Internal method to update user profile"""
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Update fields
        update_data = profile_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"Updated profile for user {user_id}")
        return user
    
    async def update_profile_picture(
        self,
        user_id: int,
        file_content: bytes,
        filename: str,
        session: AsyncSession = None
    ) -> User:
        """
        Update user's profile picture
        
        Args:
            user_id: User ID
            file_content: Raw image file content
            filename: Original filename
            session: Database session
            
        Returns:
            Updated user object
        """
        if not session:
            async with get_async_session() as session:
                return await self._update_profile_picture_internal(user_id, file_content, filename, session)
        
        return await self._update_profile_picture_internal(user_id, file_content, filename, session)
    
    async def _update_profile_picture_internal(
        self,
        user_id: int,
        file_content: bytes,
        filename: str,
        session: AsyncSession
    ) -> User:
        """Internal method to update profile picture"""
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Validate image
        is_valid, error_message = image_processor.validate_image(file_content, filename)
        if not is_valid:
            raise ValueError(error_message)
        
        # Process image
        processed_image = image_processor.process_profile_picture(file_content)
        
        # Generate filename
        new_filename = image_processor.generate_filename(user_id, filename)
        
        # Save to storage
        file_path = await file_storage_service.save_profile_picture(
            user_id, new_filename, processed_image
        )
        
        # Clean up old profile picture
        if user.profile_picture_url:
            old_filename = user.profile_picture_url.split('/')[-1]
            await file_storage_service.cleanup_old_profile_pictures(user_id, old_filename)
        
        # Update database
        user.profile_picture_url = file_path
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"Updated profile picture for user {user_id}: {file_path}")
        return user
    
    async def delete_profile_picture(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> User:
        """
        Delete user's profile picture
        
        Args:
            user_id: User ID
            session: Database session
            
        Returns:
            Updated user object
        """
        if not session:
            async with get_async_session() as session:
                return await self._delete_profile_picture_internal(user_id, session)
        
        return await self._delete_profile_picture_internal(user_id, session)
    
    async def _delete_profile_picture_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> User:
        """Internal method to delete profile picture"""
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Delete from storage
        if user.profile_picture_url:
            await file_storage_service.delete_profile_picture(user.profile_picture_url)
        
        # Update database
        user.profile_picture_url = None
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"Deleted profile picture for user {user_id}")
        return user
    
    async def get_user_stats(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get user statistics"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get user
        user = await self.get_user_profile(user_id, session)
        if not user:
            raise ValueError("User not found")
        
        # Get match statistics
        result = await session.execute(
            select(func.count(Match.id)).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Match.status == "accepted"
                )
            )
        )
        total_matches = result.scalar() or 0
        
        # Get task completion statistics
        result = await session.execute(
            select(func.count(Task.id)).where(
                and_(
                    or_(Task.user1_id == user_id, Task.user2_id == user_id),
                    Task.is_completed == True
                )
            )
        )
        completed_tasks = result.scalar() or 0
        
        return {
            "user_id": user_id,
            "total_matches": total_matches,
            "completed_tasks": completed_tasks,
            "available_slots": user.available_slots,
            "total_slots_used": user.total_slots_used,
            "coins": user.coins,
            "profile_completion": self._calculate_profile_completion(user)
        }
    
    def _calculate_profile_completion(self, user: User) -> int:
        """Calculate profile completion percentage"""
        fields = [
            user.name, user.age, user.profession, 
            user.profile_text, user.profile_picture_url,
            user.community, user.location
        ]
        completed_fields = sum(1 for field in fields if field is not None)
        return int((completed_fields / len(fields)) * 100)
    
    async def purchase_slot(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> User:
        """Purchase an additional slot using coins"""
        if not session:
            async with get_async_session() as session:
                return await self._purchase_slot_internal(user_id, session)
        
        return await self._purchase_slot_internal(user_id, session)

    async def _purchase_slot_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> User:
        """Internal method to purchase slot"""
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Check if user has enough coins
        if user.coins < self.slot_purchase_cost:
            raise InsufficientCoinsError(
                f"Insufficient coins. Required: {self.slot_purchase_cost}, Available: {user.coins}"
            )
        
        # Purchase slot
        user.coins -= self.slot_purchase_cost
        user.available_slots += 1
        user.last_slot_purchase = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"User {user_id} purchased a slot for {self.slot_purchase_cost} coins")
        return user
    
    async def reset_expired_slots(self, session: AsyncSession = None):
        """Reset expired slots for all users"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Find users with expired slots
        cutoff_date = datetime.utcnow() - self.slot_reset_interval
        
        result = await session.execute(
            select(User).where(
                and_(
                    User.available_slots < 2,
                    or_(
                        User.slot_reset_time == None,
                        User.slot_reset_time < cutoff_date
                    )
                )
            )
        )
        
        users_to_reset = result.scalars().all()
        
        for user in users_to_reset:
            user.available_slots = 2
            user.slot_reset_time = datetime.utcnow()
            user.updated_at = datetime.utcnow()
        
        if users_to_reset:
            await session.commit()
            logger.info(f"Reset slots for {len(users_to_reset)} users")
    
    async def use_slot(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Use a slot for matching"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # Check if user has available slots
        if user.available_slots <= 0:
            return False
        
        # Use slot
        user.available_slots -= 1
        user.total_slots_used += 1
        # Set slot reset time if not already set
        if not user.slot_reset_time:
            user.slot_reset_time = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"User {user_id} used a slot. Remaining: {user.available_slots}")
        return True
    
    async def get_user_matches(
        self,
        user_id: int,
        status: Optional[str] = None,
        session: AsyncSession = None
    ) -> List[Match]:
        """Get user's matches"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        query = select(Match).where(
            or_(Match.user1_id == user_id, Match.user2_id == user_id)
        )
        
        if status:
            query = query.where(Match.status == status)
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def get_user_tasks(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[Task]:
        """Get user's active tasks"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        result = await session.execute(
            select(Task).join(Match).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Task.is_completed == False
                )
            )
        )
        return result.scalars().all()
    
    async def search_users(
        self,
        query: str,
        current_user_id: int,
        session: AsyncSession = None
    ) -> List[User]:
        """Search for users by name, username, or profile text"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        search_term = f"%{query}%"
        
        result = await session.execute(
            select(User).where(
                and_(
                    User.id != current_user_id,
                    User.is_active == True,
                    or_(
                        User.name.ilike(search_term),
                        User.username.ilike(search_term),
                        User.profile_text.ilike(search_term)
                    )
                )
            )
        )
        return result.scalars().all()
    
    async def get_compatible_users(
        self,
        user_id: int,
        limit: int = 10,
        session: AsyncSession = None
    ) -> List[Dict[str, Any]]:
        """Get compatible users for matching"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get current user
        current_user = await self.get_user_profile(user_id, session)
        if not current_user:
            return []
        
        # Find users with similar interests
        compatible_users = []
        
        # Get users with similar community/location
        result = await session.execute(
            select(User).where(
                and_(
                    User.id != user_id,
                    User.is_active == True,
                    User.available_slots > 0,
                    or_(
                        User.community == current_user.community,
                        User.location == current_user.location
                    )
                )
            ).limit(limit)
        )
        
        for user in result.scalars().all():
            # Calculate basic compatibility
            compatibility_score = await self._calculate_basic_compatibility(current_user, user)
            
            compatible_users.append({
                "user": user,
                "compatibility_score": compatibility_score,
                "common_interests": await self._get_common_interests(current_user, user)
            })
        
        # Sort by compatibility score
        compatible_users.sort(key=lambda x: x["compatibility_score"], reverse=True)
        
        return compatible_users
    
    async def _calculate_basic_compatibility(
        self,
        user1: User,
        user2: User
    ) -> int:
        """Calculate basic compatibility between two users"""
        score = 0
        
        # Age compatibility
        if user1.age and user2.age:
            age_diff = abs(user1.age - user2.age)
            if age_diff <= 2:
                score += 25
            elif age_diff <= 5:
                score += 15
            elif age_diff <= 10:
                score += 5
        
        # Community compatibility
        if user1.community and user2.community and user1.community == user2.community:
            score += 20
        
        # Location compatibility
        if user1.location and user2.location and user1.location == user2.location:
            score += 15
        
        return score
    
    async def _get_common_interests(
        self,
        user1: User,
        user2: User
    ) -> List[str]:
        """Get common interests between two users"""
        interests1 = await self.parse_profile_interests(user1)
        interests2 = await self.parse_profile_interests(user2)
        
        return list(set(interests1) & set(interests2))
    
    async def parse_profile_interests(self, user: User) -> List[str]:
        """
        Parse user profile data to extract interests and keywords
        
        Args:
            user: User object with profile data
            
        Returns:
            List of extracted interests/keywords
        """
        interests = set()
        
        # Combine all text fields for analysis
        text_fields = []
        if user.name:
            text_fields.append(user.name.lower())
        if user.profession:
            text_fields.append(user.profession.lower())
        if user.profile_text:
            text_fields.append(user.profile_text.lower())
        if user.community:
            text_fields.append(user.community.lower())
        if user.location:
            text_fields.append(user.location.lower())
        
        combined_text = ' '.join(text_fields)
        
        # Extract interests from predefined categories
        for category, keywords in self.interest_categories.items():
            for keyword in keywords:
                if keyword in combined_text:
                    interests.add(category)
                    interests.add(keyword)
        
        # Extract common interest keywords
        for keyword in self.common_keywords:
            if keyword in combined_text:
                interests.add(keyword)
        
        # Extract additional keywords using regex patterns
        additional_keywords = self._extract_additional_keywords(combined_text)
        interests.update(additional_keywords)
        
        return list(interests)
    
    def _extract_additional_keywords(self, text: str) -> Set[str]:
        """
        Extract additional keywords using regex patterns and NLP-like techniques
        
        Args:
            text: Combined profile text
            
        Returns:
            Set of additional keywords
        """
        keywords = set()
        
        # Extract words that appear after interest indicators
        interest_patterns = [
            r'i\s+(?:love|enjoy|like|am\s+passionate\s+about)\s+(\w+)',
            r'i\s+(?:am\s+interested\s+in|fascinated\s+by)\s+(\w+)',
            r'my\s+(?:hobby|interest|passion)\s+is\s+(\w+)',
            r'i\s+(?:work\s+in|study)\s+(\w+)',
            r'i\s+(?:play|practice)\s+(\w+)',
            r'i\s+(?:read|watch|listen\s+to)\s+(\w+)'
        ]
        
        for pattern in interest_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            keywords.update(matches)
        
        # Extract compound words and phrases
        compound_patterns = [
            r'\b\w+\s+(?:development|design|engineering|science|art|music|sports|gaming)\b',
            r'\b(?:web|mobile|software|data|machine\s+learning|artificial\s+intelligence)\s+\w+\b',
            r'\b(?:video\s+games|board\s+games|card\s+games)\b',
            r'\b(?:rock\s+climbing|mountain\s+biking|road\s+biking)\b',
            r'\b(?:classical\s+music|jazz\s+music|electronic\s+music)\b',
            r'\b(?:digital\s+art|fine\s+art|street\s+art)\b',
            r'\b(?:fine\s+dining|street\s+food|home\s+cooking)\b'
        ]
        
        for pattern in compound_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            keywords.update(matches)
        
        # Extract location-based interests
        location_keywords = [
            'beach', 'mountains', 'city', 'countryside', 'urban', 'rural',
            'coastal', 'inland', 'tropical', 'desert', 'forest', 'lake'
        ]
        
        for keyword in location_keywords:
            if keyword in text:
                keywords.add(keyword)
        
        return keywords
    
    async def get_profile_keywords(self, user: User) -> Dict[str, Any]:
        """
        Get comprehensive profile analysis including interests, keywords, and categories
        
        Args:
            user: User object
            
        Returns:
            Dictionary with profile analysis
        """
        interests = await self.parse_profile_interests(user)
        
        # Categorize interests
        categories = {}
        for interest in interests:
            for category, keywords in self.interest_categories.items():
                if interest in keywords or interest == category:
                    if category not in categories:
                        categories[category] = []
                    categories[category].append(interest)
        
        # Calculate profile richness score
        richness_score = min(len(interests) / 10.0, 1.0)  # Normalize to 0-1
        
        return {
            'interests': interests,
            'categories': categories,
            'richness_score': richness_score,
            'total_interests': len(interests),
            'category_count': len(categories)
        }
    
    async def update_profile_with_parsed_data(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        Update user profile with parsed interests and keywords
        This method can be called after profile updates to refresh the analysis
        
        Args:
            user_id: User ID
            session: Database session
            
        Returns:
            Dictionary with updated profile analysis
        """
        if not session:
            async with get_async_session() as session:
                return await self._update_profile_with_parsed_data_internal(user_id, session)
        
        return await self._update_profile_with_parsed_data_internal(user_id, session)
    
    async def _update_profile_with_parsed_data_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Internal method to update profile with parsed data"""
        user = await self.get_user_profile(user_id, session)
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Get profile analysis
        analysis = await self.get_profile_keywords(user)
        
        # Log the analysis for debugging
        logger.info(f"Profile analysis for user {user_id}: {analysis}")
        
        return analysis

# Create service instance
user_service = UserService() 