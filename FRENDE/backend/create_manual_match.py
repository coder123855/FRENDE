#!/usr/bin/env python3
"""
Manual Match Creation Script
Creates a match between userA@gmail.com and userB@gmail.com for testing
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session, engine
from models.user import User
from models.match import Match
from models.chat import ChatRoom, ChatMessage
from models.task import Task

async def create_manual_match():
    """Create a manual match between userA and userB"""
    
    # Get database session
    async with async_session() as db:
        try:
            # Find the users
            from sqlalchemy import select
            user_a_result = await db.execute(select(User).where(User.email == "userA@gmail.com"))
            user_a = user_a_result.scalar_one_or_none()
            
            user_b_result = await db.execute(select(User).where(User.email == "userB@gmail.com"))
            user_b = user_b_result.scalar_one_or_none()
            
            if not user_a:
                print("❌ Error: userA@gmail.com not found")
                return False
                
            if not user_b:
                print("❌ Error: userB@gmail.com not found")
                return False
            
            print(f"✅ Found users:")
            print(f"   User A: {user_a.name} (ID: {user_a.id})")
            print(f"   User B: {user_b.name} (ID: {user_b.id})")
            
            # Check if match already exists
            from sqlalchemy import or_
            existing_match_result = await db.execute(
                select(Match).where(
                    or_(
                        (Match.user1_id == user_a.id) & (Match.user2_id == user_b.id),
                        (Match.user1_id == user_b.id) & (Match.user2_id == user_a.id)
                    )
                )
            )
            existing_match = existing_match_result.scalar_one_or_none()
            
            if existing_match:
                print(f"⚠️  Match already exists between these users (ID: {existing_match.id})")
                print(f"   Status: {existing_match.status}")
                return True
            
            # Create match
            now = datetime.utcnow()
            expires_at = now + timedelta(days=2)
            
            match = Match(
                user1_id=user_a.id,
                user2_id=user_b.id,
                status="active",  # Set to active to bypass pending state
                compatibility_score=85,  # High compatibility for testing
                slot_used_by_user1=True,
                slot_used_by_user2=True,
                coins_earned_user1=0,
                coins_earned_user2=0,
                created_at=now,
                started_at=now,
                expires_at=expires_at,
                conversation_starter_id=user_a.id,  # User A starts the conversation
                conversation_started_at=now,
                greeting_sent=False,
                starter_timeout_at=now + timedelta(minutes=1)  # 1 minute timeout
            )
            
            db.add(match)
            await db.flush()  # Get the match ID
            
            print(f"✅ Created match (ID: {match.id})")
            
            # Create chat room
            chat_room = ChatRoom(
                room_id=f"chat_room_{match.id}",
                match_id=match.id,
                is_active=True,
                conversation_starter_id=user_a.id,
                starter_message_sent=False,
                auto_greeting_sent=False,
                created_at=now,
                last_activity=now
            )
            
            db.add(chat_room)
            
            # Update match with chat room ID
            match.chat_room_id = chat_room.room_id
            
            # Create some sample tasks for testing
            tasks = [
                Task(
                    match_id=match.id,
                    title="Tell your friend about your favorite hobby",
                    description="Share something you're passionate about",
                    task_type="conversation",
                    base_coin_reward=10,
                    is_completed=False,
                    expires_at=now + timedelta(hours=24),
                    created_at=now
                ),
                Task(
                    match_id=match.id,
                    title="Ask your friend about their dream vacation",
                    description="Learn about their travel aspirations",
                    task_type="conversation",
                    base_coin_reward=15,
                    is_completed=False,
                    expires_at=now + timedelta(hours=24),
                    created_at=now
                ),
                Task(
                    match_id=match.id,
                    title="Share a funny story from your childhood",
                    description="Make each other laugh with a memory",
                    task_type="conversation",
                    base_coin_reward=20,
                    is_completed=False,
                    expires_at=now + timedelta(hours=24),
                    created_at=now
                )
            ]
            
            for task in tasks:
                db.add(task)
            
            # Create a welcome message
            welcome_message = ChatMessage(
                match_id=match.id,
                sender_id=user_a.id,
                message_text="Hello! I'm excited to chat with you! 👋",
                message_type="text",
                is_read=False,
                is_system_message=False,
                created_at=now
            )
            
            db.add(welcome_message)
            
            # Commit all changes
            await db.commit()
            
            print(f"✅ Created chat room (ID: {chat_room.id})")
            print(f"✅ Created {len(tasks)} sample tasks")
            print(f"✅ Created welcome message")
            print(f"✅ Match setup complete!")
            
            print(f"\n📋 Match Details:")
            print(f"   Match ID: {match.id}")
            print(f"   Status: {match.status}")
            print(f"   Chat Room: {chat_room.room_id}")
            print(f"   Conversation Starter: {user_a.name}")
            print(f"   Expires: {expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating match: {e}")
            await db.rollback()
            return False

async def list_existing_matches():
    """List all existing matches"""
    async with async_session() as db:
        try:
            matches_result = await db.execute(select(Match))
            matches = matches_result.scalars().all()
            
            if not matches:
                print("📭 No matches found in database")
                return
            
            print(f"📋 Found {len(matches)} matches:")
            for match in matches:
                user1_result = await db.execute(select(User).where(User.id == match.user1_id))
                user1 = user1_result.scalar_one_or_none()
                
                user2_result = await db.execute(select(User).where(User.id == match.user2_id))
                user2 = user2_result.scalar_one_or_none()
                
                print(f"   Match {match.id}: {user1.name} ↔ {user2.name}")
                print(f"      Status: {match.status}")
                print(f"      Created: {match.created_at}")
                print(f"      Chat Room: {match.chat_room_id}")
                print()
                
        except Exception as e:
            print(f"❌ Error listing matches: {e}")

async def main():
    print("🤝 Manual Match Creation Script")
    print("=" * 40)
    
    # List existing matches first
    print("\n📋 Current matches in database:")
    await list_existing_matches()
    
    print("\n🔄 Creating manual match...")
    success = await create_manual_match()
    
    if success:
        print("\n✅ Manual match creation completed successfully!")
        print("\n🎯 Next steps:")
        print("   1. Login as userA@gmail.com and check the chat list")
        print("   2. Login as userB@gmail.com and check the chat list")
        print("   3. Test sending messages between the users")
        print("   4. Test task completion and rewards")
    else:
        print("\n❌ Manual match creation failed!")

if __name__ == "__main__":
    asyncio.run(main())
