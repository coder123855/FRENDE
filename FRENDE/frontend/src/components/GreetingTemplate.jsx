import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
    MessageCircle, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    Loader2,
    Star,
    Copy,
    Edit
} from 'lucide-react';
import { useDefaultGreeting } from '../hooks/useDefaultGreeting';
import { useAuth } from '../hooks/useAuth';

const GreetingTemplate = ({ 
    onTemplateSelect, 
    selectedTemplateId = null,
    showPreview = true,
    showActions = true 
}) => {
    const { user } = useAuth();
    const { 
        templates, 
        isLoading, 
        error, 
        getGreetingTemplates, 
        previewGreeting,
        saveUserPreference,
        getUserPreference
    } = useDefaultGreeting();
    
    const [selectedTemplate, setSelectedTemplate] = useState(selectedTemplateId);
    const [userPreference, setUserPreference] = useState(null);
    const [previewText, setPreviewText] = useState('');
    const [copiedTemplate, setCopiedTemplate] = useState(null);

    // Load templates and user preference
    useEffect(() => {
        getGreetingTemplates();
        loadUserPreference();
    }, []);

    // Update preview when template changes
    useEffect(() => {
        if (selectedTemplate && user?.name) {
            const preview = previewGreeting(selectedTemplate, user.name);
            setPreviewText(preview);
        }
    }, [selectedTemplate, user?.name, previewGreeting]);

    const loadUserPreference = async () => {
        const preference = await getUserPreference();
        setUserPreference(preference);
        if (preference && !selectedTemplate) {
            setSelectedTemplate(preference);
        }
    };

    const handleTemplateSelect = (templateId) => {
        setSelectedTemplate(templateId);
        if (onTemplateSelect) {
            onTemplateSelect(templateId);
        }
    };

    const handleSavePreference = async (templateId) => {
        const success = await saveUserPreference(templateId);
        if (success) {
            setUserPreference(templateId);
        }
    };

    const handleCopyTemplate = (template) => {
        const textToCopy = previewGreeting(template.id, user?.name || 'User');
        navigator.clipboard.writeText(textToCopy);
        setCopiedTemplate(template.id);
        setTimeout(() => setCopiedTemplate(null), 2000);
    };

    const formatTemplateName = (name) => {
        return name.replace(/([A-Z])/g, ' $1').trim();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading greeting templates...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Greeting Templates</h3>
                {userPreference && (
                    <Badge variant="secondary" className="text-xs">
                        Preference: {templates.find(t => t.id === userPreference)?.name || 'Default'}
                    </Badge>
                )}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                    <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTemplate === template.id 
                                ? 'ring-2 ring-blue-500 bg-blue-50' 
                                : ''
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium">
                                    {formatTemplateName(template.name)}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                    {template.is_default && (
                                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    )}
                                    {userPreference === template.id && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                            <p className="text-sm text-gray-600 mb-3">
                                {template.template}
                            </p>
                            
                            {showPreview && user?.name && (
                                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                                    <p className="text-sm font-medium">
                                        {previewGreeting(template.id, user.name)}
                                    </p>
                                </div>
                            )}
                            
                            {showActions && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyTemplate(template);
                                        }}
                                        className="flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" />
                                        {copiedTemplate === template.id ? 'Copied!' : 'Copy'}
                                    </Button>
                                    
                                    {userPreference !== template.id && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSavePreference(template.id);
                                            }}
                                            className="flex items-center gap-1"
                                        >
                                            <Star className="w-3 h-3" />
                                            Set Default
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Selected Template Info */}
            {selectedTemplate && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                                Selected Template
                            </span>
                        </div>
                        <p className="text-sm text-blue-700">
                            {templates.find(t => t.id === selectedTemplate)?.name}
                        </p>
                        {previewText && (
                            <p className="text-sm text-blue-600 mt-2 italic">
                                "{previewText}"
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* No Templates */}
            {templates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>No greeting templates available</p>
                </div>
            )}
        </div>
    );
};

export default GreetingTemplate; 