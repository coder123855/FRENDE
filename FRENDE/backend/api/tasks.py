from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from core.auth import current_active_user
from core.database import get_async_session
from models.user import User
from models.task import Task
from models.match import Match
from schemas.task import (
    TaskCreate, TaskRead, TaskUpdate, TaskListResponse,
    TaskCompletionRequest, TaskCompletionResponse,
    TaskGenerationRequest, TaskGenerationResponse,
    TaskHistoryResponse
)
from services.tasks import task_service
from services.matching import matching_service
from core.exceptions import (
    MatchNotFoundError, TaskNotFoundError, UserNotInMatchError
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("/matches/{match_id}/tasks", response_model=TaskListResponse)
async def get_match_tasks(
    match_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get tasks for a specific match"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Get tasks for the match
        tasks = await task_service.get_match_tasks(
            match_id, current_user.id, session
        )
        
        # Pagination
        total = len(tasks)
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_tasks = tasks[start_idx:end_idx]
        
        return TaskListResponse(
            tasks=paginated_tasks,
            total=total,
            page=page,
            size=size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tasks: {str(e)}"
        )

@router.post("/", response_model=TaskRead)
async def generate_task(
    task_data: TaskCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Generate a new task for a match"""
    try:
        task = await task_service.generate_task(
            task_data.match_id, task_data.task_type, session
        )
        return task
    except MatchNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark a task as completed by the current user"""
    try:
        task = await task_service.complete_task(task_id, current_user.id, session)
        return task
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error completing task: {str(e)}"
        )

@router.get("/{task_id}", response_model=TaskRead)
async def get_task_details(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get details of a specific task"""
    try:
        task = await task_service.get_task(task_id, current_user.id, session)
        return task
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task: {str(e)}"
        )

@router.delete("/{task_id}")
async def replace_task(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Replace a task with a new one"""
    try:
        await task_service.replace_task(task_id, current_user.id, session)
        return {"message": "Task replaced successfully"}
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error replacing task: {str(e)}"
        )

@router.get("/history", response_model=TaskHistoryResponse)
async def get_task_history(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get task completion history for the current user"""
    try:
        history = await task_service.get_user_task_history(
            current_user.id, session
        )
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task history: {str(e)}"
        )

@router.get("/matches/{match_id}/active")
async def get_active_tasks(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get active tasks for a specific match"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Get active tasks for the match
        active_tasks = await task_service.get_active_tasks(
            match_id, current_user.id, session
        )
        
        return {
            "match_id": match_id,
            "active_tasks": active_tasks,
            "total_active": len(active_tasks)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving active tasks: {str(e)}"
        )

@router.post("/matches/{match_id}/auto-generate")
async def auto_generate_tasks(
    match_id: int,
    count: int = Query(5, ge=1, le=10, description="Number of tasks to generate"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Auto-generate multiple tasks for a match"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Generate multiple tasks
        generated_tasks = await task_service.auto_generate_tasks(
            match_id, count, session
        )
        
        return {
            "match_id": match_id,
            "generated_tasks": generated_tasks,
            "count": len(generated_tasks)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error auto-generating tasks: {str(e)}"
        ) 