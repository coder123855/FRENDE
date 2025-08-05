import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, RefreshCw, Trash2, MessageCircle, AlertTriangle } from 'lucide-react';
import { useMatches } from '../hooks/useMatches';
import MatchStatusCard from './MatchStatusCard';

const MatchManager = ({ onChat, className = '' }) => {
  const {
    matches,
    pendingMatches,
    activeMatches,
    expiredMatches,
    loading,
    error,
    selectedStatus,
    fetchMatches,
    acceptMatch,
    rejectMatch,
    deleteMatch,
    setSelectedStatus,
  } = useMatches();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedMatches, setSelectedMatches] = useState(new Set());

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSelectedStatus(value === 'all' ? null : value);
    setSelectedMatches(new Set());
  };

  const handleSelectMatch = (matchId) => {
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const currentMatches = getCurrentMatches();
    if (selectedMatches.size === currentMatches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(currentMatches.map(match => match.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMatches.size === 0) return;
    
    const promises = Array.from(selectedMatches).map(matchId => deleteMatch(matchId));
    try {
      await Promise.all(promises);
      setSelectedMatches(new Set());
    } catch (error) {
      console.error('Error deleting matches:', error);
    }
  };

  const getCurrentMatches = () => {
    switch (activeTab) {
      case 'pending':
        return pendingMatches;
      case 'active':
        return activeMatches;
      case 'expired':
        return expiredMatches;
      default:
        return matches;
    }
  };

  const getMatchCount = (status) => {
    switch (status) {
      case 'pending':
        return pendingMatches.length;
      case 'active':
        return activeMatches.length;
      case 'expired':
        return expiredMatches.length;
      default:
        return matches.length;
    }
  };

  const currentMatches = getCurrentMatches();

  if (loading && matches.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => fetchMatches()} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Match Management</CardTitle>
          <div className="flex items-center gap-2">
            {selectedMatches.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-1"
              >
                <Trash2 size={14} />
                Delete Selected ({selectedMatches.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMatches()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-1">
                {getMatchCount('all')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              <Badge variant="secondary" className="ml-1">
                {getMatchCount('pending')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
              <Badge variant="secondary" className="ml-1">
                {getMatchCount('active')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expired
              <Badge variant="secondary" className="ml-1">
                {getMatchCount('expired')}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <MatchList
              matches={currentMatches}
              selectedMatches={selectedMatches}
              onSelectMatch={handleSelectMatch}
              onSelectAll={handleSelectAll}
              onAccept={acceptMatch}
              onReject={rejectMatch}
              onDelete={deleteMatch}
              onChat={onChat}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <MatchList
              matches={currentMatches}
              selectedMatches={selectedMatches}
              onSelectMatch={handleSelectMatch}
              onSelectAll={handleSelectAll}
              onAccept={acceptMatch}
              onReject={rejectMatch}
              onDelete={deleteMatch}
              onChat={onChat}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <MatchList
              matches={currentMatches}
              selectedMatches={selectedMatches}
              onSelectMatch={handleSelectMatch}
              onSelectAll={handleSelectAll}
              onAccept={acceptMatch}
              onReject={rejectMatch}
              onDelete={deleteMatch}
              onChat={onChat}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="expired" className="mt-4">
            <MatchList
              matches={currentMatches}
              selectedMatches={selectedMatches}
              onSelectMatch={handleSelectMatch}
              onSelectAll={handleSelectAll}
              onAccept={acceptMatch}
              onReject={rejectMatch}
              onDelete={deleteMatch}
              onChat={onChat}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const MatchList = ({
  matches,
  selectedMatches,
  onSelectMatch,
  onSelectAll,
  onAccept,
  onReject,
  onDelete,
  onChat,
  loading
}) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No matches found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
        >
          {selectedMatches.size === matches.length ? 'Deselect All' : 'Select All'}
        </Button>
        {selectedMatches.size > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedMatches.size} of {matches.length} selected
          </span>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <div key={match.id} className="relative">
            <input
              type="checkbox"
              checked={selectedMatches.has(match.id)}
              onChange={() => onSelectMatch(match.id)}
              className="absolute top-2 left-2 z-10"
            />
            <MatchStatusCard
              match={match}
              onAccept={onAccept}
              onReject={onReject}
              onDelete={onDelete}
              onChat={onChat}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchManager; 