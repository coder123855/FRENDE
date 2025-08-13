import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { 
  CheckCircle, 
  Clock, 
  Users, 
  User, 
  Award, 
  AlertTriangle,
  Play,
  Pause,
  Target
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const TaskProgress = ({ task, onComplete, onUpdate }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [userCompleted, setUserCompleted] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (task) {
      updateProgress();
      startTimer();
    }
  }, [task]);

  const updateProgress = () => {
    if (!task) return;

    const userCompleted = task.completed_by_user1 || task.completed_by_user2;
    const partnerCompleted = task.completed_by_user1 && task.completed_by_user2;
    
    setUserCompleted(userCompleted);
    setPartnerCompleted(partnerCompleted);
    
    // Calculate progress percentage
    let completedCount = 0;
    if (task.completed_by_user1) completedCount++;
    if (task.completed_by_user2) completedCount++;
    
    const progressPercentage = (completedCount / 2) * 100;
    setProgress(progressPercentage);
  };

  const startTimer = () => {
    if (!task.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expirationTime = new Date(task.expires_at).getTime();
      const remaining = expirationTime - now;

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(0);
      } else {
        setIsExpired(false);
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  };

  const formatTimeRemaining = (milliseconds) => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgressColor = () => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (isExpired) return 'bg-red-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    if (progress === 100) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (isExpired) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (progress > 0) return <Play className="w-5 h-5 text-blue-600" />;
    return <Pause className="w-5 h-5 text-gray-600" />;
  };

  const getStatusText = () => {
    if (progress === 100) return 'Completed';
    if (isExpired) return 'Expired';
    if (progress > 0) return 'In Progress';
    return 'Not Started';
  };

  const handleComplete = async () => {
    if (!user || !task) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_text: 'Task completed',
          submission_evidence: null
        })
      });

      if (response.ok) {
        const result = await response.json();
        setUserCompleted(true);
        updateProgress();
        
        if (onComplete) {
          onComplete(task, result);
        }
        
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'bonding': return 'bg-blue-100 text-blue-800';
      case 'social': return 'bg-purple-100 text-purple-800';
      case 'creative': return 'bg-pink-100 text-pink-800';
      case 'physical': return 'bg-orange-100 text-orange-800';
      case 'mental': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!task) return null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon()}
              {task.title}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              {task.final_coin_reward || task.base_coin_reward} coins
            </Badge>
            {task.difficulty && (
              <Badge className={getDifficultyColor(task.difficulty)}>
                {task.difficulty}
              </Badge>
            )}
            {task.category && (
              <Badge className={getCategoryColor(task.category)}>
                {task.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{getStatusText()}</span>
            <span>{formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>

        {/* Completion Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">You</span>
              {userCompleted ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Partner</span>
              {partnerCompleted ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
          
          {!userCompleted && !isExpired && (
            <Button 
              onClick={handleComplete}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Target className="w-4 h-4 mr-1" />
              Complete
            </Button>
          )}
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
          </div>
          {task.completed_at && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Warning for expired tasks */}
        {isExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">This task has expired</span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              You can still complete it, but it won't count towards rewards.
            </p>
          </div>
        )}

        {/* Completion celebration */}
        {progress === 100 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Task completed!</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Both you and your partner completed this task. Great teamwork!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskProgress; 