"""
Analytics API for Frende Backend
Provides comprehensive analytics and insights using existing monitoring data
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from core.database import get_async_session
from core.auth import current_active_user
from core.performance_monitor import get_performance_monitor
from core.monitoring import SystemMonitor
from models.user import User
from models.match import Match
from models.task import Task
from models.chat import ChatMessage
from services.file_management import file_management_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get comprehensive analytics overview"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        # Get system health
        system_monitor = SystemMonitor()
        system_health = system_monitor.get_system_health()
        
        # Get performance metrics
        performance_monitor = get_performance_monitor()
        performance_summary = performance_monitor.get_performance_summary(hours=24)
        
        # Get user statistics
        user_stats = await get_user_statistics(session)
        
        # Get storage statistics
        storage_stats = await file_management_service.get_storage_statistics()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system_health": system_health,
            "performance_summary": performance_summary,
            "user_statistics": user_stats,
            "storage_statistics": storage_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analytics overview: {str(e)}"
        )

@router.get("/performance")
async def get_performance_analytics(
    hours: int = Query(24, ge=1, le=168, description="Hours to analyze"),
    current_user: User = Depends(current_active_user)
):
    """Get detailed performance analytics"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        performance_monitor = get_performance_monitor()
        
        return {
            "period_hours": hours,
            "performance_summary": performance_monitor.get_performance_summary(hours=hours),
            "slow_operations": performance_monitor.get_slow_operations(limit=20),
            "error_summary": performance_monitor.get_error_summary(hours=hours),
            "system_metrics": performance_monitor.get_system_metrics(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting performance analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving performance analytics: {str(e)}"
        )

@router.get("/users")
async def get_user_analytics(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get user engagement analytics"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        user_stats = await get_user_statistics(session)
        user_engagement = await get_user_engagement_metrics(session)
        user_activity = await get_user_activity_trends(session)
        
        return {
            "user_statistics": user_stats,
            "user_engagement": user_engagement,
            "user_activity_trends": user_activity,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user analytics: {str(e)}"
        )

@router.get("/errors")
async def get_error_analytics(
    hours: int = Query(24, ge=1, le=168, description="Hours to analyze"),
    current_user: User = Depends(current_active_user)
):
    """Get error analysis and trends"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        performance_monitor = get_performance_monitor()
        error_summary = performance_monitor.get_error_summary(hours=hours)
        slow_ops = performance_monitor.get_slow_operations(limit=10)
        
        return {
            "period_hours": hours,
            "error_summary": error_summary,
            "slow_operations": slow_ops,
            "error_trends": await get_error_trends(hours),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting error analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving error analytics: {str(e)}"
        )

@router.get("/business")
async def get_business_analytics(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get business metrics and KPIs"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        match_metrics = await get_match_metrics(session)
        task_metrics = await get_task_metrics(session)
        chat_metrics = await get_chat_metrics(session)
        
        return {
            "match_metrics": match_metrics,
            "task_metrics": task_metrics,
            "chat_metrics": chat_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting business analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving business analytics: {str(e)}"
        )

# Helper functions for analytics data

async def get_user_statistics(session: AsyncSession) -> Dict[str, Any]:
    """Get comprehensive user statistics"""
    try:
        # Total users
        total_users_result = await session.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar()
        
        # Active users (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        active_users_result = await session.execute(
            select(func.count(User.id)).where(User.updated_at >= week_ago)
        )
        active_users = active_users_result.scalar()
        
        # New users (last 30 days)
        month_ago = datetime.utcnow() - timedelta(days=30)
        new_users_result = await session.execute(
            select(func.count(User.id)).where(User.created_at >= month_ago)
        )
        new_users = new_users_result.scalar()
        
        # Users with profile pictures
        users_with_pics_result = await session.execute(
            select(func.count(User.id)).where(User.profile_picture_url.isnot(None))
        )
        users_with_pics = users_with_pics_result.scalar()
        
        return {
            "total_users": total_users,
            "active_users_7d": active_users,
            "new_users_30d": new_users,
            "users_with_profile_pictures": users_with_pics,
            "profile_picture_percentage": (users_with_pics / total_users * 100) if total_users > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting user statistics: {str(e)}")
        return {
            "error": str(e),
            "total_users": 0,
            "active_users_7d": 0,
            "new_users_30d": 0,
            "users_with_profile_pictures": 0,
            "profile_picture_percentage": 0
        }

async def get_user_engagement_metrics(session: AsyncSession) -> Dict[str, Any]:
    """Get user engagement metrics"""
    try:
        # Users with matches
        users_with_matches_result = await session.execute(
            select(func.count(func.distinct(Match.user1_id)) + func.count(func.distinct(Match.user2_id)))
        )
        users_with_matches = users_with_matches_result.scalar() or 0
        
        # Users with completed tasks
        users_with_tasks_result = await session.execute(
            select(func.count(func.distinct(Task.user_id))).where(Task.completed == True)
        )
        users_with_tasks = users_with_tasks_result.scalar() or 0
        
        # Users with chat messages
        users_with_messages_result = await session.execute(
            select(func.count(func.distinct(ChatMessage.sender_id)))
        )
        users_with_messages = users_with_messages_result.scalar() or 0
        
        return {
            "users_with_matches": users_with_matches,
            "users_with_completed_tasks": users_with_tasks,
            "users_with_chat_messages": users_with_messages
        }
        
    except Exception as e:
        logger.error(f"Error getting user engagement metrics: {str(e)}")
        return {
            "error": str(e),
            "users_with_matches": 0,
            "users_with_completed_tasks": 0,
            "users_with_chat_messages": 0
        }

async def get_user_activity_trends(session: AsyncSession) -> Dict[str, Any]:
    """Get user activity trends over time"""
    try:
        # Daily active users for last 7 days
        daily_active = []
        for i in range(7):
            date = datetime.utcnow() - timedelta(days=i)
            start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            result = await session.execute(
                select(func.count(User.id)).where(
                    and_(User.updated_at >= start_of_day, User.updated_at < end_of_day)
                )
            )
            daily_active.append({
                "date": start_of_day.date().isoformat(),
                "active_users": result.scalar() or 0
            })
        
        return {
            "daily_active_users": list(reversed(daily_active))
        }
        
    except Exception as e:
        logger.error(f"Error getting user activity trends: {str(e)}")
        return {
            "error": str(e),
            "daily_active_users": []
        }

async def get_error_trends(hours: int) -> Dict[str, Any]:
    """Get error trends over time"""
    try:
        # This would integrate with your existing error tracking
        # For now, return placeholder data
        return {
            "error_rate_trend": [],
            "most_common_errors": [],
            "error_resolution_time": 0
        }
        
    except Exception as e:
        logger.error(f"Error getting error trends: {str(e)}")
        return {
            "error": str(e),
            "error_rate_trend": [],
            "most_common_errors": [],
            "error_resolution_time": 0
        }

async def get_match_metrics(session: AsyncSession) -> Dict[str, Any]:
    """Get match-related business metrics"""
    try:
        # Total matches
        total_matches_result = await session.execute(select(func.count(Match.id)))
        total_matches = total_matches_result.scalar() or 0
        
        # Active matches
        active_matches_result = await session.execute(
            select(func.count(Match.id)).where(Match.status == "active")
        )
        active_matches = active_matches_result.scalar() or 0
        
        # Successful matches (completed)
        successful_matches_result = await session.execute(
            select(func.count(Match.id)).where(Match.status == "completed")
        )
        successful_matches = successful_matches_result.scalar() or 0
        
        return {
            "total_matches": total_matches,
            "active_matches": active_matches,
            "successful_matches": successful_matches,
            "success_rate": (successful_matches / total_matches * 100) if total_matches > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting match metrics: {str(e)}")
        return {
            "error": str(e),
            "total_matches": 0,
            "active_matches": 0,
            "successful_matches": 0,
            "success_rate": 0
        }

async def get_task_metrics(session: AsyncSession) -> Dict[str, Any]:
    """Get task-related business metrics"""
    try:
        # Total tasks
        total_tasks_result = await session.execute(select(func.count(Task.id)))
        total_tasks = total_tasks_result.scalar() or 0
        
        # Completed tasks
        completed_tasks_result = await session.execute(
            select(func.count(Task.id)).where(Task.completed == True)
        )
        completed_tasks = completed_tasks_result.scalar() or 0
        
        # Task completion rate
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": completion_rate
        }
        
    except Exception as e:
        logger.error(f"Error getting task metrics: {str(e)}")
        return {
            "error": str(e),
            "total_tasks": 0,
            "completed_tasks": 0,
            "completion_rate": 0
        }

async def get_chat_metrics(session: AsyncSession) -> Dict[str, Any]:
    """Get chat-related business metrics"""
    try:
        # Total messages
        total_messages_result = await session.execute(select(func.count(ChatMessage.id)))
        total_messages = total_messages_result.scalar() or 0
        
        # Messages today
        today = datetime.utcnow().date()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        messages_today_result = await session.execute(
            select(func.count(ChatMessage.id)).where(
                and_(ChatMessage.created_at >= start_of_day, ChatMessage.created_at < end_of_day)
            )
        )
        messages_today = messages_today_result.scalar() or 0
        
        # Average messages per user
        avg_messages_per_user = total_messages / max(1, await get_user_count(session))
        
        return {
            "total_messages": total_messages,
            "messages_today": messages_today,
            "average_messages_per_user": avg_messages_per_user
        }
        
    except Exception as e:
        logger.error(f"Error getting chat metrics: {str(e)}")
        return {
            "error": str(e),
            "total_messages": 0,
            "messages_today": 0,
            "average_messages_per_user": 0
        }

async def get_user_count(session: AsyncSession) -> int:
    """Get total user count"""
    try:
        result = await session.execute(select(func.count(User.id)))
        return result.scalar() or 0
    except Exception:
        return 0
