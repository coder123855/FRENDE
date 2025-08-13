import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  Target, 
  BarChart3, 
  PieChart,
  Calendar,
  Star,
  Trophy,
  Users,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const TaskStatistics = ({ matchId }) => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user, timeRange]);

  const fetchStatistics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/statistics?time_range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching task statistics:', error);
    } finally {
      setLoading(false);
    }
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

  const calculateCompletionRate = () => {
    const total = statistics.total_tasks_created || 0;
    const completed = statistics.total_tasks_completed || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getAverageCompletionTime = () => {
    const avgTime = statistics.average_completion_time || 0;
    if (avgTime < 1) {
      return `${Math.round(avgTime * 60)} minutes`;
    }
    return `${Math.round(avgTime)} hours`;
  };

  const renderProgressBar = (value, max, color = 'bg-blue-500') => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Completed</p>
                <p className="text-2xl font-bold text-blue-900">
                  {statistics.total_tasks_completed || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Coins Earned</p>
                <p className="text-2xl font-bold text-green-900">
                  {statistics.total_coins_earned || 0}
                </p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Completion Rate</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {calculateCompletionRate()}%
                </p>
              </div>
              <Target className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Time</p>
                <p className="text-2xl font-bold text-purple-900">
                  {getAverageCompletionTime()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="difficulty">By Difficulty</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics.recent_activity?.slice(0, 5).map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(task.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {task.final_coin_reward} coins
                      </Badge>
                    </div>
                  ))}
                  {(!statistics.recent_activity || statistics.recent_activity.length === 0) && (
                    <div className="text-center py-4 text-gray-500">
                      <Star className="w-8 h-8 mx-auto mb-2" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completion Rate</span>
                    <span>{calculateCompletionRate()}%</span>
                  </div>
                  {renderProgressBar(calculateCompletionRate(), 100, 'bg-green-500')}
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Efficiency</span>
                    <span>{statistics.average_completion_time ? 
                      `${Math.round(statistics.average_completion_time)}h` : 'N/A'}</span>
                  </div>
                  {renderProgressBar(
                    statistics.average_completion_time || 0, 
                    24, 
                    'bg-blue-500'
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Coins per Task</span>
                    <span>{statistics.total_tasks_completed > 0 ? 
                      Math.round(statistics.total_coins_earned / statistics.total_tasks_completed) : 0}</span>
                  </div>
                  {renderProgressBar(
                    statistics.total_coins_earned || 0,
                    (statistics.total_tasks_completed || 0) * 20, // Assuming max 20 coins per task
                    'bg-yellow-500'
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Tasks by Difficulty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.tasks_by_difficulty && Object.entries(statistics.tasks_by_difficulty).map(([difficulty, count]) => (
                  <div key={difficulty} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getDifficultyColor(difficulty)}>
                        {difficulty}
                      </Badge>
                      <span className="font-medium">{count} tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {statistics.completion_rate_by_difficulty?.[difficulty] ? 
                          `${Math.round(statistics.completion_rate_by_difficulty[difficulty] * 100)}%` : '0%'}
                      </span>
                      {renderProgressBar(
                        statistics.completion_rate_by_difficulty?.[difficulty] || 0,
                        1,
                        difficulty === 'easy' ? 'bg-green-500' : 
                        difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Tasks by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.tasks_by_category && Object.entries(statistics.tasks_by_category).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getCategoryColor(category)}>
                        {category}
                      </Badge>
                      <span className="font-medium">{count} tasks</span>
                    </div>
                    <div className="w-32">
                      {renderProgressBar(count, Math.max(...Object.values(statistics.tasks_by_category)), 'bg-purple-500')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Completion Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.recent_activity?.map((task, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-600">
                        Completed {new Date(task.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {task.final_coin_reward} coins
                      </Badge>
                      {task.difficulty && (
                        <Badge className={getDifficultyColor(task.difficulty)}>
                          {task.difficulty}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {(!statistics.recent_activity || statistics.recent_activity.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-4" />
                    <p>No completed tasks yet</p>
                    <p className="text-sm">Complete your first task to see it here!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskStatistics; 