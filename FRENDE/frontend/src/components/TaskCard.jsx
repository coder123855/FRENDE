import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Coins
} from 'lucide-react';
import TaskExpirationTimer from './TaskExpirationTimer';
import { useOfflineState } from '../hooks/useOffline.js';

const TaskCard = ({ 
  task, 
  onComplete, 
  onReplace, 
  onViewDetails, 
  isExpired = false,
  showProgress = true,
  className = '' 
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const { isOnline } = useOfflineState();

  const handleComplete = async () => {
    if (!onComplete) return;
    
    setIsCompleting(true);
    try {
      await onComplete(task.id);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReplace = async () => {
    if (!onReplace) return;
    
    setIsReplacing(true);
    try {
      await onReplace(task.id);
    } catch (error) {
      console.error('Failed to replace task:', error);
    } finally {
      setIsReplacing(false);
    }
  };

  const getStatusIcon = () => {
    if (task.is_completed) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (task.is_expired) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    if (task.progress_percentage > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
    return <Clock className="w-5 h-5 text-gray-600" />;
  };

  const getStatusText = () => {
    if (task.is_completed) {
      return 'Completed';
    }
    if (task.is_expired) {
      return 'Expired';
    }
    if (task.progress_percentage > 0) {
      return 'In Progress';
    }
    return 'Pending';
  };

  const getStatusColor = () => {
    if (task.is_completed) {
      return 'bg-green-100 text-green-800';
    }
    if (task.is_expired) {
      return 'bg-red-100 text-red-800';
    }
    if (task.progress_percentage > 0) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const isOfflineTask = task.isOffline;
  const canComplete = !task.is_completed && !task.is_expired && (isOnline || isOfflineTask);
  const canReplace = task.is_expired && isOnline;

  return (
    <Card className={`${className} ${isOfflineTask ? 'border-orange-200 bg-orange-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg font-semibold">
              {task.title}
            </CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Offline indicator */}
            {isOfflineTask && (
              <Badge variant="outline" className="flex items-center space-x-1 text-orange-600 border-orange-300">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </Badge>
            )}
            
            {/* Online indicator */}
            {!isOfflineTask && !isOnline && (
              <Badge variant="outline" className="flex items-center space-x-1 text-gray-600">
                <Wifi className="w-3 h-3" />
                <span>Cached</span>
              </Badge>
            )}
            
            {/* Status badge */}
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Task description */}
        <p className="text-gray-700 leading-relaxed">
          {task.description}
        </p>

        {/* Task metadata */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            {task.coin_reward && (
              <div className="flex items-center space-x-1">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span>{task.coin_reward} coins</span>
              </div>
            )}
            
            {task.difficulty && (
              <span className="capitalize">Difficulty: {task.difficulty}</span>
            )}
            
            {task.task_type && (
              <span className="capitalize">Type: {task.task_type}</span>
            )}
          </div>
          
          {task.ai_generated && (
            <Badge variant="secondary" className="text-xs">
              AI Generated
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && task.progress_percentage !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{task.progress_percentage}%</span>
            </div>
            <Progress value={task.progress_percentage} className="h-2" />
          </div>
        )}

        {/* Expiration timer */}
        {!task.is_completed && !task.is_expired && task.expires_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Expires in:</span>
            <TaskExpirationTimer 
              expiresAt={task.expires_at} 
              onExpire={() => {
                if (onReplace) onReplace(task.id);
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center space-x-2 pt-2">
          {canComplete && (
            <Button 
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex-1"
              size="sm"
            >
              {isCompleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                'Complete Task'
              )}
            </Button>
          )}
          
          {canReplace && (
            <Button 
              onClick={handleReplace}
              disabled={isReplacing}
              variant="outline"
              size="sm"
            >
              {isReplacing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Replacing...
                </>
              ) : (
                'Replace Task'
              )}
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              onClick={() => onViewDetails(task)}
              variant="ghost"
              size="sm"
            >
              View Details
            </Button>
          )}
        </div>

        {/* Offline completion notice */}
        {isOfflineTask && !task.is_completed && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2 text-orange-800">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                Task completion will be synced when you're back online
              </span>
            </div>
          </div>
        )}

        {/* Network status notice */}
        {!isOnline && !isOfflineTask && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 text-gray-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">
                Showing cached data. Some features may be limited.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard; 