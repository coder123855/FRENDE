import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Trophy, Sparkles, CheckCircle, AlertCircle, PlayCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const TaskSidebar = ({ 
  tasks, 
  progress, 
  onComplete, 
  onViewDetails,
  currentUserId,
  isCollapsed = false,
  onToggleCollapse 
}) => {
  const [expandedTask, setExpandedTask] = useState(null);

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(task => task.is_completed).length,
    inProgress: tasks.filter(task => !task.is_completed && progress?.[task.id]?.progress_percentage > 0).length,
    expired: tasks.filter(task => task.is_expired && !task.is_completed).length,
  };

  // Get status icon
  const getStatusIcon = (task) => {
    const isCompleted = task.is_completed;
    const isExpired = task.is_expired && !isCompleted;
    const isInProgress = !isCompleted && progress?.[task.id]?.progress_percentage > 0;

    if (isCompleted) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (isExpired) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (isInProgress) return <PlayCircle className="w-4 h-4 text-blue-500" />;
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format time remaining
  const formatTimeRemaining = (task) => {
    if (!task.expires_at) return null;
    
    const now = new Date();
    const expiresAt = new Date(task.expires_at);
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col">
        <Button
          onClick={onToggleCollapse}
          variant="ghost"
          size="sm"
          className="h-12 w-12 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 flex flex-col items-center justify-center space-y-2">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{taskStats.total}</div>
            <div className="text-xs text-gray-500">Tasks</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-semibold text-green-600">{taskStats.completed}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <Button
            onClick={onToggleCollapse}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{taskStats.total}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-xs text-green-600">Done</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-600">{taskStats.inProgress}</div>
            <div className="text-xs text-yellow-600">Active</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-lg font-bold text-red-600">{taskStats.expired}</div>
            <div className="text-xs text-red-600">Expired</div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">No tasks yet</div>
            <div className="text-sm">Tasks will appear here when generated</div>
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.is_completed;
            const isExpired = task.is_expired && !isCompleted;
            const timeRemaining = formatTimeRemaining(task);
            const taskProgress = progress?.[task.id];

            return (
              <Card 
                key={task.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isCompleted ? 'border-green-200 bg-green-50' : 
                  isExpired ? 'border-red-200 bg-red-50' : 
                  'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(task)}
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                          {task.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getDifficultyColor(task.difficulty)}`}>
                          {task.difficulty || 'medium'}
                        </Badge>
                        
                        {task.ai_generated && (
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        )}
                        
                        {timeRemaining && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span className={isExpired ? 'text-red-600' : ''}>
                              {timeRemaining}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      <span>{task.final_coin_reward || task.base_coin_reward}</span>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Content */}
                {expandedTask === task.id && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        {task.description}
                      </p>
                      
                      {/* Progress Bar */}
                      {!isCompleted && taskProgress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Progress</span>
                            <span>{taskProgress.progress_percentage || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${taskProgress.progress_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {!isCompleted && !isExpired && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onComplete(task.id, {
                                text: `Task completed by user ${currentUserId}`,
                                evidence: null
                              });
                            }}
                            size="sm"
                            className="flex-1"
                          >
                            Complete
                          </Button>
                        )}
                        
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(task);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskSidebar; 