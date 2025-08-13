from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from core.auth import current_active_user
from core.database import get_async_session
from models.user import User
from models.task import Task
from models.match import Match
from schemas.task import (
    TaskCreate, TaskRead, TaskUpdate, TaskListResponse,
    TaskCompletionRequest, TaskCompletionResponse,
    TaskGenerationRequest, TaskGenerationResponse,
    TaskHistoryResponse, TaskProgressResponse, TaskValidationRequest,
    TaskValidationResponse, TaskStatisticsResponse, TaskDifficulty, TaskCategory
)
from services.tasks import task_service
from services.matching import matching_service
from core.exceptions import (
    MatchNotFoundError, TaskNotFoundError, UserNotInMatchError, AIGenerationError
)

logger = logging.getLogger(__name__)

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
            task_data.match_id, 
            task_data.task_type, 
            task_data.difficulty,
            task_data.category,
            session
        )
        return task
    except MatchNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating task: {str(e)}"
        )

@router.post("/{task_id}/complete", response_model=TaskCompletionResponse)
async def complete_task(
    task_id: int,
    completion_data: TaskCompletionRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark a task as completed by the current user"""
    try:
        task = await task_service.complete_task(task_id, current_user.id, session)
        
        # Get progress information
        progress = await task_service.get_task_progress(task_id, current_user.id, session)
        
        return TaskCompletionResponse(
            task=task,
            message="Task completed successfully",
            coins_earned=task.final_coin_reward,
            progress_updated=True
        )
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
    """Get detailed information about a specific task"""
    try:
        task = await task_service.get_task_details(task_id, current_user.id, session)
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
            detail=f"Error retrieving task: {str(e)}"
        )

@router.get("/{task_id}/progress", response_model=TaskProgressResponse)
async def get_task_progress(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed progress information for a task"""
    try:
        progress = await task_service.get_task_progress(task_id, current_user.id, session)
        return TaskProgressResponse(**progress)
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task progress: {str(e)}"
        )

@router.post("/{task_id}/validate", response_model=TaskValidationResponse)
async def submit_task_validation(
    task_id: int,
    validation_data: TaskValidationRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Submit task validation for tasks that require it"""
    try:
        task = await task_service.submit_task_validation(
            task_id, 
            current_user.id, 
            validation_data.submission_text,
            validation_data.submission_evidence,
            session
        )
        
        return TaskValidationResponse(
            task=task,
            message="Task validation submitted successfully",
            requires_approval=True
        )
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except UserNotInMatchError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting task validation: {str(e)}"
        )

@router.delete("/{task_id}")
async def replace_task(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Replace an expired task with a new one"""
    try:
        # Get task to verify ownership
        task = await task_service.get_task_details(task_id, current_user.id, session)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Check if task is expired
        if not task.is_expired():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is not expired yet"
            )
        
        # Generate replacement task
        replacement_task = await task_service.generate_task(
            task.match_id,
            task.task_type,
            task.difficulty,
            task.category,
            session
        )
        
        return {
            "message": "Task replaced successfully",
            "old_task_id": task_id,
            "new_task": replacement_task
        }
        
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
    """Get task completion history for the current user"""
    try:
        history = await task_service.get_task_history(current_user.id, session)
        return TaskHistoryResponse(**history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task history: {str(e)}"
        )

@router.get("/statistics", response_model=TaskStatisticsResponse)
async def get_task_statistics(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get comprehensive task statistics for the current user"""
    try:
        statistics = await task_service.get_task_statistics(current_user.id, session)
        return TaskStatisticsResponse(**statistics)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task statistics: {str(e)}"
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
        tasks = await task_service.get_match_tasks(match_id, current_user.id, session)
        
        # Add progress information for each task
        tasks_with_progress = []
        for task in tasks:
            progress = await task_service.get_task_progress(task.id, current_user.id, session)
            task_dict = task.to_dict()
            task_dict.update(progress)
            tasks_with_progress.append(task_dict)
        
        return {
            "match_id": match_id,
            "active_tasks": tasks_with_progress,
            "total_active": len(tasks_with_progress)
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
    difficulty: TaskDifficulty = Query(TaskDifficulty.MEDIUM, description="Task difficulty"),
    category: TaskCategory = Query(TaskCategory.BONDING, description="Task category"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Automatically generate multiple tasks for a match"""
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
        
        # Generate tasks
        generated_tasks = []
        for i in range(count):
            try:
                task = await task_service.generate_task(
                    match_id, 
                    "bonding", 
                    difficulty, 
                    category, 
                    session
                )
                generated_tasks.append(task)
            except Exception as e:
                logger.error(f"Failed to generate task {i+1}: {str(e)}")
                continue
        
        return {
            "match_id": match_id,
            "generated_tasks": generated_tasks,
            "successfully_generated": len(generated_tasks),
            "requested_count": count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error auto-generating tasks: {str(e)}"
        )

@router.post("/matches/{match_id}/conversation-starter")
async def generate_conversation_starter(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Generate an AI-powered conversation starter for a match"""
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
        
        # Generate conversation starter
        starter = await task_service.generate_conversation_starter(
            match_id, session
        )
        
        return {
            "match_id": match_id,
            "conversation_starter": starter,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except AIGenerationError as e:
        # AI generation failed, but we still return a fallback starter
        logger.warning(f"AI conversation starter generation failed: {str(e)}")
        return {
            "match_id": match_id,
            "conversation_starter": f"Hello, my name is {current_user.name}, I am shy and can't think of a cool opening line :( Wanna be friends?",
            "generated_at": datetime.utcnow().isoformat(),
            "ai_fallback": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating conversation starter: {str(e)}"
        ) 

@router.post("/matches/{match_id}/replace-expired", response_model=List[TaskRead])
async def replace_expired_tasks_for_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Replace expired tasks for a specific match"""
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
        
        # Replace expired tasks for the match
        replaced_tasks = await task_service.replace_expired_tasks_for_match(
            match_id, session
        )
        
        return replaced_tasks
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error replacing expired tasks: {str(e)}"
        )

@router.get("/matches/{match_id}/expired", response_model=List[TaskRead])
async def get_expired_tasks_for_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get expired tasks for a specific match"""
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
        
        # Get expired tasks for the match
        expired_tasks = await task_service.get_expired_tasks_for_match(
            match_id, session
        )
        
        return expired_tasks
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting expired tasks: {str(e)}"
        )

@router.post("/{task_id}/replace", response_model=TaskRead)
async def replace_specific_expired_task(
    task_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Replace a specific expired task"""
    try:
        # Verify user has access to the task
        task = await task_service.get_task_details(task_id, current_user.id, session)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Replace the specific expired task
        replacement_task = await task_service.replace_specific_expired_task(
            task_id, session
        )
        
        return replacement_task
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error replacing task: {str(e)}"
        )

@router.post("/replace-all-expired", response_model=Dict[str, Any])
async def replace_all_expired_tasks(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Replace all expired tasks system-wide (admin function)"""
    try:
        # TODO: Add admin role check here
        # For now, allow any authenticated user
        
        # Replace all expired tasks
        await task_service.replace_expired_tasks(session)
        
        return {
            "message": "Expired task replacement completed",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error replacing all expired tasks: {str(e)}"
        ) 