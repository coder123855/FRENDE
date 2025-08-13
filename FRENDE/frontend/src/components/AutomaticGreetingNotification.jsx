import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
    Zap, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    X,
    MessageCircle
} from 'lucide-react';

const AutomaticGreetingNotification = ({ 
    matchId, 
    onClose,
    type = 'info',
    message = '',
    countdown = null,
    showActions = true
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [timeLeft, setTimeLeft] = useState(countdown);

    useEffect(() => {
        if (countdown && countdown > 0) {
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [countdown]);

    const handleClose = () => {
        setIsVisible(false);
        if (onClose) {
            onClose();
        }
    };

    const getNotificationStyle = () => {
        switch (type) {
            case 'timeout':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'timeout':
                return <AlertCircle className="w-4 h-4" />;
            case 'success':
                return <CheckCircle className="w-4 h-4" />;
            case 'warning':
                return <Clock className="w-4 h-4" />;
            default:
                return <Zap className="w-4 h-4" />;
        }
    };

    if (!isVisible) return null;

    return (
        <Card className={`border ${getNotificationStyle()} mb-4`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Automatic Greeting</span>
                                {timeLeft !== null && timeLeft > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </Badge>
                                )}
                            </div>
                            {message && (
                                <p className="text-sm mt-1">{message}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {showActions && type === 'warning' && (
                            <Button size="sm" variant="outline" className="text-xs">
                                <MessageCircle className="w-3 h-3 mr-1" />
                                Send Now
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

export default AutomaticGreetingNotification; 