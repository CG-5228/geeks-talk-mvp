'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Users,
  MessageSquare,
  Activity,
  TrendingUp,
  Eye,
  Gauge,
  Shield,
  Bug,
  UserCheck,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';

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
  pendingReports: number;
  openBugs: number;
  totalUsers: number;
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

function formatNumber(num: number): string {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export default function AdminDashboard() {
  const params = useParams<{ hash: string }>();
  const router = useRouter();
  const hash = params?.hash;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);
  const [realtimeStats, setRealtimeStats] = useState<Partial<DashboardStats>>({});

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/admin/stats?period=${period}`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  useEffect(() => {
    const eventSource = new EventSource('/api/admin/realtime');
    eventSource.onmessage = (event) => {
      try {
        setRealtimeStats(JSON.parse(event.data));
      } catch (error) {
        console.error('Failed to parse real-time data:', error);
      }
    };
    eventSource.onerror = (error) => {
      console.error('Real-time connection error:', error);
    };
    return () => eventSource.close();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-error mb-4">Failed to Load Stats</h1>
        <p className="text-muted-foreground">Unable to fetch dashboard statistics.</p>
      </div>
    );
  }

  const currentStats = {
    activeUsers: realtimeStats.activeUsers ?? stats.activeUsers ?? 0,
    onlineUsers: realtimeStats.onlineUsers ?? stats.onlineUsers ?? 0,
    messagesSent: realtimeStats.messagesSent ?? stats.messagesSent ?? 0,
    contactMessages: realtimeStats.contactMessages ?? stats.contactMessages ?? 0,
    activeGroups: realtimeStats.activeGroups ?? stats.activeGroups ?? 0,
    totalChannels: realtimeStats.totalChannels ?? stats.totalChannels ?? 0,
    helpfulPercentage: realtimeStats.helpfulPercentage ?? stats.helpfulPercentage ?? 0,
    averageStreak: realtimeStats.averageStreak ?? stats.averageStreak ?? 0,
    pendingReports: realtimeStats.pendingReports ?? stats.pendingReports ?? 0,
    openBugs: realtimeStats.openBugs ?? stats.openBugs ?? 0,
    totalUsers: realtimeStats.totalUsers ?? stats.totalUsers ?? 0,
  };

  const isLive = Boolean(realtimeStats.timestamp);

  return (
    <div className="p-8">
      <AdminHeader
        title="Dashboard"
        description="Realtime platform health and activity."
        icon={Gauge}
        iconTone="primary"
        meta={
          isLive && (
            <div className="inline-flex items-center gap-2 text-xs text-success">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              Live data
            </div>
          )
        }
        actions={
          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-primary/15 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <StatsCard
          title="Online now"
          value={currentStats.onlineUsers}
          icon={Eye}
          tone="primary"
          hint={`of ${formatNumber(currentStats.totalUsers)} total`}
        />
        <StatsCard
          title="Active (24h)"
          value={currentStats.activeUsers}
          icon={UserCheck}
          tone="success"
          hint="users seen in last 24h"
        />
        <StatsCard
          title="Messages"
          value={formatNumber(currentStats.messagesSent)}
          icon={MessageSquare}
          tone="info"
          hint={`this ${period}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {hash && (
          <button
            type="button"
            onClick={() => router.push(`/admin/${hash}/reports`)}
            className="text-left"
            aria-label="View pending reports"
          >
            <StatsCard
              title="Pending reports"
              value={currentStats.pendingReports}
              icon={Shield}
              tone={currentStats.pendingReports > 0 ? 'warning' : 'success'}
              hint={currentStats.pendingReports > 0 ? 'needs review' : 'queue clear'}
              className="cursor-pointer hover:scale-[1.01]"
            />
          </button>
        )}
        {hash && (
          <button
            type="button"
            onClick={() => router.push(`/admin/${hash}/bugs`)}
            className="text-left"
            aria-label="View open bugs"
          >
            <StatsCard
              title="Open bugs"
              value={currentStats.openBugs}
              icon={Bug}
              tone={currentStats.openBugs > 0 ? 'error' : 'success'}
              hint={currentStats.openBugs > 0 ? 'unresolved' : 'queue clear'}
              className="cursor-pointer hover:scale-[1.01]"
            />
          </button>
        )}
        <StatsCard
          title="Channels"
          value={currentStats.totalChannels}
          icon={Activity}
          tone="accent"
          hint={`${currentStats.activeGroups} active voice groups`}
        />
        <StatsCard
          title="Contact messages"
          value={currentStats.contactMessages}
          icon={MessageSquare}
          tone="info"
          hint={`this ${period}`}
        />
        <StatsCard
          title="Helpful ratio"
          value={`${currentStats.helpfulPercentage}%`}
          icon={TrendingUp}
          tone="warning"
          hint="likes per user"
        />
        <StatsCard
          title="Avg. streak"
          value={`${currentStats.averageStreak}d`}
          icon={Users}
          tone="primary"
          hint="user engagement"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="User activity">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.08)" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                domain={[0, 'dataMax']}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--foreground) / 0.12)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeOpacity: 0.4 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="activeUsers" stroke="hsl(var(--primary))" strokeWidth={2} name="Active" dot={false} />
              <Line type="monotone" dataKey="onlineUsers" stroke="hsl(var(--success))" strokeWidth={2} name="Online" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Messages & contact">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.08)" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                domain={[0, 'dataMax']}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--foreground) / 0.12)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="messagesSent" fill="hsl(var(--accent))" name="Messages" radius={[4, 4, 0, 0]} />
              <Bar dataKey="contactMessages" fill="hsl(var(--warning))" name="Contact" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}
