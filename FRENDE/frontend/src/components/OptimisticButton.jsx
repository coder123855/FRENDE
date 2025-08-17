import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import OptimisticUpdateIndicator from './OptimisticUpdateIndicator';

const OptimisticButton = ({
    children,
    onClick,
    optimisticId,
    optimisticData,
    rollbackFn,
    onSuccess,
    onError,
    onConflict,
    loadingText = 'Loading...',
    successText = 'Success!',
    errorText = 'Error occurred',
    showIndicator = true,
    autoReset = true,
    resetDelay = 2000,
    disabled = false,
    className = '',
    variant = 'default',
    size = 'default',
    ...buttonProps
}) => {
    const [localState, setLocalState] = useState('idle');
    const [updateId, setUpdateId] = useState(null);
    
    const optimisticUpdate = useOptimisticUpdate({ type: 'immediate' });

    const handleClick = useCallback(async (event) => {
        if (disabled || localState === 'loading') return;

        // If no optimistic update is configured, just call onClick
        if (!optimisticId || !optimisticData || !rollbackFn) {
            if (onClick) {
                await onClick(event);
            }
            return;
        }

        setLocalState('loading');

        // Create optimistic update
        const id = optimisticUpdate.createUpdate(
            optimisticId,
            optimisticData,
            rollbackFn,
            {
                onSuccess: (result) => {
                    setLocalState('success');
                    if (onSuccess) {
                        onSuccess(result);
                    }
                    if (autoReset) {
                        setTimeout(() => {
                            setLocalState('idle');
                        }, resetDelay);
                    }
                },
                onError: (error) => {
                    setLocalState('error');
                    if (onError) {
                        onError(error);
                    }
                    if (autoReset) {
                        setTimeout(() => {
                            setLocalState('idle');
                        }, resetDelay);
                    }
                },
                onConflict: (serverData, optimisticData) => {
                    setLocalState('conflict');
                    if (onConflict) {
                        onConflict(serverData, optimisticData);
                    }
                    if (autoReset) {
                        setTimeout(() => {
                            setLocalState('idle');
                        }, resetDelay);
                    }
                }
            }
        );

        setUpdateId(id);

        // Call the actual onClick function
        try {
            if (onClick) {
                await onClick(event);
                optimisticUpdate.markSuccess(id, optimisticData);
            }
        } catch (error) {
            optimisticUpdate.markFailure(id, error);
        }
    }, [
        disabled,
        localState,
        optimisticId,
        optimisticData,
        rollbackFn,
        onClick,
        onSuccess,
        onError,
        onConflict,
        autoReset,
        resetDelay,
        optimisticUpdate
    ]);

    const getButtonContent = () => {
        switch (localState) {
            case 'loading':
                return (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {loadingText}
                    </>
                );
            case 'success':
                return (
                    <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {successText}
                    </>
                );
            case 'error':
                return (
                    <>
                        <XCircle className="h-4 w-4 mr-2" />
                        {errorText}
                    </>
                );
            default:
                return children;
        }
    };

    const getButtonVariant = () => {
        switch (localState) {
            case 'success':
                return 'default';
            case 'error':
                return 'destructive';
            case 'conflict':
                return 'outline';
            default:
                return variant;
        }
    };

    const isDisabled = disabled || localState === 'loading';

    return (
        <div className="relative">
            <Button
                onClick={handleClick}
                disabled={isDisabled}
                variant={getButtonVariant()}
                size={size}
                className={className}
                {...buttonProps}
            >
                {getButtonContent()}
            </Button>
            
            {showIndicator && updateId && (
                <div className="absolute -top-8 left-0">
                    <OptimisticUpdateIndicator
                        updateId={updateId}
                        type="inline"
                        showDetails={false}
                        autoDismiss={false}
                        className="text-xs"
                    />
                </div>
            )}
        </div>
    );
};

// Specialized optimistic button variants
export const OptimisticSubmitButton = ({ 
    formId, 
    optimisticData, 
    rollbackFn, 
    ...props 
}) => {
    const handleClick = useCallback(async (event) => {
        event.preventDefault();
        const form = document.getElementById(formId);
        if (form) {
            form.requestSubmit();
        }
    }, [formId]);

    return (
        <OptimisticButton
            type="submit"
            onClick={handleClick}
            optimisticData={optimisticData}
            rollbackFn={rollbackFn}
            {...props}
        />
    );
};

export const OptimisticActionButton = ({ 
    action, 
    optimisticData, 
    rollbackFn, 
    ...props 
}) => {
    return (
        <OptimisticButton
            onClick={action}
            optimisticData={optimisticData}
            rollbackFn={rollbackFn}
            {...props}
        />
    );
};

export const OptimisticToggleButton = ({ 
    isActive, 
    onToggle, 
    optimisticData, 
    rollbackFn, 
    activeText = 'Active',
    inactiveText = 'Inactive',
    ...props 
}) => {
    const handleToggle = useCallback(async () => {
        if (onToggle) {
            await onToggle(!isActive);
        }
    }, [onToggle, isActive]);

    const currentData = {
        ...optimisticData,
        isActive: !isActive
    };

    const currentRollbackFn = () => {
        rollbackFn();
        if (onToggle) {
            onToggle(isActive);
        }
    };

    return (
        <OptimisticButton
            onClick={handleToggle}
            optimisticData={currentData}
            rollbackFn={currentRollbackFn}
            variant={isActive ? 'default' : 'outline'}
            {...props}
        >
            {isActive ? activeText : inactiveText}
        </OptimisticButton>
    );
};

export default OptimisticButton;
