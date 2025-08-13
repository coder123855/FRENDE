import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  Clock, 
  Award, 
  Users, 
  Plus,
  Upload,
  Eye,
  Star,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useCoinRewards } from '../hooks/useCoinRewards';
import { useTaskSubmission } from '../hooks/useTaskSubmission';
import TaskCard from './TaskCard';
import TaskProgress from './TaskProgress';
import TaskHistory from './TaskHistory';
import TaskStatistics from './TaskStatistics';
import TaskSubmissionForm from './TaskSubmissionForm';
import TaskValidationInterface from './TaskValidationInterface';
import CoinBalance from './CoinBalance';
import TaskExpirationTimer from './TaskExpirationTimer';
import TaskReplacementModal from './TaskReplacementModal';
import { useTaskReplacement } from '../hooks/useTaskReplacement';
import { useTaskHistory } from '../hooks/useTaskHistory';
import { useTaskProgress } from '../hooks/useTaskProgress';
import TaskLoadingSkeleton from './loading/TaskLoadingSkeleton';
import ErrorFallback from './error-states/ErrorFallback';

const TaskManager = ({ matchId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showValidationInterface, setShowValidationInterface] = useState(false);
  
  // Hooks
  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks } = useTasks(matchId);
  const { balance, loading: balanceLoading, fetchCoinBalance } = useCoinRewards();
  const { submitting, submitTaskCompletion, getPendingValidations } = useTaskSubmission();
  const { expiredTasks, replacementModal, handleReplacementConfirm, closeReplacementModal } = useTaskReplacement(matchId);
  const { taskHistory, statistics, loading: historyLoading } = useTaskHistory(matchId);
  const { taskProgress, loading: progressLoading } = useTaskProgress(selectedTask?.id, matchId);

  useEffect(() => {
    if (user && matchId) {
      refreshTasks();
      fetchCoinBalance();
    }
  }, [user, matchId, refreshTasks, fetchCoinBalance]);

  const handleTaskComplete = async (taskId, submissionData) => {
    try {
      await submitTaskCompletion(taskId, submissionData);
      
      // Refresh data
      refreshTasks();
      fetchCoinBalance();
      
      // Show success notification
      // You could add a toast notification here
      console.log('Task completed successfully!');
      
      setShowSubmissionForm(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error completing task:', error);
      // Show error notification
    }
  };

  const handlePurchaseSlots = async () => {
    try {
      const result = await purchaseSlots(1); // Purchase 1 slot
      console.log('Slots purchased successfully:', result);
      return result;
    } catch (error) {
      console.error('Error purchasing slots:', error);
      throw error;
    }
  };

  const handleValidationComplete = async (submissionId, status) => {
    try {
      // Refresh data after validation
      refreshTasks();
      fetchCoinBalance();
      
      console.log(`Submission ${submissionId} ${status} successfully`);
    } catch (error) {
      console.error('Error during validation:', error);
    }
  };

  const getActiveTasks = () => {
    return tasks.filter(task => !task.is_completed && !task.is_expired);
  };

  const getCompletedTasks = () => {
    return tasks.filter(task => task.is_completed);
  };

  const getExpiredTasks = () => {
    return tasks.filter(task => task.is_expired && !task.is_completed);
  };

  const getTaskProgress = (taskId) => {
    return taskProgress.find(progress => progress.task_id === taskId);
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <TaskLoadingSkeleton count={3} />
      </div>
    );
  }

  if (tasksError) {
    return (
      <ErrorFallback
        error={{ message: tasksError }}
        errorType="general"
        onRetry={refreshTasks}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Coin Balance */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600">Complete tasks with your friend to earn rewards</p>
        </div>
        <CoinBalance onPurchaseSlots={handlePurchaseSlots} />
      </div>

      {/* Task Replacement Modal */}
      <TaskReplacementModal
        isOpen={replacementModal.isOpen}
        onClose={closeReplacementModal}
        oldTask={replacementModal.oldTask}
        newTask={replacementModal.newTask}
        onConfirm={handleReplacementConfirm}
        isLoading={submitting}
      />

      {/* Task Submission Form Modal */}
      {showSubmissionForm && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <TaskSubmissionForm
              task={selectedTask}
              onSubmit={handleTaskComplete}
              onCancel={() => {
                setShowSubmissionForm(false);
                setSelectedTask(null);
              }}
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}

      {/* Validation Interface Modal */}
      {showValidationInterface && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <TaskValidationInterface
              onValidationComplete={handleValidationComplete}
            />
            <Button
              onClick={() => setShowValidationInterface(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Active ({getActiveTasks().length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Completed ({getCompletedTasks().length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Validation
          </TabsTrigger>
        </TabsList>

        {/* Active Tasks Tab */}
        <TabsContent value="active" className="space-y-4">
          {getActiveTasks().length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active tasks</p>
                <p className="text-sm text-gray-500 mt-1">
                  New tasks will appear here when generated
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getActiveTasks().map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  progress={getTaskProgress(task.id)}
                  onComplete={() => {
                    setSelectedTask(task);
                    setShowSubmissionForm(true);
                  }}
                  onViewDetails={() => {
                    setSelectedTask(task);
                    // You could show a detailed view here
                  }}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tasks Tab */}
        <TabsContent value="completed" className="space-y-4">
          {getCompletedTasks().length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No completed tasks yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Complete tasks with your friend to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getCompletedTasks().map((task) => (
                <TaskProgress
                  key={task.id}
                  task={task}
                  onComplete={() => {}} // No-op for completed tasks
                  onUpdate={refreshTasks}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <TaskHistory matchId={matchId} />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task Validation</h3>
            <Button
              onClick={() => setShowValidationInterface(true)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Review Submissions
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Validation Interface</p>
                <p className="text-sm text-gray-500 mt-1">
                  Review and validate task submissions from your matches
                </p>
                <Button
                  onClick={() => setShowValidationInterface(true)}
                  className="mt-4"
                >
                  Open Validation Panel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics Overview */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Task Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.total_tasks_completed || 0}
                </div>
                <div className="text-sm text-blue-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.total_coins_earned || 0}
                </div>
                <div className="text-sm text-green-600">Coins Earned</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {statistics.average_completion_time ? 
                    `${Math.round(statistics.average_completion_time)}h` : '0h'}
                </div>
                <div className="text-sm text-yellow-600">Avg Time</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.total_tasks_created || 0}
                </div>
                <div className="text-sm text-purple-600">Total Created</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskManager; 