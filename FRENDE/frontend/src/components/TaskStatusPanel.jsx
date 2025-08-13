import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
    Target, 
    Clock, 
    Gift, 
    CheckCircle, 
    AlertCircle,
    Send,
    Users,
    Calendar,
    TrendingUp
} from 'lucide-react';

const TaskStatusPanel = ({ 
    taskStatus, 
    onSubmitTask, 
    onViewTask,
    onCompleteTask,
    isLoading = false 
}) => {
    const [showDetails, setShowDetails] = useState(false);

    if (!taskStatus?.has_active_task) {
        return (
            <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-4 text-center">
                    <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">No active task</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Tasks will appear here when assigned
                    </p>
                </CardContent>
            </Card>
        );
    }

    const task = taskStatus.task;
    const submissions = taskStatus.submissions;
    const progress = (submissions?.count || 0) / 2 * 100; // Assuming 2 users per match
    const timeRemaining = taskStatus.time_remaining;

    const formatTimeRemaining = (seconds) => {
        if (!seconds) return null;
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    const getTimeRemainingColor = (seconds) => {
        if (!seconds) return 'text-gray-500';
        if (seconds < 3600) return 'text-red-500'; // Less than 1 hour
        if (seconds < 7200) return 'text-orange-500'; // Less than 2 hours
        return 'text-green-500';
    };

    const isExpiringSoon = timeRemaining && timeRemaining < 3600; // Less than 1 hour

    return (
        <Card className="border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4" />
                        Current Task
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs"
                    >
                        {showDetails ? 'Hide' : 'Details'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {/* Task Title and Description */}
                <div className="mb-4">
                    <h3 className="font-medium text-sm mb-1">{task.title}</h3>
                    {showDetails && (
                        <p className="text-xs text-gray-600 mb-3">{task.description}</p>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs font-medium">
                            {submissions?.count || 0}/2 completed
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center gap-2 mt-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                            {submissions?.user_ids?.length || 0} users submitted
                        </span>
                    </div>
                </div>

                {/* Task Info */}
                <div className="space-y-2 mb-4">
                    {task.reward_coins && (
                        <div className="flex items-center gap-2">
                            <Gift className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">
                                {task.reward_coins} coins reward
                            </span>
                        </div>
                    )}
                    
                    {timeRemaining && (
                        <div className="flex items-center gap-2">
                            <Clock className={`w-3 h-3 ${getTimeRemainingColor(timeRemaining)}`} />
                            <span className={`text-xs ${getTimeRemainingColor(timeRemaining)}`}>
                                {formatTimeRemaining(timeRemaining)} remaining
                            </span>
                            {isExpiringSoon && (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                        </div>
                    )}
                    
                    {task.due_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => onSubmitTask(task)}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        <Send className="w-3 h-3 mr-1" />
                        Submit
                    </Button>
                    
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCompleteTask(task.id)}
                        disabled={isLoading}
                    >
                        <CheckCircle className="w-3 h-3" />
                    </Button>
                    
                    {showDetails && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewTask(task)}
                        >
                            View
                        </Button>
                    )}
                </div>

                {/* Status Indicators */}
                {showDetails && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-green-500" />
                                <span className="text-gray-600">Progress</span>
                                <Badge variant="outline" className="ml-auto">
                                    {Math.round(progress)}%
                                </Badge>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-500" />
                                <span className="text-gray-600">Submissions</span>
                                <Badge variant="outline" className="ml-auto">
                                    {submissions?.count || 0}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warning for expiring tasks */}
                {isExpiringSoon && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                            <span className="text-xs text-orange-700">
                                Task expires soon! Complete it before the deadline.
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TaskStatusPanel; 