import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
    Loader2, 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    RefreshCw,
    Clock
} from 'lucide-react';
import { useOptimistic } from '../contexts/OptimisticContext';

const OptimisticUpdateIndicator = ({ 
    updateId, 
    type = 'default',
    showDetails = false,
    autoDismiss = true,
    dismissDelay = 3000,
    className = ''
}) => {
    const { isPending, getUpdateStatus, pendingUpdates } = useOptimistic();
    const [isVisible, setIsVisible] = useState(true);
    const [status, setStatus] = useState('pending');

    useEffect(() => {
        if (updateId) {
            setStatus(getUpdateStatus(updateId) || 'pending');
        }
    }, [updateId, getUpdateStatus]);

    useEffect(() => {
        if (autoDismiss && status === 'success') {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, dismissDelay);
            return () => clearTimeout(timer);
        }
    }, [status, autoDismiss, dismissDelay]);

    useEffect(() => {
        // Listen for status changes
        const handleStatusChange = (event) => {
            if (event.detail.id === updateId) {
                setStatus(event.detail.status);
            }
        };

        window.addEventListener('optimistic-update-status', handleStatusChange);
        return () => {
            window.removeEventListener('optimistic-update-status', handleStatusChange);
        };
    }, [updateId]);

    if (!isVisible) return null;

    const getStatusConfig = () => {
        switch (status) {
            case 'pending':
                return {
                    icon: <Loader2 className="h-4 w-4 animate-spin" />,
                    text: 'Updating...',
                    variant: 'secondary',
                    className: 'bg-blue-50 border-blue-200 text-blue-800'
                };
            case 'retrying':
                return {
                    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
                    text: 'Retrying...',
                    variant: 'secondary',
                    className: 'bg-yellow-50 border-yellow-200 text-yellow-800'
                };
            case 'success':
                return {
                    icon: <CheckCircle className="h-4 w-4" />,
                    text: 'Updated successfully',
                    variant: 'default',
                    className: 'bg-green-50 border-green-200 text-green-800'
                };
            case 'failed':
                return {
                    icon: <XCircle className="h-4 w-4" />,
                    text: 'Update failed',
                    variant: 'destructive',
                    className: 'bg-red-50 border-red-200 text-red-800'
                };
            case 'conflict':
                return {
                    icon: <AlertTriangle className="h-4 w-4" />,
                    text: 'Conflict detected',
                    variant: 'outline',
                    className: 'bg-orange-50 border-orange-200 text-orange-800'
                };
            default:
                return {
                    icon: <Clock className="h-4 w-4" />,
                    text: 'Processing...',
                    variant: 'secondary',
                    className: 'bg-gray-50 border-gray-200 text-gray-800'
                };
        }
    };

    const config = getStatusConfig();

    const handleDismiss = () => {
        setIsVisible(false);
    };

    const handleRetry = () => {
        // This would trigger a retry of the failed update
        // Implementation depends on the specific update type
        console.log('Retry requested for update:', updateId);
    };

    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${config.className} ${className}`}>
            {config.icon}
            <span className="text-sm font-medium">{config.text}</span>
            
            {showDetails && updateId && (
                <Badge variant="outline" className="text-xs">
                    {updateId}
                </Badge>
            )}
            
            {status === 'failed' && (
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleRetry}
                    className="h-6 px-2 text-xs"
                >
                    Retry
                </Button>
            )}
            
            {status === 'success' && autoDismiss && (
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDismiss}
                    className="h-6 px-2 text-xs"
                >
                    Dismiss
                </Button>
            )}
        </div>
    );
};

// Global optimistic update indicator
export const GlobalOptimisticIndicator = () => {
    const { pendingUpdates, hasPendingUpdates } = useOptimistic();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(hasPendingUpdates);
    }, [hasPendingUpdates]);

    if (!isVisible) return null;

    const pendingCount = pendingUpdates.length;

    return (
        <div className="fixed top-4 right-4 z-50">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                        {pendingCount} update{pendingCount !== 1 ? 's' : ''} pending
                    </span>
                </div>
                
                {pendingCount > 0 && (
                    <div className="mt-2 space-y-1">
                        {pendingUpdates.slice(0, 3).map((update) => (
                            <OptimisticUpdateIndicator
                                key={update.id}
                                updateId={update.id}
                                type="compact"
                                showDetails={false}
                                autoDismiss={false}
                                className="text-xs"
                            />
                        ))}
                        {pendingCount > 3 && (
                            <div className="text-xs text-blue-600">
                                +{pendingCount - 3} more...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Inline optimistic update indicator
export const InlineOptimisticIndicator = ({ updateId, className = '' }) => {
    return (
        <OptimisticUpdateIndicator
            updateId={updateId}
            type="inline"
            showDetails={false}
            autoDismiss={true}
            className={className}
        />
    );
};

// Toast-style optimistic update indicator
export const ToastOptimisticIndicator = ({ updateId, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleDismiss = () => {
        setIsVisible(false);
        if (onDismiss) {
            onDismiss();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <OptimisticUpdateIndicator
                updateId={updateId}
                type="toast"
                showDetails={true}
                autoDismiss={true}
                className="shadow-lg"
            />
        </div>
    );
};

export default OptimisticUpdateIndicator;
