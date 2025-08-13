import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Link, 
  X, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const TaskSubmissionForm = ({ task, onSubmit, onCancel, isSubmitting = false }) => {
  const [submissionText, setSubmissionText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Validate form
    const newErrors = {};
    if (!submissionText.trim() && !evidenceUrl && !uploadedFile) {
      newErrors.general = 'Please provide either a description or evidence of task completion';
    }
    
    if (submissionText.length > 1000) {
      newErrors.submissionText = 'Description must be less than 1000 characters';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Prepare submission data
    const submissionData = {
      submission_text: submissionText.trim() || null,
      submission_evidence_url: evidenceUrl || (uploadedFile ? uploadedFile.url : null),
      submission_evidence_type: evidenceType || (uploadedFile ? uploadedFile.type : null)
    };
    
    // Call onSubmit callback
    if (onSubmit) {
      await onSubmit(submissionData);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ file: 'File size must be less than 10MB' });
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ file: 'File type not supported. Please upload images, videos, or PDFs.' });
      return;
    }
    
    setIsUploading(true);
    setErrors({});
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', task.id);
      
      const response = await fetch('/api/tasks/submissions/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadedFile({
          name: file.name,
          url: result.file_url,
          type: file.type,
          size: file.size
        });
        setEvidenceType(file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'document');
      } else {
        setErrors({ file: 'Failed to upload file. Please try again.' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrors({ file: 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setEvidenceType('');
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Submit Task Completion
        </CardTitle>
        <p className="text-sm text-gray-600">
          Provide evidence of your task completion to earn rewards
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Information */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">{task.title}</h3>
            <p className="text-sm text-blue-700">{task.description}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{task.difficulty}</Badge>
              <Badge variant="outline">{task.category}</Badge>
              {task.requires_validation && (
                <Badge className="bg-orange-100 text-orange-800">
                  Requires Validation
                </Badge>
              )}
            </div>
          </div>

          {/* Submission Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description of Completion
            </label>
            <Textarea
              placeholder="Describe how you completed this task..."
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              className="min-h-[100px]"
              maxLength={1000}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Optional but recommended</span>
              <span>{submissionText.length}/1000</span>
            </div>
            {errors.submissionText && (
              <p className="text-sm text-red-600">{errors.submissionText}</p>
            )}
          </div>

          {/* Evidence Upload */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Evidence (Optional)</label>
              <p className="text-xs text-gray-600 mb-2">
                Upload a photo, video, or document as proof of completion
              </p>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
              />
              
              {!uploadedFile ? (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Images, videos, or documents up to 10MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="mt-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    {getEvidenceTypeIcon(evidenceType)}
                    <div>
                      <p className="text-sm font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(uploadedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeUploadedFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {errors.file && (
                <p className="text-sm text-red-600 mt-2">{errors.file}</p>
              )}
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Or provide a link</label>
              <Input
                type="url"
                placeholder="https://example.com/evidence"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Link to external evidence (social media post, etc.)
              </p>
            </div>
          </div>

          {/* Validation Notice */}
          {task.requires_validation && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Validation Required</span>
              </div>
              <p className="text-xs text-orange-700 mt-1">
                This task requires validation from your partner before rewards are awarded.
              </p>
            </div>
          )}

          {/* Error Display */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Completion
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskSubmissionForm; 