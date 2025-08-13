import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { RefreshCw, CheckCircle, Clock, AlertTriangle, Database, MessageSquare, ListTodo, User } from 'lucide-react';
import { useSync } from '../../hooks/useOffline.js';

const SyncProgress = ({ className = '' }) => {
  const { syncStatus } = useSync();
  const { syncInProgress, syncProgress, pendingActions, pendingSyncItems } = syncStatus;

  const syncSteps = [
    {
      id: 'tasks',
      name: 'Tasks',
      icon: ListTodo,
      description: 'Syncing task data',
      status: syncInProgress ? 'in-progress' : 'completed'
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: MessageSquare,
      description: 'Syncing chat messages',
      status: syncInProgress ? 'in-progress' : 'completed'
    },
    {
      id: 'chatRooms',
      name: 'Chat Rooms',
      icon: MessageSquare,
      description: 'Syncing chat rooms',
      status: syncInProgress ? 'in-progress' : 'completed'
    },
    {
      id: 'userProfile',
      name: 'User Profile',
      icon: User,
      description: 'Syncing user profile',
      status: syncInProgress ? 'in-progress' : 'completed'
    },
    {
      id: 'queue',
      name: 'Sync Queue',
      icon: Database,
      description: 'Processing pending actions',
      status: pendingSyncItems > 0 ? 'pending' : 'completed'
    }
  ];

  const getStepIcon = (step) => {
    const IconComponent = step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <IconComponent className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!syncInProgress && pendingActions === 0 && pendingSyncItems === 0) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Sync Progress</span>
          <Badge variant={syncInProgress ? 'default' : 'secondary'}>
            {syncInProgress ? 'In Progress' : 'Pending'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        {syncInProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="text-gray-600">{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Sync Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Sync Steps</h4>
          {syncSteps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{step.name}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStepStatusColor(step.status)}`}
                  >
                    {step.status.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Actions */}
        {pendingActions > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {pendingActions} pending action{pendingActions !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Actions will be processed when sync completes
            </p>
          </div>
        )}

        {/* Sync Queue */}
        {pendingSyncItems > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {pendingSyncItems} item{pendingSyncItems !== 1 ? 's' : ''} in sync queue
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Items waiting to be synchronized with the server
            </p>
          </div>
        )}

        {/* Sync Status Summary */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{pendingActions}</div>
            <div className="text-xs text-gray-600">Pending Actions</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{pendingSyncItems}</div>
            <div className="text-xs text-gray-600">Queue Items</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncProgress;
