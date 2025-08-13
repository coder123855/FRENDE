import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const TaskReplacementModal = ({ 
  isOpen, 
  onClose, 
  oldTask, 
  newTask, 
  onConfirm, 
  isLoading = false 
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = async () => {
    setIsConfirmed(true);
    if (onConfirm) {
      await onConfirm(oldTask, newTask);
    }
    onClose();
  };

  const handleCancel = () => {
    setIsConfirmed(false);
    onClose();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'bonding': return 'bg-blue-100 text-blue-800';
      case 'social': return 'bg-purple-100 text-purple-800';
      case 'creative': return 'bg-pink-100 text-pink-800';
      case 'physical': return 'bg-orange-100 text-orange-800';
      case 'mental': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Task Replacement
          </DialogTitle>
          <DialogDescription>
            Your task has expired and needs to be replaced with a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Old Task */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Expired Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold">{oldTask?.title}</h4>
                <p className="text-sm text-gray-600">{oldTask?.description}</p>
                <div className="flex gap-2">
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expired
                  </Badge>
                  {oldTask?.difficulty && (
                    <Badge className={getDifficultyColor(oldTask.difficulty)}>
                      {oldTask.difficulty}
                    </Badge>
                  )}
                  {oldTask?.category && (
                    <Badge className={getCategoryColor(oldTask.category)}>
                      {oldTask.category}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Task */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                New Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold">{newTask?.title}</h4>
                <p className="text-sm text-gray-600">{newTask?.description}</p>
                <div className="flex gap-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    24h remaining
                  </Badge>
                  {newTask?.difficulty && (
                    <Badge className={getDifficultyColor(newTask.difficulty)}>
                      {newTask.difficulty}
                    </Badge>
                  )}
                  {newTask?.category && (
                    <Badge className={getCategoryColor(newTask.category)}>
                      {newTask.category}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Reward:</strong> {newTask?.final_coin_reward || newTask?.base_coin_reward} coins
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Why was this task replaced?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Tasks expire after 24 hours to keep the experience fresh</li>
              <li>• New tasks are generated based on your interests and match</li>
              <li>• Both you and your friend need to complete the task to earn rewards</li>
              <li>• You can always replace tasks manually if needed</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Replacing...' : 'Accept New Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskReplacementModal; 