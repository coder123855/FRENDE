import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ListTodo, 
  MessageSquare, 
  User, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { useOfflineActions } from '../../hooks/useOffline.js';

const OfflineActions = ({ className = '' }) => {
  const { 
    actions, 
    pendingActions, 
    completedActions, 
    failedActions, 
    loading, 
    error,
    updateAction, 
    removeAction 
  } = useOfflineActions();
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedAction, setExpandedAction] = useState(null);

  const getActionIcon = (type) => {
    switch (type) {
      case 'task':
        return <ListTodo className="w-4 h-4" />;
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'userProfile':
        return <User className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const getActionStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getFilteredActions = () => {
    switch (selectedFilter) {
      case 'pending':
        return pendingActions;
      case 'completed':
        return completedActions;
      case 'failed':
        return failedActions;
      default:
        return actions;
    }
  };

  const handleRetryAction = async (actionId) => {
    try {
      await updateAction(actionId, { 
        status: 'pending', 
        retryCount: 0,
        lastError: null,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to retry action:', error);
    }
  };

  const handleRemoveAction = async (actionId) => {
    try {
      await removeAction(actionId);
    } catch (error) {
      console.error('Failed to remove action:', error);
    }
  };

  const toggleActionExpansion = (actionId) => {
    setExpandedAction(expandedAction === actionId ? null : actionId);
  };

  const filteredActions = getFilteredActions();

  if (actions.length === 0) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2" />
            <p>No offline actions</p>
            <p className="text-sm">Actions will appear here when you perform operations while offline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Offline Actions</span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{actions.length} total</Badge>
            {pendingActions.length > 0 && (
              <Badge variant="secondary">{pendingActions.length} pending</Badge>
            )}
            {failedActions.length > 0 && (
              <Badge variant="destructive">{failedActions.length} failed</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-1 border-b">
          {[
            { key: 'all', label: 'All', count: actions.length },
            { key: 'pending', label: 'Pending', count: pendingActions.length },
            { key: 'completed', label: 'Completed', count: completedActions.length },
            { key: 'failed', label: 'Failed', count: failedActions.length }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                selectedFilter === filter.key
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {filter.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Actions List */}
        <div className="space-y-2">
          {filteredActions.map((action) => (
            <div
              key={action.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getActionIcon(action.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {action.type} {action.action}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getActionStatusColor(action.status)}`}
                      >
                        {action.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                      <span>{formatTimestamp(action.timestamp)}</span>
                      {action.retryCount > 0 && (
                        <span>Retries: {action.retryCount}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getActionStatusIcon(action.status)}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActionExpansion(action.id)}
                  >
                    {expandedAction === action.id ? 'Hide' : 'Details'}
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedAction === action.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  {/* Action Data */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Action Data</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(action.data, null, 2)}
                    </pre>
                  </div>

                  {/* Error Information */}
                  {action.lastError && (
                    <div>
                      <h4 className="text-xs font-medium text-red-700 mb-1">Error</h4>
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {action.lastError}
                      </p>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex space-x-2">
                    {action.status === 'failed' && (
                      <Button
                        size="sm"
                        onClick={() => handleRetryAction(action.id)}
                        disabled={loading}
                        className="flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Retry</span>
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAction(action.id)}
                      disabled={loading}
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredActions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">
              {selectedFilter === 'pending' && <Clock className="w-8 h-8 mx-auto" />}
              {selectedFilter === 'completed' && <CheckCircle className="w-8 h-8 mx-auto" />}
              {selectedFilter === 'failed' && <AlertTriangle className="w-8 h-8 mx-auto" />}
            </div>
            <p>No {selectedFilter} actions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineActions;
