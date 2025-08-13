import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import TaskCard from './TaskCard';
import TaskSidebar from './TaskSidebar';
import TaskDetailsModal from './TaskDetailsModal';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { 
  Grid3X3, 
  Sidebar, 
  RefreshCw, 
  Plus, 
  Filter,
  Trophy,
  Clock,
  AlertCircle
} from 'lucide-react';
import TaskLoadingSkeleton from './loading/TaskLoadingSkeleton';
import ErrorFallback from './error-states/ErrorFallback';

const TaskDisplay = ({ 
  matchId, 
  currentUserId,
  layout = 'cards', // 'cards' or 'sidebar'
  onLayoutChange 
}) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed', 'expired'

  const {
    tasks,
    loading,
    error,
    refreshing,
    taskProgress,
    taskStats,
    expiredTasks,
    expiredLoading,
    refreshTasks,
    completeTask,
    generateTask,
    replaceExpiredTasks,
    getExpiredTasks,
    replaceSpecificExpiredTask,
    replaceAllExpiredTasks,
  } = useTasks(matchId, currentUserId);

  // Filter tasks based on current filter
  const filteredTasks = tasks.filter(task => {
    const isCompleted = task.is_completed;
    const isExpired = task.is_expired && !isCompleted;
    
    switch (filter) {
      case 'active':
        return !isCompleted && !isExpired;
      case 'completed':
        return isCompleted;
      case 'expired':
        return isExpired;
      default:
        return true;
    }
  });

  // Handle task completion
  const handleCompleteTask = async (taskId, submission) => {
    try {
      await completeTask(taskId, submission);
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  };

  // Handle task details view
  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  // Handle generate new task
  const handleGenerateTask = async () => {
    try {
      await generateTask('bonding', 'medium');
    } catch (error) {
      console.error('Failed to generate task:', error);
      alert('Failed to generate new task. Please try again.');
    }
  };

  // Handle replace expired tasks
  const handleReplaceExpired = async () => {
    try {
      await replaceExpiredTasks();
    } catch (error) {
      console.error('Failed to replace expired tasks:', error);
      alert('Failed to replace expired tasks. Please try again.');
    }
  };

  // Handle replace specific expired task
  const handleReplaceSpecificExpired = async (taskId) => {
    try {
      await replaceSpecificExpiredTask(taskId);
    } catch (error) {
      console.error('Failed to replace specific expired task:', error);
      alert('Failed to replace task. Please try again.');
    }
  };

  // Handle replace all expired tasks
  const handleReplaceAllExpired = async () => {
    try {
      await replaceAllExpiredTasks();
    } catch (error) {
      console.error('Failed to replace all expired tasks:', error);
      alert('Failed to replace all expired tasks. Please try again.');
    }
  };

  // Load expired tasks when filter changes to expired
  React.useEffect(() => {
    if (filter === 'expired') {
      getExpiredTasks();
    }
  }, [filter, getExpiredTasks]);

  // Loading state
  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <TaskLoadingSkeleton count={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorFallback
        error={{ message: error }}
        errorType="general"
        onRetry={refreshTasks}
        className="h-64"
      />
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-600 mb-4">
            Tasks will be generated automatically to help you bond with your friend.
          </p>
          <Button onClick={handleGenerateTask}>
            <Plus className="w-4 h-4 mr-2" />
            Generate First Task
          </Button>
        </div>
      </div>
    );
  }

  // Sidebar Layout
  if (layout === 'sidebar') {
    return (
      <div className="flex h-full">
        <TaskSidebar
          tasks={filteredTasks}
          progress={taskProgress}
          onComplete={handleCompleteTask}
          onViewDetails={handleViewDetails}
          currentUserId={currentUserId}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
              <div className="flex items-center gap-2">
                <Button
                  onClick={refreshTasks}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={handleGenerateTask} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
                {taskStats.expired > 0 && (
                  <Button 
                    onClick={handleReplaceAllExpired} 
                    variant="destructive" 
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Replace Expired ({taskStats.expired})
                  </Button>
                )}
                {onLayoutChange && (
                  <Button
                    onClick={() => onLayoutChange('sidebar')}
                    variant="outline"
                    size="sm"
                  >
                    <Sidebar className="w-4 h-4 mr-2" />
                    Sidebar
                  </Button>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Total Tasks</p>
                      <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Expired</p>
                      <p className="text-2xl font-bold text-red-600">{taskStats.expired}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Select a task from the sidebar to view details</p>
              <p className="text-sm mt-2">Or use the quick actions to manage your tasks</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cards Layout
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600">
              Complete tasks together to earn coins and strengthen your friendship
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
            
            <Button
              onClick={refreshTasks}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button onClick={handleGenerateTask} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
            
            {taskStats.expired > 0 && (
              <Button 
                onClick={handleReplaceAllExpired} 
                variant="destructive" 
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Replace Expired ({taskStats.expired})
              </Button>
            )}
            
            {onLayoutChange && (
              <Button
                onClick={() => onLayoutChange('sidebar')}
                variant="outline"
                size="sm"
              >
                <Sidebar className="w-4 h-4 mr-2" />
                Sidebar
              </Button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
                <div>
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{taskStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-green-600 text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Done</p>
                  <p className="text-lg font-bold text-green-600">{taskStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-blue-500 mr-2" />
                <div>
                  <p className="text-xs text-gray-600">Active</p>
                  <p className="text-lg font-bold text-blue-600">{taskStats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                <div>
                  <p className="text-xs text-gray-600">Expired</p>
                  <p className="text-lg font-bold text-red-600">{taskStats.expired}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Grid */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No {filter} tasks</p>
              <p className="text-sm">
                {filter === 'all' ? 'No tasks available' : `No ${filter} tasks found`}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                progress={taskProgress[task.id]}
                onComplete={handleCompleteTask}
                onViewDetails={handleViewDetails}
                onReplace={handleReplaceSpecificExpired}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        {/* Expired Tasks Warning */}
        {taskStats.expired > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {taskStats.expired} expired task{taskStats.expired !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-yellow-700">
                    Expired tasks can be replaced with new ones
                  </p>
                </div>
              </div>
              <Button onClick={handleReplaceExpired} size="sm" variant="outline">
                Replace Expired
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        progress={selectedTask ? taskProgress[selectedTask.id] : null}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default TaskDisplay; 