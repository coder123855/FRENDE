import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle } from './ui/dialog';
import { 
  Send, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  MessageCircle,
  Zap,
  Timer,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import ChatLoadingSkeleton from './loading/ChatLoadingSkeleton';
import { useChat } from '../hooks/useChat';
import { useConversationStarter } from '../hooks/useConversationStarter';
import { useAutomaticGreeting } from '../hooks/useAutomaticGreeting';
import { useTaskChat } from '../hooks/useTaskChat';
import { useAuth } from '../hooks/useAuth';
import { useOffline } from '../hooks/useOffline';
import TaskStatusPanel from './TaskStatusPanel';
import TaskNotification from './TaskNotification';

const Chat = ({ matchId }) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const {
    messages,
    typingUsers,
    onlineUsers,
    isConnected,
    isLoading,
    error,
    isOfflineMode,
    sendMessage,
    handleTyping,
    lastMessageRef,
    loadOlderMessages,
    hasMore,
    isLoadingMore
  } = useChat(matchId);

  const {
    conversationStarter,
    isLoading: starterLoading,
    isCurrentUserStarter,
    isExpired,
    hasGreetingBeenSent,
    timeLeft,
    assignConversationStarter,
    markGreetingSent,
    getDefaultGreeting
  } = useConversationStarter(matchId);

  const {
    greetingStatus,
    isLoading: greetingLoading,
    isExpired: greetingExpired,
    hasGreetingBeenSent: automaticGreetingSent,
    countdown,
    sendManualGreeting,
    markGreetingSent: markAutomaticGreetingSent
  } = useAutomaticGreeting(matchId);

  const {
    taskStatus,
    taskNotifications,
    isLoading: taskLoading,
    error: taskError,
    submitTaskViaChat,
    completeTaskViaChat,
    markNotificationRead,
    hasActiveTask,
    getCurrentTask,
    getUnreadNotificationsCount
  } = useTaskChat(matchId);

  // Offline state
  const { isOnline } = useOffline();

  // Auto-assign conversation starter if none exists
  useEffect(() => {
    if (!conversationStarter && !starterLoading && matchId) {
      assignConversationStarter().catch(console.error);
    }
  }, [conversationStarter, starterLoading, matchId, assignConversationStarter]);

  // Handle conversation starter timeout
  useEffect(() => {
    if (isExpired && !hasGreetingBeenSent && isCurrentUserStarter) {
      handleTimeoutGreeting();
    }
  }, [isExpired, hasGreetingBeenSent, isCurrentUserStarter]);

  // Handle automatic greeting timeout
  useEffect(() => {
    if (greetingExpired && !automaticGreetingSent) {
      handleAutomaticGreetingTimeout();
    }
  }, [greetingExpired, automaticGreetingSent]);

  const handleTimeoutGreeting = async () => {
    try {
      const defaultGreeting = await getDefaultGreeting(user?.name || 'User');
      if (defaultGreeting) {
        await sendMessage(defaultGreeting);
        await markGreetingSent();
      }
    } catch (error) {
      console.error('Error sending timeout greeting:', error);
    }
  };

  const handleAutomaticGreetingTimeout = async () => {
    try {
      await sendManualGreeting();
      await markAutomaticGreetingSent();
    } catch (error) {
      console.error('Error handling automatic greeting timeout:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const messageText = input.trim();
    setInput('');
    setIsTyping(false);

    try {
      await sendMessage(messageText);
      
      // Mark greeting as sent if user is conversation starter
      if (isCurrentUserStarter && !hasGreetingBeenSent) {
        await markGreetingSent();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    handleTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatCountdown = (timeLeft) => {
    if (!timeLeft) return '';
    return `${timeLeft.minutes}:${timeLeft.seconds.toString().padStart(2, '0')}`;
  };

  const getConnectionStatus = () => {
    if (isOfflineMode) {
      return {
        icon: <WifiOff className="w-4 h-4 text-orange-600" />,
        text: 'Offline Mode',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200'
      };
    }
    
    if (!isOnline) {
      return {
        icon: <Wifi className="w-4 h-4 text-gray-600" />,
        text: 'Cached Mode',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200'
      };
    }
    
    if (isConnected) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        text: 'Connected',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200'
      };
    }
    
    return {
      icon: <AlertCircle className="w-4 h-4 text-red-600" />,
      text: 'Disconnected',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200'
    };
  };

  if (isLoading || taskLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <ChatLoadingSkeleton count={5} />
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat Room
          </CardTitle>
          
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            {/* Connection Status Badge */}
            <Badge 
              variant="outline" 
              className={`flex items-center space-x-1 ${connectionStatus.bgColor} ${connectionStatus.borderColor} ${connectionStatus.color}`}
            >
              {connectionStatus.icon}
              <span className="text-sm font-medium">{connectionStatus.text}</span>
            </Badge>
            
            {/* Online Users Count */}
            {isOnline && (
              <span className="text-sm text-gray-500">
                {onlineUsers.length} online
              </span>
            )}
          </div>
        </div>

        {/* Offline Mode Notice */}
        {isOfflineMode && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2 text-orange-800">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                You are offline. Messages will be saved locally and synced when you're back online.
              </span>
            </div>
          </div>
        )}

        {/* Cached Mode Notice */}
        {!isOnline && !isOfflineMode && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 text-gray-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">
                Showing cached messages. Some features may be limited.
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Responsive two-pane layout */}
      <div className="flex-1 md:grid md:grid-cols-3 md:gap-4">
        {/* Left: messages + input */}
        <div className="md:col-span-2 flex flex-col h-full">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {hasMore && (
              <div className="flex justify-center">
                <Button size="sm" variant="outline" onClick={loadOlderMessages} disabled={isLoadingMore}>
                  {isLoadingMore ? 'Loading…' : 'Load older messages'}
                </Button>
              </div>
            )}
            {(error || taskError) && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">{error || taskError}</span>
              </div>
            )}

            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No messages yet</p>
                  {conversationStarter && isCurrentUserStarter && !hasGreetingBeenSent && (
                    <p className="text-sm mt-1">You should start the conversation!</p>
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              (message.is_system_message || message.message_type === 'system') ? (
                <div key={message.id} className="flex justify-center">
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-1">
                    {message.message_text}
                  </div>
                </div>
              ) : (
                <div 
                  key={message.id} 
                  className={`flex items-end gap-2 ${
                    message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender_id !== user?.id && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.sender_avatar} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.message_text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.created_at)}
                      {message.is_read && (
                        <span className="ml-2">✓</span>
                      )}
                    </p>
                  </div>

                  {message.sender_id === user?.id && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            ))}

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>Someone is typing...</span>
              </div>
            )}

            <div ref={lastMessageRef} />
          </CardContent>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isCurrentUserStarter && !hasGreetingBeenSent
                    ? "Start the conversation..."
                    : isOfflineMode
                    ? "Message will be saved offline..."
                    : "Type your message..."
                }
                disabled={false}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="sm"
              >
                {isOfflineMode ? (
                  <WifiOff className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Offline message indicator */}
            {isOfflineMode && (
              <div className="mt-2 flex items-center space-x-2 text-orange-600 text-xs">
                <WifiOff className="w-3 h-3" />
                <span>Message will be synced when you're back online</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: task panel */}
        <div className="hidden md:block md:col-span-1 border-l">
          <div className="p-4 space-y-4 overflow-y-auto max-h-full">
            {hasActiveTask() && (
              <TaskStatusPanel
                taskStatus={taskStatus}
                onSubmitTask={(task) => {
                  console.log('Submit task:', task);
                }}
                onViewTask={(task) => {
                  console.log('View task:', task);
                }}
                onCompleteTask={(taskId) => {
                  completeTaskViaChat(taskId).catch(console.error);
                }}
                isLoading={taskLoading}
              />
            )}

            {taskNotifications.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Task Notifications</h4>
                  <Badge variant="outline" className="text-xs">
                    {getUnreadNotificationsCount()} unread
                  </Badge>
                </div>
                <div className="space-y-2">
                  {taskNotifications.slice(0, 5).map((notification, index) => (
                    <TaskNotification
                      key={`${notification.task_id}-${index}`}
                      notification={notification}
                      onMarkRead={markNotificationRead}
                      onClose={(id) => {
                        console.log('Close notification:', id);
                      }}
                      onAction={(notification) => {
                        console.log('Notification action:', notification);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tasks Drawer */}
      <div className="md:hidden border-t p-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowTasks(true)}>
          Tasks <Badge variant="secondary" className="ml-2">{getUnreadNotificationsCount()}</Badge>
        </Button>
      </div>

      <Dialog open={showTasks} onOpenChange={setShowTasks}>
        <DialogContent className="w-[92vw] sm:max-w-md">
          <UIDialogHeader>
            <UIDialogTitle>Tasks</UIDialogTitle>
          </UIDialogHeader>
          <div className="space-y-4">
            {hasActiveTask() && (
              <TaskStatusPanel
                taskStatus={taskStatus}
                onSubmitTask={(task) => {
                  console.log('Submit task:', task);
                }}
                onViewTask={(task) => {
                  console.log('View task:', task);
                }}
                onCompleteTask={(taskId) => {
                  completeTaskViaChat(taskId).catch(console.error);
                }}
                isLoading={taskLoading}
              />
            )}
            {taskNotifications.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Notifications</h4>
                  <Badge variant="outline" className="text-xs">{getUnreadNotificationsCount()} unread</Badge>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {taskNotifications.map((notification, index) => (
                    <TaskNotification
                      key={`${notification.task_id}-${index}`}
                      notification={notification}
                      onMarkRead={markNotificationRead}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat; 