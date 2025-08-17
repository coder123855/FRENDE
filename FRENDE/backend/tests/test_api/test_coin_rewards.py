import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestCoinRewardEndpoints:
    """Test coin reward endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_coin_balance_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user coin balance."""
        response = await authenticated_client.get(f"/coins/balance/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "balance" in data
        assert "total_earned" in data
        assert "total_spent" in data
        assert isinstance(data["balance"], int)
        assert isinstance(data["total_earned"], int)
        assert isinstance(data["total_spent"], int)
    
    @pytest.mark.asyncio
    async def test_get_user_coin_balance_unauthorized(self, client: AsyncClient, test_user):
        """Test getting user coin balance without authentication."""
        response = await client.get(f"/coins/balance/{test_user.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_user_coin_balance_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting coin balance when user is not the owner."""
        response = await authenticated_client.get(f"/coins/balance/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_user_coin_balance_nonexistent_user(self, authenticated_client: AsyncClient):
        """Test getting coin balance for nonexistent user."""
        response = await authenticated_client.get("/coins/balance/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_award_coins_success(self, authenticated_client: AsyncClient, test_user):
        """Test awarding coins to a user."""
        award_data = {
            "amount": 50,
            "reason": "task_completion",
            "description": "Completed bonding task"
        }
        
        response = await authenticated_client.post(f"/coins/award/{test_user.id}", json=award_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "coins awarded" in data["message"].lower()
        assert "new_balance" in data
        assert data["new_balance"] == test_user.coins + award_data["amount"]
    
    @pytest.mark.asyncio
    async def test_award_coins_negative_amount(self, authenticated_client: AsyncClient, test_user):
        """Test awarding negative coins."""
        award_data = {
            "amount": -10,
            "reason": "task_completion",
            "description": "Completed bonding task"
        }
        
        response = await authenticated_client.post(f"/coins/award/{test_user.id}", json=award_data)
        
        assert_response_error(response, 422, "amount")
    
    @pytest.mark.asyncio
    async def test_award_coins_zero_amount(self, authenticated_client: AsyncClient, test_user):
        """Test awarding zero coins."""
        award_data = {
            "amount": 0,
            "reason": "task_completion",
            "description": "Completed bonding task"
        }
        
        response = await authenticated_client.post(f"/coins/award/{test_user.id}", json=award_data)
        
        assert_response_error(response, 422, "amount")
    
    @pytest.mark.asyncio
    async def test_award_coins_not_authorized(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test awarding coins when user is not authorized."""
        award_data = {
            "amount": 50,
            "reason": "task_completion",
            "description": "Completed bonding task"
        }
        
        response = await authenticated_client.post(f"/coins/award/{test_user2.id}", json=award_data)
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_deduct_coins_success(self, authenticated_client: AsyncClient, test_user):
        """Test deducting coins from a user."""
        deduct_data = {
            "amount": 10,
            "reason": "slot_purchase",
            "description": "Purchased additional slot"
        }
        
        response = await authenticated_client.post(f"/coins/deduct/{test_user.id}", json=deduct_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "coins deducted" in data["message"].lower()
        assert "new_balance" in data
        assert data["new_balance"] == test_user.coins - deduct_data["amount"]
    
    @pytest.mark.asyncio
    async def test_deduct_coins_insufficient_balance(self, authenticated_client: AsyncClient, test_session):
        """Test deducting coins when user has insufficient balance."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a user with 5 coins
        poor_user = await create_test_user(test_session, coins=5)
        auth_headers = await get_auth_headers(poor_user.id)
        authenticated_client.headers.update(auth_headers)
        
        deduct_data = {
            "amount": 10,
            "reason": "slot_purchase",
            "description": "Purchased additional slot"
        }
        
        response = await authenticated_client.post(f"/coins/deduct/{poor_user.id}", json=deduct_data)
        
        assert_response_error(response, 400, "insufficient balance")
    
    @pytest.mark.asyncio
    async def test_deduct_coins_negative_amount(self, authenticated_client: AsyncClient, test_user):
        """Test deducting negative coins."""
        deduct_data = {
            "amount": -10,
            "reason": "slot_purchase",
            "description": "Purchased additional slot"
        }
        
        response = await authenticated_client.post(f"/coins/deduct/{test_user.id}", json=deduct_data)
        
        assert_response_error(response, 422, "amount")
    
    @pytest.mark.asyncio
    async def test_deduct_coins_zero_amount(self, authenticated_client: AsyncClient, test_user):
        """Test deducting zero coins."""
        deduct_data = {
            "amount": 0,
            "reason": "slot_purchase",
            "description": "Purchased additional slot"
        }
        
        response = await authenticated_client.post(f"/coins/deduct/{test_user.id}", json=deduct_data)
        
        assert_response_error(response, 422, "amount")
    
    @pytest.mark.asyncio
    async def test_get_coin_transactions_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user coin transactions."""
        response = await authenticated_client.get(f"/coins/transactions/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_coin_transactions_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting coin transactions when user is not the owner."""
        response = await authenticated_client.get(f"/coins/transactions/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_coin_transactions_pagination(self, authenticated_client: AsyncClient, test_user):
        """Test coin transactions pagination."""
        response = await authenticated_client.get(f"/coins/transactions/{test_user.id}?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "transactions" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_get_coin_transaction_details_success(self, authenticated_client: AsyncClient, test_coin_transaction):
        """Test getting coin transaction details."""
        response = await authenticated_client.get(f"/coins/transactions/{test_coin_transaction.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["id"] == test_coin_transaction.id
        assert "user_id" in data
        assert "amount" in data
        assert "type" in data
        assert "reason" in data
        assert "description" in data
        assert "created_at" in data
    
    @pytest.mark.asyncio
    async def test_get_coin_transaction_details_nonexistent(self, authenticated_client: AsyncClient):
        """Test getting nonexistent coin transaction details."""
        response = await authenticated_client.get("/coins/transactions/99999")
        
        assert_response_error(response, 404, "transaction not found")
    
    @pytest.mark.asyncio
    async def test_get_coin_transaction_details_not_owner(self, authenticated_client: AsyncClient, test_coin_transaction, test_session):
        """Test getting coin transaction details when user is not the owner."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not the owner
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/coins/transactions/{test_coin_transaction.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_coin_statistics_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user coin statistics."""
        response = await authenticated_client.get(f"/coins/stats/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "total_earned" in data
        assert "total_spent" in data
        assert "current_balance" in data
        assert "average_earned_per_day" in data
        assert "most_common_reward_type" in data
        assert isinstance(data["total_earned"], int)
        assert isinstance(data["total_spent"], int)
        assert isinstance(data["current_balance"], int)
        assert isinstance(data["average_earned_per_day"], (int, float))
        assert isinstance(data["most_common_reward_type"], str)
    
    @pytest.mark.asyncio
    async def test_get_coin_statistics_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting coin statistics when user is not the owner."""
        response = await authenticated_client.get(f"/coins/stats/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_coin_rewards_config_success(self, authenticated_client: AsyncClient):
        """Test getting coin rewards configuration."""
        response = await authenticated_client.get("/coins/rewards-config")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "task_completion" in data
        assert "slot_purchase" in data
        assert "daily_login" in data
        assert "referral" in data
        assert isinstance(data["task_completion"], dict)
        assert isinstance(data["slot_purchase"], dict)
        assert isinstance(data["daily_login"], dict)
        assert isinstance(data["referral"], dict)
    
    @pytest.mark.asyncio
    async def test_get_coin_rewards_config_unauthorized(self, client: AsyncClient):
        """Test getting coin rewards configuration without authentication."""
        response = await client.get("/coins/rewards-config")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_coin_leaderboard_success(self, authenticated_client: AsyncClient):
        """Test getting coin leaderboard."""
        response = await authenticated_client.get("/coins/leaderboard")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        assert "user_rank" in data
        assert isinstance(data["user_rank"], (int, type(None)))
    
    @pytest.mark.asyncio
    async def test_get_coin_leaderboard_unauthorized(self, client: AsyncClient):
        """Test getting coin leaderboard without authentication."""
        response = await client.get("/coins/leaderboard")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_coin_leaderboard_pagination(self, authenticated_client: AsyncClient):
        """Test coin leaderboard pagination."""
        response = await authenticated_client.get("/coins/leaderboard?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "leaderboard" in data
        assert "user_rank" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user coin analytics."""
        response = await authenticated_client.get(f"/coins/analytics/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "earnings_by_reason" in data
        assert "spending_by_reason" in data
        assert "earnings_timeline" in data
        assert "spending_timeline" in data
        assert isinstance(data["earnings_by_reason"], dict)
        assert isinstance(data["spending_by_reason"], dict)
        assert isinstance(data["earnings_timeline"], list)
        assert isinstance(data["spending_timeline"], list)
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting coin analytics when user is not the owner."""
        response = await authenticated_client.get(f"/coins/analytics/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_time_range(self, authenticated_client: AsyncClient, test_user):
        """Test getting coin analytics with time range."""
        response = await authenticated_client.get(f"/coins/analytics/{test_user.id}?start_date=2024-01-01&end_date=2024-12-31")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "earnings_by_reason" in data
        assert "spending_by_reason" in data
        assert "earnings_timeline" in data
        assert "spending_timeline" in data
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_invalid_date_range(self, authenticated_client: AsyncClient, test_user):
        """Test getting coin analytics with invalid date range."""
        response = await authenticated_client.get(f"/coins/analytics/{test_user.id}?start_date=2024-12-31&end_date=2024-01-01")
        
        assert_response_error(response, 422, "date range")
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_invalid_date_format(self, authenticated_client: AsyncClient, test_user):
        """Test getting coin analytics with invalid date format."""
        response = await authenticated_client.get(f"/coins/analytics/{test_user.id}?start_date=invalid-date")
        
        assert_response_error(response, 422, "date")
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_unauthorized(self, client: AsyncClient, test_user):
        """Test getting coin analytics without authentication."""
        response = await client.get(f"/coins/analytics/{test_user.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_nonexistent_user(self, authenticated_client: AsyncClient):
        """Test getting coin analytics for nonexistent user."""
        response = await authenticated_client.get("/coins/analytics/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_unauthorized(self, client: AsyncClient, test_user):
        """Test getting coin analytics without authentication."""
        response = await client.get(f"/coins/analytics/{test_user.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_coin_analytics_nonexistent_user(self, authenticated_client: AsyncClient):
        """Test getting coin analytics for nonexistent user."""
        response = await authenticated_client.get("/coins/analytics/99999")
        
        assert_response_error(response, 404, "user not found")
