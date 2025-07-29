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
from schemas.common import PaginationParams, SuccessResponse, ErrorResponse
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

@router.post("/", response_model=TaskResponse)
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

@router.post("/{task_id}/complete", response_model=TaskResponse)
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
    except UserNotInMatchError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

@router.get("/{task_id}", response_model=TaskRead)
async def get_task_details(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed information about a specific task"""
    try:
        task = await task_service.get_task_details(
            task_id, current_user.id, session
        )
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        return task
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task details: {str(e)}"
        )

@router.delete("/{task_id}")
async def replace_task(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Replace/remove a task"""
    try:
        # Verify the task belongs to the user
        task = await task_service.get_task_details(
            task_id, current_user.id, session
        )
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Mark task as expired
        task.expires_at = datetime.utcnow()
        await session.commit()
        
        # Generate new task to replace it
        new_task = await task_service.generate_task(
            task.match_id,
            task.task_type,
            session=session
        )
        
        return SuccessResponse(
            message="Task replaced successfully",
            data={"new_task_id": new_task.id}
        )
        
    except HTTPException:
        raise
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
    """Get current user's task completion history"""
    try:
        history = await task_service.get_task_history(current_user.id, session)
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
    """Get active tasks for a match"""
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
        
        # Get active tasks
        tasks = await task_service.get_match_tasks(
            match_id, current_user.id, session
        )
        
        return {
            "tasks": tasks,
            "total": len(tasks),
            "match_id": match_id
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
        
        generated_tasks = []
        for i in range(count):
            task = await task_service.generate_task(
                match_id,
                "bonding",  # Default to bonding tasks
                session=session
            )
            generated_tasks.append(task)
        
        return {
            "message": f"Generated {count} tasks successfully",
            "tasks": generated_tasks,
            "total_generated": len(generated_tasks)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error auto-generating tasks: {str(e)}"
        ) 