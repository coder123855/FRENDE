import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List
import time

from core.database import get_async_session
from services.tasks import task_service
from services.automatic_greeting import automatic_greeting_service
from services.conversation_starter import conversation_starter_service

logger = logging.getLogger(__name__)

class BackgroundTaskProcessor:
    """Handles background tasks and maintenance operations"""
    
    def __init__(self):
        self.is_running = False
        self.task_replacement_interval = 300  # 5 minutes for task replacement
        self.greeting_timeout_interval = 30   # 30 seconds for greeting timeout check
        self.conversation_starter_interval = 60  # 1 minute for conversation starter checks
        
    def start_background_tasks(self):
        """Start all background tasks"""
        if self.is_running:
            logger.warning("Background tasks already running")
            return
        
        self.is_running = True
        logger.info("Starting background tasks...")
        
        # Start task replacement maintenance
        asyncio.create_task(self._task_replacement_maintenance())
        
        # Start automatic greeting timeout checking
        asyncio.create_task(self._automatic_greeting_maintenance())
        
        # Start conversation starter maintenance
        asyncio.create_task(self._conversation_starter_maintenance())
        
        logger.info("Background tasks started successfully")
    
    def stop_background_tasks(self):
        """Stop all background tasks"""
        self.is_running = False
        logger.info("Background tasks stopped")
    
    async def _task_replacement_maintenance(self):
        """Maintenance task for replacing expired tasks"""
        while self.is_running:
            try:
                logger.debug("Running task replacement maintenance...")
                
                async with get_async_session() as session:
                    # Replace expired tasks
                    await task_service.replace_expired_tasks(session)
                
                logger.debug("Task replacement maintenance completed")
                
            except Exception as e:
                logger.error(f"Error in task replacement maintenance: {str(e)}")
            
            # Wait for next interval
            await asyncio.sleep(self.task_replacement_interval)
    
    async def _automatic_greeting_maintenance(self):
        """Maintenance task for checking and handling automatic greetings"""
        while self.is_running:
            try:
                logger.debug("Running automatic greeting maintenance...")
                
                async with get_async_session() as session:
                    # Check for timed out conversation starters and send automatic greetings
                    handled_greetings = await automatic_greeting_service.check_and_handle_timeouts(session)
                    
                    if handled_greetings:
                        logger.info(f"Handled {len(handled_greetings)} automatic greetings")
                        for greeting in handled_greetings:
                            logger.info(f"Sent automatic greeting for match {greeting['match_id']}")
                
                logger.debug("Automatic greeting maintenance completed")
                
            except Exception as e:
                logger.error(f"Error in automatic greeting maintenance: {str(e)}")
            
            # Wait for next interval
            await asyncio.sleep(self.greeting_timeout_interval)
    
    async def _conversation_starter_maintenance(self):
        """Maintenance task for conversation starter management"""
        while self.is_running:
            try:
                logger.debug("Running conversation starter maintenance...")
                
                async with get_async_session() as session:
                    # Check for pending timeouts
                    pending_timeouts = await automatic_greeting_service.get_pending_timeouts(session)
                    
                    if pending_timeouts:
                        logger.info(f"Found {len(pending_timeouts)} pending timeouts")
                        for timeout in pending_timeouts:
                            logger.info(f"Match {timeout['match_id']} is {timeout['minutes_overdue']} minutes overdue")
                
                logger.debug("Conversation starter maintenance completed")
                
            except Exception as e:
                logger.error(f"Error in conversation starter maintenance: {str(e)}")
            
            # Wait for next interval
            await asyncio.sleep(self.conversation_starter_interval)
    
    async def run_manual_maintenance(self) -> Dict:
        """Run maintenance tasks manually and return results"""
        results = {
            "task_replacement": {"success": False, "message": ""},
            "automatic_greeting": {"success": False, "message": ""},
            "conversation_starter": {"success": False, "message": ""}
        }
        
        try:
            async with get_async_session() as session:
                # Task replacement
                try:
                    await task_service.replace_expired_tasks(session)
                    results["task_replacement"]["success"] = True
                    results["task_replacement"]["message"] = "Task replacement completed successfully"
                except Exception as e:
                    results["task_replacement"]["message"] = f"Task replacement failed: {str(e)}"
                
                # Automatic greeting
                try:
                    handled_greetings = await automatic_greeting_service.check_and_handle_timeouts(session)
                    results["automatic_greeting"]["success"] = True
                    results["automatic_greeting"]["message"] = f"Handled {len(handled_greetings)} automatic greetings"
                except Exception as e:
                    results["automatic_greeting"]["message"] = f"Automatic greeting failed: {str(e)}"
                
                # Conversation starter
                try:
                    pending_timeouts = await automatic_greeting_service.get_pending_timeouts(session)
                    results["conversation_starter"]["success"] = True
                    results["conversation_starter"]["message"] = f"Found {len(pending_timeouts)} pending timeouts"
                except Exception as e:
                    results["conversation_starter"]["message"] = f"Conversation starter check failed: {str(e)}"
            
        except Exception as e:
            logger.error(f"Error in manual maintenance: {str(e)}")
        
        return results

# Global background task processor instance
background_processor = BackgroundTaskProcessor() 