from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class CoinBalanceResponse(BaseModel):
    """Schema for user coin balance response"""
    user_id: int
    current_balance: int
    total_earned: int
    total_spent: int
    last_updated: datetime

class CoinTransactionResponse(BaseModel):
    """Schema for coin transaction response"""
    transaction_id: str
    type: str  # reward, purchase, refund, etc.
    amount: int
    description: str
    timestamp: datetime
    task_id: Optional[int] = None
    match_id: Optional[int] = None

class CoinHistoryResponse(BaseModel):
    """Schema for coin transaction history response"""
    transactions: List[CoinTransactionResponse]
    total_transactions: int
    total_earned: int
    total_spent: int
    current_balance: int

class RewardSummaryResponse(BaseModel):
    """Schema for user reward summary response"""
    user_id: int
    current_balance: int
    total_tasks_completed: int
    total_coins_earned: int
    average_reward_per_task: float
    recent_rewards: List[Dict]

class SlotPurchaseRequest(BaseModel):
    """Schema for slot purchase request"""
    slot_count: int = Field(..., ge=1, le=10, description="Number of slots to purchase")

class SlotPurchaseResponse(BaseModel):
    """Schema for slot purchase response"""
    user_id: int
    slots_purchased: int
    total_cost: int
    new_balance: int
    new_slot_count: int
    message: str = "Slots purchased successfully"

class TaskRewardResponse(BaseModel):
    """Schema for task completion reward response"""
    task_id: int
    reward_amount: int
    user1_id: int
    user1_coins: int
    user2_id: int
    user2_coins: int
    difficulty_multiplier: int
    bonus_multiplier: float
    message: str = "Rewards distributed successfully" 