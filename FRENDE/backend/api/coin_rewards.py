from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
import logging

from core.auth import current_active_user
from core.database import get_async_session
from models.user import User
from models.task import Task
from models.match import Match
from schemas.coin_rewards import (
    CoinBalanceResponse, CoinHistoryResponse, RewardSummaryResponse,
    SlotPurchaseRequest, SlotPurchaseResponse, TaskRewardResponse
)
from services.coin_rewards import coin_reward_service
from services.tasks import task_service
from core.exceptions import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coins", tags=["coins"])

@router.get("/balance", response_model=CoinBalanceResponse)
async def get_coin_balance(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get user's current coin balance and statistics"""
    try:
        balance = await coin_reward_service.get_user_coin_balance(current_user.id, session)
        
        # Get reward summary for additional stats
        summary = await coin_reward_service.get_user_reward_summary(current_user.id, session)
        
        return CoinBalanceResponse(
            user_id=current_user.id,
            current_balance=balance,
            total_earned=summary.get('total_coins_earned', 0),
            total_spent=0,  # Would need transaction tracking for accurate spending
            last_updated=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching coin balance: {str(e)}"
        )

@router.get("/history", response_model=CoinHistoryResponse)
async def get_coin_history(
    limit: int = Query(50, ge=1, le=100, description="Number of transactions to return"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get user's coin transaction history"""
    try:
        transactions = await coin_reward_service.get_coin_transaction_history(
            current_user.id, session, limit
        )
        
        # Calculate totals
        total_earned = sum(t['amount'] for t in transactions if t['type'] == 'reward')
        total_spent = sum(t['amount'] for t in transactions if t['type'] == 'purchase')
        current_balance = await coin_reward_service.get_user_coin_balance(current_user.id, session)
        
        return CoinHistoryResponse(
            transactions=transactions,
            total_transactions=len(transactions),
            total_earned=total_earned,
            total_spent=total_spent,
            current_balance=current_balance
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching coin history: {str(e)}"
        )

@router.get("/reward-summary", response_model=RewardSummaryResponse)
async def get_reward_summary(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get user's reward summary and statistics"""
    try:
        summary = await coin_reward_service.get_user_reward_summary(current_user.id, session)
        
        return RewardSummaryResponse(
            user_id=summary['user_id'],
            current_balance=summary['current_balance'],
            total_tasks_completed=summary['total_tasks_completed'],
            total_coins_earned=summary['total_coins_earned'],
            average_reward_per_task=summary['average_reward_per_task'],
            recent_rewards=summary['recent_rewards']
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reward summary: {str(e)}"
        )

@router.post("/purchase-slots", response_model=SlotPurchaseResponse)
async def purchase_slots(
    purchase_data: SlotPurchaseRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Purchase additional slots using coins"""
    try:
        result = await coin_reward_service.purchase_slots_with_coins(
            current_user.id, purchase_data.slot_count, session
        )
        
        return SlotPurchaseResponse(
            user_id=result['user_id'],
            slots_purchased=result['slots_purchased'],
            total_cost=result['total_cost'],
            new_balance=result['new_balance'],
            new_slot_count=result['new_slot_count']
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error purchasing slots: {str(e)}"
        )

@router.post("/tasks/{task_id}/complete-with-rewards", response_model=TaskRewardResponse)
async def complete_task_with_rewards(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Complete a task and distribute coin rewards"""
    try:
        # Get task and match details
        task = await task_service.get_task_by_id(task_id, session)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        match = await task_service.get_match_for_task(task_id, session)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found for task"
            )
        
        # Verify user is part of the match
        if current_user.id not in [match.user1_id, match.user2_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this task"
            )
        
        # Mark task as completed by user
        task.mark_completed_by_user(current_user.id, match)
        
        # If both users completed, award coins
        if task.is_completed:
            reward_result = await coin_reward_service.award_coins_to_users(task, match, session)
            
            return TaskRewardResponse(
                task_id=task_id,
                reward_amount=reward_result['reward_amount'],
                user1_id=reward_result['user1_id'],
                user1_coins=reward_result['user1_coins'],
                user2_id=reward_result['user2_id'],
                user2_coins=reward_result['user2_coins'],
                difficulty_multiplier=task.difficulty_multiplier,
                bonus_multiplier=1.5 if task.requires_validation and task.validation_approved else 1.0
            )
        else:
            # Task partially completed
            return TaskRewardResponse(
                task_id=task_id,
                reward_amount=0,
                user1_id=match.user1_id,
                user1_coins=0,
                user2_id=match.user2_id,
                user2_coins=0,
                difficulty_multiplier=task.difficulty_multiplier,
                bonus_multiplier=1.0,
                message="Task partially completed. Rewards will be awarded when both users complete."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error completing task: {str(e)}"
        )

@router.get("/users/{user_id}/balance")
async def get_user_balance(
    user_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get balance for a specific user (admin or self only)"""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other user's balance"
        )
    
    try:
        balance = await coin_reward_service.get_user_coin_balance(user_id, session)
        return {"user_id": user_id, "balance": balance}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user balance: {str(e)}"
        ) 