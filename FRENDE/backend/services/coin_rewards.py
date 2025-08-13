from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, List, Optional
from datetime import datetime
import logging

from models.user import User
from models.task import Task
from models.match import Match

logger = logging.getLogger(__name__)

class CoinRewardService:
    """Service for handling coin rewards and user balance management"""
    
    def __init__(self):
        self.base_rewards = {
            'easy': 5,
            'medium': 10,
            'hard': 15
        }
        
        self.difficulty_multipliers = {
            'easy': 1,
            'medium': 2,
            'hard': 3
        }
    
    async def calculate_task_reward(self, task: Task) -> int:
        """Calculate the final coin reward for a completed task"""
        base_reward = self.base_rewards.get(task.difficulty.value, 10)
        multiplier = self.difficulty_multipliers.get(task.difficulty.value, 2)
        
        # Apply any additional bonuses (e.g., for validation tasks)
        bonus_multiplier = 1.0
        if task.requires_validation and task.validation_approved:
            bonus_multiplier = 1.5  # 50% bonus for validated tasks
        
        final_reward = int(base_reward * multiplier * bonus_multiplier)
        
        # Update the task's final reward
        task.final_coin_reward = final_reward
        return final_reward
    
    async def award_coins_to_users(self, task: Task, match: Match, session: AsyncSession) -> Dict[str, int]:
        """Award coins to both users when a task is completed"""
        if not task.is_completed:
            raise ValueError("Task must be completed before awarding coins")
        
        # Calculate the reward
        reward_amount = await self.calculate_task_reward(task)
        
        # Award coins to both users
        user1_coins = await self.add_coins_to_user(match.user1_id, reward_amount, session)
        user2_coins = await self.add_coins_to_user(match.user2_id, reward_amount, session)
        
        logger.info(f"Awarded {reward_amount} coins to users {match.user1_id} and {match.user2_id} for task {task.id}")
        
        return {
            'user1_id': match.user1_id,
            'user1_coins': user1_coins,
            'user2_id': match.user2_id,
            'user2_coins': user2_coins,
            'reward_amount': reward_amount
        }
    
    async def get_user_coin_balance(self, user_id: int, session: AsyncSession) -> int:
        """Get the current coin balance for a user"""
        result = await session.execute(
            select(User.coins).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        return user if user is not None else 0
    
    async def add_coins_to_user(self, user_id: int, amount: int, session: AsyncSession) -> int:
        """Add coins to a user's balance and return the new balance"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        # Update user's coin balance
        result = await session.execute(
            update(User)
            .where(User.id == user_id)
            .values(coins=User.coins + amount)
            .returning(User.coins)
        )
        
        new_balance = result.scalar_one()
        await session.commit()
        
        logger.info(f"Added {amount} coins to user {user_id}. New balance: {new_balance}")
        return new_balance
    
    async def deduct_coins_from_user(self, user_id: int, amount: int, session: AsyncSession) -> int:
        """Deduct coins from a user's balance and return the new balance"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        # Check if user has enough coins
        current_balance = await self.get_user_coin_balance(user_id, session)
        if current_balance < amount:
            raise ValueError(f"Insufficient coins. Current balance: {current_balance}, required: {amount}")
        
        # Update user's coin balance
        result = await session.execute(
            update(User)
            .where(User.id == user_id)
            .values(coins=User.coins - amount)
            .returning(User.coins)
        )
        
        new_balance = result.scalar_one()
        await session.commit()
        
        logger.info(f"Deducted {amount} coins from user {user_id}. New balance: {new_balance}")
        return new_balance
    
    async def purchase_slots_with_coins(self, user_id: int, slot_count: int, session: AsyncSession) -> Dict[str, int]:
        """Purchase additional slots using coins"""
        slot_cost = 25  # 25 coins per slot
        total_cost = slot_count * slot_cost
        
        # Deduct coins
        new_balance = await self.deduct_coins_from_user(user_id, total_cost, session)
        
        # Add slots to user
        result = await session.execute(
            update(User)
            .where(User.id == user_id)
            .values(available_slots=User.available_slots + slot_count)
            .returning(User.available_slots)
        )
        
        new_slots = result.scalar_one()
        await session.commit()
        
        logger.info(f"User {user_id} purchased {slot_count} slots for {total_cost} coins")
        
        return {
            'user_id': user_id,
            'slots_purchased': slot_count,
            'total_cost': total_cost,
            'new_balance': new_balance,
            'new_slot_count': new_slots
        }
    
    async def get_user_reward_summary(self, user_id: int, session: AsyncSession) -> Dict[str, any]:
        """Get a summary of user's coin rewards and statistics"""
        # Get user's current balance
        current_balance = await self.get_user_coin_balance(user_id, session)
        
        # Get completed tasks for this user
        result = await session.execute(
            select(Task).join(Match).where(
                (Match.user1_id == user_id) | (Match.user2_id == user_id),
                Task.is_completed == True
            )
        )
        completed_tasks = result.scalars().all()
        
        # Calculate statistics
        total_tasks_completed = len(completed_tasks)
        total_coins_earned = sum(task.final_coin_reward for task in completed_tasks)
        
        # Calculate average reward per task
        avg_reward = total_coins_earned / total_tasks_completed if total_tasks_completed > 0 else 0
        
        # Get recent rewards (last 10 tasks)
        recent_rewards = [
            {
                'task_id': task.id,
                'task_title': task.title,
                'coins_earned': task.final_coin_reward,
                'completed_at': task.completed_at
            }
            for task in completed_tasks[-10:]  # Last 10 tasks
        ]
        
        return {
            'user_id': user_id,
            'current_balance': current_balance,
            'total_tasks_completed': total_tasks_completed,
            'total_coins_earned': total_coins_earned,
            'average_reward_per_task': round(avg_reward, 2),
            'recent_rewards': recent_rewards
        }
    
    async def get_coin_transaction_history(self, user_id: int, session: AsyncSession, limit: int = 50) -> List[Dict]:
        """Get transaction history for a user (placeholder - would need transaction table)"""
        # This would require a separate transaction table to track all coin movements
        # For now, we'll return a simplified version based on completed tasks
        
        result = await session.execute(
            select(Task).join(Match).where(
                (Match.user1_id == user_id) | (Match.user2_id == user_id),
                Task.is_completed == True
            ).order_by(Task.completed_at.desc()).limit(limit)
        )
        
        completed_tasks = result.scalars().all()
        
        transactions = []
        for task in completed_tasks:
            transactions.append({
                'transaction_id': f"task_{task.id}",
                'type': 'reward',
                'amount': task.final_coin_reward,
                'description': f"Completed task: {task.title}",
                'timestamp': task.completed_at,
                'task_id': task.id
            })
        
        return transactions

# Global instance
coin_reward_service = CoinRewardService() 