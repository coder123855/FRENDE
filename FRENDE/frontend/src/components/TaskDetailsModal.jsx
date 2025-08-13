import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/input';
import { Clock, Trophy, Sparkles, CheckCircle, AlertCircle, PlayCircle, X } from 'lucide-react';

const TaskDetailsModal = ({ 
  task, 
  progress, 
  isOpen, 
  onClose, 
  onComplete,
  currentUserId 
}) => {
  const [submission, setSubmission] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  if (!task) return null;

  // Calculate completion status
  const isCompleted = task.is_completed;
  const isExpired = task.is_expired && !isCompleted;
  const isInProgress = !isCompleted && progress?.progress_percentage > 0;
  const userCompleted = currentUserId === task.match?.user1_id 
    ? task.completed_by_user1 
    : task.completed_by_user2;

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (isCompleted) return 'bg-green-100 text-green-800 border-green-200';
    if (isExpired) return 'bg-red-100 text-red-800 border-red-200';
    if (isInProgress) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-4 h-4" />;
    if (isExpired) return <AlertCircle className="w-4 h-4" />;
    if (isInProgress) return <PlayCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  // Format time remaining
  const formatTimeRemaining = () => {
    if (!task.expires_at) return null;
    
    const now = new Date();
    const expiresAt = new Date(task.expires_at);
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  // Handle task completion
  const handleComplete = async () => {
    if (!currentUserId) {
      alert('Please log in to complete tasks');
      return;
    }

    if (!submission.trim()) {
      alert('Please provide a submission description');
      return;
    }

    setCompleting(true);
    try {
      await onComplete(task.id, {
        text: submission,
        evidence: null
      });
      setShowSubmissionForm(false);
      setSubmission('');
      onClose();
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const timeRemaining = formatTimeRemaining();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl font-semibold">
              Task Details
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Header */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {task.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {task.description}
                </p>
              </div>
              
              {task.ai_generated && (
                <div className="flex items-center gap-1 text-purple-600">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">AI Generated</span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <Badge className={`text-sm ${getDifficultyColor(task.difficulty)}`}>
                {task.difficulty || 'medium'}
              </Badge>
              
              <Badge className={`text-sm ${getStatusColor()}`}>
                <span className="flex items-center gap-1">
                  {getStatusIcon()}
                  {isCompleted ? 'Completed' : 
                   isExpired ? 'Expired' : 
                   isInProgress ? 'In Progress' : 'Pending'}
                </span>
              </Badge>
            </div>
          </div>

          {/* Progress Section */}
          {!isCompleted && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Progress</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Completion Progress</span>
                  <span>{progress?.progress_percentage || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

                             {/* User Completion Status */}
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className={`p-3 rounded-lg border ${
                   userCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                 }`}>
                   <div className="font-medium text-gray-900">You</div>
                   <div className="text-gray-600 flex items-center gap-1">
                     {userCompleted ? (
                       <>
                         <CheckCircle className="w-4 h-4 text-green-500" />
                         <span>Completed</span>
                       </>
                     ) : (
                       <>
                         <Clock className="w-4 h-4 text-gray-500" />
                         <span>Pending</span>
                       </>
                     )}
                   </div>
                   {userCompleted && task.completed_at_user1 && (
                     <div className="text-xs text-gray-500 mt-1">
                       {new Date(task.completed_at_user1).toLocaleDateString()}
                     </div>
                   )}
                 </div>
                 <div className={`p-3 rounded-lg border ${
                   !userCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                 }`}>
                   <div className="font-medium text-gray-900">Your Friend</div>
                   <div className="text-gray-600 flex items-center gap-1">
                     {!userCompleted ? (
                       <>
                         <CheckCircle className="w-4 h-4 text-green-500" />
                         <span>Completed</span>
                       </>
                     ) : (
                       <>
                         <Clock className="w-4 h-4 text-gray-500" />
                         <span>Pending</span>
                       </>
                     )}
                   </div>
                   {!userCompleted && task.completed_at_user2 && (
                     <div className="text-xs text-gray-500 mt-1">
                       {new Date(task.completed_at_user2).toLocaleDateString()}
                     </div>
                   )}
                 </div>
               </div>
            </div>
          )}

          {/* Rewards and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900">Reward</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {task.final_coin_reward || task.base_coin_reward} coins
              </div>
              <div className="text-sm text-gray-600">
                {task.difficulty_multiplier > 1 && `×${task.difficulty_multiplier} difficulty bonus`}
              </div>
            </div>

            {timeRemaining && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Time Remaining</span>
                </div>
                <div className={`text-2xl font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {timeRemaining}
                </div>
                <div className="text-sm text-gray-600">
                  {isExpired ? 'Task has expired' : 'Complete before time runs out'}
                </div>
              </div>
            )}
          </div>

          {/* Task Metadata */}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{new Date(task.created_at).toLocaleDateString()}</span>
            </div>
            {task.completed_at && (
              <div className="flex justify-between">
                <span>Completed:</span>
                <span>{new Date(task.completed_at).toLocaleDateString()}</span>
              </div>
            )}
            {task.category && (
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="capitalize">{task.category}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {!isCompleted && !isExpired && (
              <Button
                onClick={() => setShowSubmissionForm(true)}
                disabled={completing}
                className="flex-1"
              >
                {completing ? 'Completing...' : 'Complete Task'}
              </Button>
            )}
            
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>

          {/* Submission Form */}
          {showSubmissionForm && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Task Submission</h3>
              <p className="text-sm text-gray-600">
                Describe how you completed this task. This will be shared with your friend.
              </p>
              
              <Textarea
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                placeholder="Describe how you completed this task..."
                className="min-h-[100px]"
                maxLength={500}
              />
              
              <div className="flex gap-3">
                <Button
                  onClick={handleComplete}
                  disabled={completing || !submission.trim()}
                  className="flex-1"
                >
                  {completing ? 'Submitting...' : 'Submit Completion'}
                </Button>
                <Button
                  onClick={() => setShowSubmissionForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal; 