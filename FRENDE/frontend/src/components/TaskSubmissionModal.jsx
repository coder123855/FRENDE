import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
    Target, 
    Upload, 
    Send, 
    X, 
    Clock,
    Gift,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';

const TaskSubmissionModal = ({ 
    task, 
    isOpen, 
    onClose, 
    onSubmit, 
    isLoading = false,
    error = null 
}) => {
    const [submissionText, setSubmissionText] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSubmissionText('');
            setEvidenceUrl('');
            setValidationError('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!submissionText.trim()) {
            setValidationError('Please provide a submission description');
            return;
        }

        if (submissionText.length > 1000) {
            setValidationError('Submission text must be less than 1000 characters');
            return;
        }

        setValidationError('');
        setIsSubmitting(true);

        try {
            await onSubmit(task.id, submissionText, evidenceUrl || null);
            onClose();
        } catch (err) {
            console.error('Error submitting task:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit();
        }
    };

    const formatTimeRemaining = (seconds) => {
        if (!seconds) return 'No deadline';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else {
            return `${minutes}m remaining`;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Submit Task Completion
                        </CardTitle>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {/* Task Information */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-2">{task?.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{task?.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                            {task?.reward_coins && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Gift className="w-3 h-3" />
                                    {task.reward_coins} coins
                                </Badge>
                            )}
                            
                            {task?.due_date && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeRemaining(task.time_remaining)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {(error || validationError) && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-600">
                                    {error || validationError}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Submission Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Describe your completion
                            </label>
                            <Textarea
                                value={submissionText}
                                onChange={(e) => setSubmissionText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe how you completed this task..."
                                className="min-h-[100px]"
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-gray-500">
                                    {submissionText.length}/1000 characters
                                </span>
                                {submissionText.length > 900 && (
                                    <span className="text-xs text-orange-600">
                                        {1000 - submissionText.length} remaining
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Evidence URL (optional)
                            </label>
                            <Input
                                type="url"
                                value={evidenceUrl}
                                onChange={(e) => setEvidenceUrl(e.target.value)}
                                placeholder="https://example.com/evidence"
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Link to photo, video, or other evidence of completion
                            </p>
                        </div>

                        {/* Submission Guidelines */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">
                                Submission Guidelines
                            </h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li>• Be specific about how you completed the task</li>
                                <li>• Include relevant details and context</li>
                                <li>• Provide evidence if possible (photos, links, etc.)</li>
                                <li>• Both users must submit to complete the task</li>
                            </ul>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-6">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !submissionText.trim()}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Task
                                </>
                            )}
                        </Button>
                        
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </div>

                    {/* Success Message */}
                    {!isSubmitting && !error && !validationError && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700">
                                    Ready to submit! Both users must complete this task to earn rewards.
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TaskSubmissionModal; 