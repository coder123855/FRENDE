import { useState, useCallback, useEffect } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';

/**
 * Hook for managing user statistics and analytics
 */
export const useUserStats = (userId = null) => {
    const { user: currentUser } = useAuth();
    const targetUserId = userId || currentUser?.id;

    // State management
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y, all
    const [refreshInterval, setRefreshInterval] = useState(null);

    // API hooks
    const getStatsApi = useApi(`/api/users/${targetUserId}/stats`, { immediate: false });
    const getActivityApi = useApi(`/api/users/${targetUserId}/activity`, { immediate: false });
    const getAchievementsApi = useApi(`/api/users/${targetUserId}/achievements`, { immediate: false });

    // Load user statistics
    const loadStats = useCallback(async () => {
        if (!targetUserId) return;

        try {
            setLoading(true);
            setError(null);
            
            const [statsResult, activityResult, achievementsResult] = await Promise.all([
                getStatsApi.execute(),
                getActivityApi.execute(),
                getAchievementsApi.execute()
            ]);

            const combinedStats = {
                general: statsResult || {},
                activity: activityResult || {},
                achievements: achievementsResult || {},
                lastUpdated: new Date().toISOString()
            };

            setStats(combinedStats);
        } catch (err) {
            setError(err.message || 'Failed to load statistics');
            console.error('Error loading statistics:', err);
        } finally {
            setLoading(false);
        }
    }, [targetUserId, getStatsApi, getActivityApi, getAchievementsApi]);

    // Refresh statistics
    const refreshStats = useCallback(async () => {
        await loadStats();
    }, [loadStats]);

    // Set auto-refresh interval
    const setAutoRefresh = useCallback((intervalMinutes = 5) => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        if (intervalMinutes > 0) {
            const interval = setInterval(refreshStats, intervalMinutes * 60 * 1000);
            setRefreshInterval(interval);
        }
    }, [refreshStats, refreshInterval]);

    // Stop auto-refresh
    const stopAutoRefresh = useCallback(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [refreshInterval]);

    // Get computed statistics
    const getComputedStats = useCallback(() => {
        if (!stats) return null;

        const general = stats.general || {};
        const activity = stats.activity || {};
        const achievements = stats.achievements || {};

        return {
            // Profile statistics
            profileViews: general.profile_views || 0,
            profileCompleteness: general.profile_completeness || 0,
            memberSince: general.member_since || null,
            lastActive: general.last_active || null,

            // Matching statistics
            totalMatches: general.total_matches || 0,
            activeMatches: general.active_matches || 0,
            completedMatches: general.completed_matches || 0,
            matchSuccessRate: general.total_matches > 0 
                ? Math.round((general.completed_matches / general.total_matches) * 100) 
                : 0,

            // Task statistics
            totalTasks: general.total_tasks || 0,
            completedTasks: general.completed_tasks || 0,
            taskCompletionRate: general.total_tasks > 0 
                ? Math.round((general.completed_tasks / general.total_tasks) * 100) 
                : 0,
            averageTaskTime: general.average_task_time || 0,

            // Chat statistics
            totalMessages: general.total_messages || 0,
            messagesSent: general.messages_sent || 0,
            messagesReceived: general.messages_received || 0,
            averageResponseTime: general.average_response_time || 0,

            // Coin statistics
            totalCoinsEarned: general.total_coins_earned || 0,
            totalCoinsSpent: general.total_coins_spent || 0,
            currentBalance: general.current_balance || 0,
            coinsPerDay: general.coins_per_day || 0,

            // Activity statistics
            dailyActiveDays: activity.daily_active_days || 0,
            weeklyActiveWeeks: activity.weekly_active_weeks || 0,
            monthlyActiveMonths: activity.monthly_active_months || 0,
            longestStreak: activity.longest_streak || 0,
            currentStreak: activity.current_streak || 0,

            // Achievement statistics
            totalAchievements: achievements.total_achievements || 0,
            unlockedAchievements: achievements.unlocked_achievements || 0,
            achievementProgress: achievements.achievement_progress || 0,
            recentAchievements: achievements.recent_achievements || [],

            // Engagement metrics
            engagementScore: calculateEngagementScore(general, activity),
            socialScore: calculateSocialScore(general),
            activityLevel: getActivityLevel(activity),
            userRank: calculateUserRank(general, activity, achievements)
        };
    }, [stats]);

    // Calculate engagement score
    const calculateEngagementScore = useCallback((general, activity) => {
        const factors = {
            profileCompleteness: (general.profile_completeness || 0) * 0.2,
            taskCompletion: (general.completed_tasks || 0) / Math.max(general.total_tasks || 1, 1) * 0.3,
            messageActivity: Math.min((general.total_messages || 0) / 100, 1) * 0.2,
            dailyActivity: Math.min((activity.daily_active_days || 0) / 30, 1) * 0.2,
            matchSuccess: (general.completed_matches || 0) / Math.max(general.total_matches || 1, 1) * 0.1
        };

        return Math.round(Object.values(factors).reduce((sum, factor) => sum + factor, 0) * 100);
    }, []);

    // Calculate social score
    const calculateSocialScore = useCallback((general) => {
        const factors = {
            messagesSent: Math.min((general.messages_sent || 0) / 50, 1) * 0.4,
            messagesReceived: Math.min((general.messages_received || 0) / 50, 1) * 0.3,
            activeMatches: Math.min((general.active_matches || 0) / 5, 1) * 0.3
        };

        return Math.round(Object.values(factors).reduce((sum, factor) => sum + factor, 0) * 100);
    }, []);

    // Get activity level
    const getActivityLevel = useCallback((activity) => {
        const dailyActiveDays = activity.daily_active_days || 0;
        const currentStreak = activity.current_streak || 0;

        if (currentStreak >= 7) return 'very_active';
        if (dailyActiveDays >= 20) return 'active';
        if (dailyActiveDays >= 10) return 'moderate';
        if (dailyActiveDays >= 5) return 'low';
        return 'inactive';
    }, []);

    // Calculate user rank
    const calculateUserRank = useCallback((general, activity, achievements) => {
        const engagementScore = calculateEngagementScore(general, activity);
        const socialScore = calculateSocialScore(general);
        const achievementProgress = achievements.achievement_progress || 0;

        const totalScore = (engagementScore * 0.4) + (socialScore * 0.3) + (achievementProgress * 0.3);

        if (totalScore >= 90) return 'elite';
        if (totalScore >= 80) return 'expert';
        if (totalScore >= 70) return 'advanced';
        if (totalScore >= 50) return 'intermediate';
        if (totalScore >= 30) return 'beginner';
        return 'newcomer';
    }, [calculateEngagementScore, calculateSocialScore]);

    // Get time-based statistics
    const getTimeBasedStats = useCallback((range = timeRange) => {
        if (!stats?.activity?.time_series) return null;

        const timeSeries = stats.activity.time_series;
        const now = new Date();
        const ranges = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365,
            'all': Infinity
        };

        const days = ranges[range] || 30;
        const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        return timeSeries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= cutoffDate;
        });
    }, [stats, timeRange]);

    // Get achievement progress
    const getAchievementProgress = useCallback(() => {
        if (!stats?.achievements?.categories) return null;

        return stats.achievements.categories.map(category => ({
            name: category.name,
            total: category.total,
            unlocked: category.unlocked,
            progress: category.total > 0 ? Math.round((category.unlocked / category.total) * 100) : 0
        }));
    }, [stats]);

    // Get recent activity
    const getRecentActivity = useCallback((limit = 10) => {
        if (!stats?.activity?.recent_activities) return [];

        return stats.activity.recent_activities
            .slice(0, limit)
            .map(activity => ({
                ...activity,
                timeAgo: getTimeAgo(new Date(activity.timestamp))
            }));
    }, [stats]);

    // Helper function to get time ago
    const getTimeAgo = useCallback((date) => {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    }, []);

    // Export statistics
    const exportStats = useCallback(() => {
        if (!stats) return null;

        const exportData = {
            statistics: stats,
            computed: getComputedStats(),
            exported_at: new Date().toISOString(),
            time_range: timeRange,
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `frende-stats-${targetUserId}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }, [stats, getComputedStats, timeRange, targetUserId]);

    // Load stats on mount or user change
    useEffect(() => {
        if (targetUserId) {
            loadStats();
        }
    }, [targetUserId, loadStats]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [refreshInterval]);

    return {
        // Data and state
        stats,
        loading,
        error,
        timeRange,

        // Actions
        loadStats,
        refreshStats,
        setTimeRange,
        setAutoRefresh,
        stopAutoRefresh,
        exportStats,

        // Computed values
        computedStats: getComputedStats(),
        timeBasedStats: getTimeBasedStats(),
        achievementProgress: getAchievementProgress(),
        recentActivity: getRecentActivity(),

        // Utilities
        isOwnStats: !userId || userId === currentUser?.id,
        hasData: !!stats,
        lastUpdated: stats?.lastUpdated
    };
};
