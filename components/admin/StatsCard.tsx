'use client';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'blue',
  className = '' 
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400'
  };
  
  const changeColors = {
    increase: 'text-green-400',
    decrease: 'text-red-400',
    neutral: 'text-white/70'
  };
  
  const changeIcons = {
    increase: '↗',
    decrease: '↘',
    neutral: '→'
  };
  
  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="h-6 w-6" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm ${changeColors[change.type]}`}>
            <span>{changeIcons[change.type]}</span>
            <span>{Math.abs(change.value)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-white/70 text-sm">{title}</p>
      </div>
    </div>
  );
}
