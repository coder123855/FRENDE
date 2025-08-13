import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
    Target, 
    CheckCircle, 
    Clock, 
    RefreshCw, 
    Gift,
    MessageSquare,
    X,
    AlertCircle,
    Info
} from 'lucide-react';

const TaskNotification = ({ 
    notification, 
    onMarkRead, 
    onClose,
    onAction 
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        // Calculate time ago
        const calculateTimeAgo = () => {
            const timestamp = new Date(notification.timestamp);
            const now = new Date();
            const diffInSeconds = Math.floor((now - timestamp) / 1000);
            
            if (diffInSeconds < 60) {
                setTimeAgo('Just now');
            } else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                setTimeAgo(`${minutes}m ago`);
            } else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                setTimeAgo(`${hours}h ago`);
            } else {
                const days = Math.floor(diffInSeconds / 86400);
                setTimeAgo(`${days}d ago`);
            }
        };

        calculateTimeAgo();
        const interval = setInterval(calculateTimeAgo, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [notification.timestamp]);

    const handleClose = () => {
        setIsVisible(false);
        if (onClose) {
            onClose(notification.id);
        }
    };

    const handleMarkRead = () => {
        if (onMarkRead) {
            onMarkRead(notification.id);
        }
    };

    const handleAction = () => {
        if (onAction) {
            onAction(notification);
        }
    };

    const getNotificationStyle = () => {
        switch (notification.type) {
            case 'task_assigned':
                return {
                    icon: <Target className="w-4 h-4" />,
                    color: 'bg-blue-50 border-blue-200 text-blue-800',
                    badgeColor: 'bg-blue-100 text-blue-800'
                };
            case 'task_completed':
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'bg-green-50 border-green-200 text-green-800',
                    badgeColor: 'bg-green-100 text-green-800'
                };
            case 'task_expiring':
                return {
                    icon: <Clock className="w-4 h-4" />,
                    color: 'bg-orange-50 border-orange-200 text-orange-800',
                    badgeColor: 'bg-orange-100 text-orange-800'
                };
            case 'task_replaced':
                return {
                    icon: <RefreshCw className="w-4 h-4" />,
                    color: 'bg-purple-50 border-purple-200 text-purple-800',
                    badgeColor: 'bg-purple-100 text-purple-800'
                };
            case 'task_reward':
                return {
                    icon: <Gift className="w-4 h-4" />,
                    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                    badgeColor: 'bg-yellow-100 text-yellow-800'
                };
            case 'task_submission':
                return {
                    icon: <MessageSquare className="w-4 h-4" />,
                    color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                    badgeColor: 'bg-indigo-100 text-indigo-800'
                };
            default:
                return {
                    icon: <Info className="w-4 h-4" />,
                    color: 'bg-gray-50 border-gray-200 text-gray-800',
                    badgeColor: 'bg-gray-100 text-gray-800'
                };
        }
    };

    const getNotificationMessage = () => {
        switch (notification.type) {
            case 'task_assigned':
                return `New task assigned: ${notification.title}`;
            case 'task_completed':
                return `Task completed: ${notification.title}`;
            case 'task_expiring':
                return `Task expiring soon: ${notification.title}`;
            case 'task_replaced':
                return `Task replaced: ${notification.title}`;
            case 'task_reward':
                return `Reward earned: ${notification.title}`;
            case 'task_submission':
                return `Task submission received: ${notification.title}`;
            default:
                return notification.title;
        }
    };

    const getActionButton = () => {
        switch (notification.type) {
            case 'task_assigned':
                return (
                    <Button size="sm" variant="outline" onClick={handleAction}>
                        View Task
                    </Button>
                );
            case 'task_expiring':
                return (
                    <Button size="sm" variant="outline" onClick={handleAction}>
                        Complete Now
                    </Button>
                );
            case 'task_completed':
                return (
                    <Button size="sm" variant="outline" onClick={handleAction}>
                        View Reward
                    </Button>
                );
            default:
                return null;
        }
    };

    const style = getNotificationStyle();

    if (!isVisible) return null;

    return (
        <Card className={`border ${style.color} mb-3 transition-all duration-200 hover:shadow-md`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                            {style.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={`text-xs ${style.badgeColor}`}>
                                    {notification.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                                
                                {!notification.is_read && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                )}
                                
                                <span className="text-xs text-gray-500 ml-auto">
                                    {timeAgo}
                                </span>
                            </div>
                            
                            <h4 className="font-medium text-sm mb-1">
                                {getNotificationMessage()}
                            </h4>
                            
                            {notification.description && (
                                <p className="text-sm text-gray-600 mb-2">
                                    {notification.description}
                                </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                {notification.reward_coins && (
                                    <span className="flex items-center gap-1">
                                        <Gift className="w-3 h-3" />
                                        {notification.reward_coins} coins
                                    </span>
                                )}
                                
                                {notification.hours_remaining && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {notification.hours_remaining}h remaining
                                    </span>
                                )}
                                
                                {notification.due_date && (
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Due: {new Date(notification.due_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                        {getActionButton()}
                        
                        {!notification.is_read && (
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleMarkRead}
                                className="text-xs"
                            >
                                Mark Read
                            </Button>
                        )}
                        
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={handleClose}
                            className="text-xs"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TaskNotification; 