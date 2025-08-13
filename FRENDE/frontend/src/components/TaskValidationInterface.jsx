import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText,
  Image,
  Video,
  Link,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const TaskValidationInterface = ({ onValidationComplete }) => {
  const { user } = useAuth();
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [validationNotes, setValidationNotes] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPendingValidations();
    }
  }, [user]);

  const fetchPendingValidations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/tasks/submissions/pending', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching pending validations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateSubmission = async (submissionId, status) => {
    if (!user) return;

    setIsValidating(true);
    try {
      const response = await fetch(`/api/tasks/submissions/${submissionId}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: status,
          notes: validationNotes.trim() || null
        })
      });

      if (response.ok) {
        // Remove the validated submission from the list
        setPendingSubmissions(prev => 
          prev.filter(sub => sub.submission_id !== submissionId)
        );
        
        // Clear form
        setSelectedSubmission(null);
        setValidationNotes('');
        
        // Notify parent component
        if (onValidationComplete) {
          onValidationComplete(submissionId, status);
        }
      }
    } catch (error) {
      console.error('Error validating submission:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const getEvidenceTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <Link className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (deadline) => {
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Pending Validations ({pendingSubmissions.length})
          </CardTitle>
          <p className="text-sm text-gray-600">
            Review and validate task submissions from your matches
          </p>
        </CardHeader>
      </Card>

      {pendingSubmissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No pending validations</p>
            <p className="text-sm text-gray-500 mt-1">
              All task submissions have been reviewed!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Submissions to Review</h3>
            {pendingSubmissions.map((submission) => (
              <Card 
                key={submission.submission_id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedSubmission?.submission_id === submission.submission_id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : ''
                }`}
                onClick={() => setSelectedSubmission(submission)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {submission.task_title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {submission.task_description}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {submission.submitter_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formatDate(submission.submitted_at)}
                        </span>
                        {submission.validation_deadline && (
                          <Badge variant="outline" className="ml-auto">
                            {getTimeRemaining(submission.validation_deadline)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {submission.submission_evidence_url && (
                      <div className="ml-2">
                        {getEvidenceTypeIcon(submission.submission_evidence_type)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Validation Panel */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Submission</h3>
            
            {selectedSubmission ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Task Details */}
                    <div>
                      <h4 className="font-semibold text-lg mb-2">
                        {selectedSubmission.task_title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {selectedSubmission.task_description}
                      </p>
                    </div>

                    {/* Submission Text */}
                    {selectedSubmission.submission_text && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Description</h5>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {selectedSubmission.submission_text}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Evidence */}
                    {selectedSubmission.submission_evidence_url && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Evidence</h5>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getEvidenceTypeIcon(selectedSubmission.submission_evidence_type)}
                            <span className="text-sm font-medium">Evidence provided</span>
                          </div>
                          <a 
                            href={selectedSubmission.submission_evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View evidence →
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Validation Notes */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Validation Notes (Optional)
                      </label>
                      <Textarea
                        placeholder="Provide feedback or notes about this submission..."
                        value={validationNotes}
                        onChange={(e) => setValidationNotes(e.target.value)}
                        className="min-h-[80px]"
                        maxLength={500}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Optional feedback for the submitter</span>
                        <span>{validationNotes.length}/500</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => handleValidateSubmission(
                          selectedSubmission.submission_id, 
                          'approved'
                        )}
                        disabled={isValidating}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handleValidateSubmission(
                          selectedSubmission.submission_id, 
                          'rejected'
                        )}
                        disabled={isValidating}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a submission to review</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click on a submission from the list to start reviewing
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskValidationInterface; 