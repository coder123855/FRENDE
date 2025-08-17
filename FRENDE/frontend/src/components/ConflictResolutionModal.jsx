/**
 * Conflict Resolution Modal Component
 * 
 * Modal for handling data conflicts between local and server versions
 * Allows users to choose resolution strategy or merge data manually
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Merge,
  Download,
  Upload,
  Clock,
  User,
  Server
} from 'lucide-react';
import { useRealTime } from '../contexts/RealTimeContext.jsx';
import { resolveConflict } from '../utils/syncUtils.js';
import { getConflictResolution } from '../config/syncConfig.js';

const ConflictResolutionModal = ({ 
  isOpen, 
  onClose, 
  conflict = null,
  onResolve = null 
}) => {
  const { resolveConflict: resolveConflictAction } = useRealTime();
  
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [mergedData, setMergedData] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && conflict) {
      setSelectedResolution(null);
      setMergedData(null);
      setIsResolving(false);
    }
  }, [isOpen, conflict]);

  if (!conflict) return null;

  const { operation, conflict: conflictData } = conflict;
  const { localData, serverData, dataType } = conflictData;

  // Get conflict resolution strategy
  const resolutionStrategy = getConflictResolution(dataType);

  // Generate merged data
  const generateMergedData = () => {
    if (!localData || !serverData) return null;
    
    const merged = { ...serverData };
    
    // Merge non-conflicting fields from local data
    Object.keys(localData).forEach(key => {
      if (!(key in serverData) || serverData[key] === null || serverData[key] === undefined) {
        merged[key] = localData[key];
      }
    });
    
    return merged;
  };

  // Handle resolution
  const handleResolve = async (resolutionType, data = null) => {
    setIsResolving(true);
    
    try {
      let resolvedData;
      
      switch (resolutionType) {
        case 'local':
          resolvedData = localData;
          break;
        case 'server':
          resolvedData = serverData;
          break;
        case 'merged':
          resolvedData = data || generateMergedData();
          break;
        case 'auto':
          const autoResolution = resolveConflict(localData, serverData, resolutionStrategy, dataType);
          resolvedData = autoResolution.data;
          break;
        default:
          throw new Error(`Unknown resolution type: ${resolutionType}`);
      }

      // Call the resolve action
      await resolveConflictAction(operation.id, {
        type: resolutionType,
        data: resolvedData,
        resolved: true
      });

      // Call the onResolve callback
      if (onResolve) {
        onResolve({
          type: resolutionType,
          data: resolvedData,
          operation: operation
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  // Get field differences
  const getFieldDifferences = () => {
    if (!localData || !serverData) return [];
    
    const differences = [];
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
    
    allKeys.forEach(key => {
      const localValue = localData[key];
      const serverValue = serverData[key];
      
      if (localValue !== serverValue) {
        differences.push({
          field: key,
          local: localValue,
          server: serverValue,
          type: typeof localValue
        });
      }
    });
    
    return differences;
  };

  const fieldDifferences = getFieldDifferences();
  const autoMergedData = generateMergedData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Data Conflict Resolution
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-orange-800">
                  {dataType} Conflict Detected
                </h3>
                <p className="text-sm text-orange-600 mt-1">
                  Local and server data have diverged. Choose how to resolve this conflict.
                </p>
              </div>
              <Badge variant="outline" className="text-orange-600">
                {operation?.type || 'Unknown'} Operation
              </Badge>
            </div>
          </div>

          {/* Resolution Options */}
          <Tabs defaultValue="compare" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="local">Use Local</TabsTrigger>
              <TabsTrigger value="server">Use Server</TabsTrigger>
              <TabsTrigger value="merge">Merge</TabsTrigger>
            </TabsList>

            {/* Compare Tab */}
            <TabsContent value="compare" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Local Data */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Local Data
                      <Badge variant="outline" className="text-xs">
                        Your Changes
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {fieldDifferences.map((diff, index) => (
                        <div key={index} className="p-2 bg-blue-50 rounded border">
                          <div className="text-xs font-medium text-blue-700">{diff.field}</div>
                          <div className="text-xs text-blue-600">
                            {typeof diff.local === 'object' 
                              ? JSON.stringify(diff.local, null, 2)
                              : String(diff.local)
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Server Data */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-green-500" />
                      Server Data
                      <Badge variant="outline" className="text-xs">
                        Remote Changes
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {fieldDifferences.map((diff, index) => (
                        <div key={index} className="p-2 bg-green-50 rounded border">
                          <div className="text-xs font-medium text-green-700">{diff.field}</div>
                          <div className="text-xs text-green-600">
                            {typeof diff.server === 'object' 
                              ? JSON.stringify(diff.server, null, 2)
                              : String(diff.server)
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => handleResolve('auto')}
                  disabled={isResolving}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Auto-Resolve ({resolutionStrategy})
                </Button>
              </div>
            </TabsContent>

            {/* Use Local Tab */}
            <TabsContent value="local" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    Use Local Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will keep your local changes and overwrite the server data.
                  </p>
                  <div className="bg-blue-50 p-3 rounded border">
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(localData, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleResolve('local')}
                  disabled={isResolving}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Use Local Data
                </Button>
              </div>
            </TabsContent>

            {/* Use Server Tab */}
            <TabsContent value="server" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-green-500" />
                    Use Server Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will discard your local changes and use the server data.
                  </p>
                  <div className="bg-green-50 p-3 rounded border">
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(serverData, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleResolve('server')}
                  disabled={isResolving}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Use Server Data
                </Button>
              </div>
            </TabsContent>

            {/* Merge Tab */}
            <TabsContent value="merge" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Merge className="w-4 h-4 text-purple-500" />
                    Merge Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will combine both local and server data, prioritizing server data for conflicts.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Auto-Merged Result:</h4>
                      <div className="bg-purple-50 p-3 rounded border">
                        <pre className="text-xs overflow-auto max-h-40">
                          {JSON.stringify(autoMergedData, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="font-medium text-blue-700">Local Fields:</span>
                        <div className="text-blue-600">
                          {Object.keys(localData || {}).join(', ')}
                        </div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="font-medium text-green-700">Server Fields:</span>
                        <div className="text-green-600">
                          {Object.keys(serverData || {}).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleResolve('merged', autoMergedData)}
                  disabled={isResolving}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Merge className="w-4 h-4" />
                  Use Merged Data
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              Last updated: {new Date(operation?.timestamp || Date.now()).toLocaleString()}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isResolving}
              >
                Cancel
              </Button>
              
              {selectedResolution && (
                <Button
                  onClick={() => handleResolve(selectedResolution)}
                  disabled={isResolving}
                  className="flex items-center gap-2"
                >
                  {isResolving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Resolve Conflict
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictResolutionModal;
