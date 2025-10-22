'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, MessageSquare, Mail, Activity, TrendingUp, Eye } from 'lucide-react';

interface DashboardStats {
  activeUsers: number;
  onlineUsers: number;
  messagesSent: number;
  contactMessages: number;
  activeGroups: number;
  totalChannels: number;
  helpfulPercentage: number;
  averageStreak: number;
  feedbackStars: number;
  timestamp?: string;
  dailyStats: Array<{
    date: string;
    activeUsers: number;
    onlineUsers: number;
    messagesSent: number;
    contactMessages: number;
    activeGroups: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);
  const [realtimeStats, setRealtimeStats] = useState<Partial<DashboardStats>>({});
  
  useEffect(() => {
    fetchStats();
  }, [period]);
  
  // Set up real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/admin/realtime');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRealtimeStats(data);
      } catch (error) {
        console.error('Failed to parse real-time data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('Real-time connection error:', error);
    };
    
    return () => {
      eventSource.close();
    };
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/stats?period=${period}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white/10 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-white/10 rounded-lg"></div>
        </div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Failed to Load Stats</h1>
          <p className="text-white/70">Unable to fetch dashboard statistics.</p>
        </div>
      </div>
    );
  }
  
  // Use real-time data when available, fallback to period data
  const currentStats = {
    activeUsers: realtimeStats.activeUsers ?? stats?.activeUsers ?? 0,
    onlineUsers: realtimeStats.onlineUsers ?? stats?.onlineUsers ?? 0,
    messagesSent: realtimeStats.messagesSent ?? stats?.messagesSent ?? 0,
    contactMessages: realtimeStats.contactMessages ?? stats?.contactMessages ?? 0,
    activeGroups: realtimeStats.activeGroups ?? stats?.activeGroups ?? 0,
    totalChannels: realtimeStats.totalChannels ?? stats?.totalChannels ?? 0,
    helpfulPercentage: realtimeStats.helpfulPercentage ?? stats?.helpfulPercentage ?? 0,
    averageStreak: realtimeStats.averageStreak ?? stats?.averageStreak ?? 0,
    feedbackStars: realtimeStats.feedbackStars ?? stats?.feedbackStars ?? 0
  };

  const statCards = [
    {
      title: 'Messages',
      value: formatNumber(currentStats.messagesSent),
      icon: MessageSquare,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Channels',
      value: currentStats.totalChannels,
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    },
    {
      title: 'Helpful',
      value: `${currentStats.helpfulPercentage}%`,
      icon: TrendingUp,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'Streak',
      value: `${currentStats.averageStreak}d`,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    },
    {
      title: 'Online Users',
      value: currentStats.onlineUsers,
      icon: Eye,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Active Groups',
      value: currentStats.activeGroups,
      icon: Activity,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-500/30'
    }
  ];

  // Helper function to format large numbers
  function formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          {realtimeStats.timestamp && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} ${card.borderColor} border rounded-lg p-6 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis 
                stroke="#9ca3af" 
                domain={[0, 'dataMax']}
                tickCount={6}
                allowDecimals={false}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Line 
                type="monotone" 
                dataKey="activeUsers" 
                stroke="#00d9ff" 
                strokeWidth={2}
                name="Active Users"
              />
              <Line 
                type="monotone" 
                dataKey="onlineUsers" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Online Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Messages Chart */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Messages & Contact</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis 
                stroke="#9ca3af" 
                domain={[0, 'dataMax']}
                tickCount={6}
                allowDecimals={false}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="messagesSent" fill="#8b5cf6" name="Messages Sent" />
              <Bar dataKey="contactMessages" fill="#f59e0b" name="Contact Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
