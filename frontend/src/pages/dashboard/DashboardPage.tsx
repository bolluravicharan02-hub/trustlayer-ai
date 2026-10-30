import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { DashboardSummary } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  EyeOff,
  CheckCircle,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  // 1. Summary KPIs
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data.data as DashboardSummary;
    },
  });

  // 2. Events Timeline Chart
  const { data: timelineData } = useQuery({
    queryKey: ['dashboard-timeline'],
    queryFn: async () => {
      const res = await api.get('/dashboard/events-timeline');
      return res.data.data as Array<{ date: string; count: number }>;
    },
  });

  // 3. Alerts Distribution Chart
  const { data: alertsDist } = useQuery({
    queryKey: ['dashboard-alerts-dist'],
    queryFn: async () => {
      const res = await api.get('/dashboard/alerts-distribution');
      return res.data.data as Array<{ severity: string; count: number }>;
    },
  });

  // 4. Privacy Categories Chart
  const { data: privacyDist } = useQuery({
    queryKey: ['dashboard-privacy-dist'],
    queryFn: async () => {
      const res = await api.get('/dashboard/privacy-distribution');
      return res.data.data as Array<{ category: string; count: number }>;
    },
  });

  // 5. Recent Activity Stream
  const { data: recentActivity } = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: async () => {
      const res = await api.get('/dashboard/recent-activity');
      return res.data.data as Array<{
        id: string;
        action: string;
        resourceType: string;
        actorName?: string;
        createdAt: string;
      }>;
    },
  });

  if (summaryLoading) {
    return <LoadingSpinner message="Aggregating security and privacy telemetry..." />;
  }

  const summary = summaryData || {
    totalEvents: 0,
    openAlerts: 0,
    criticalAlerts: 0,
    privacyFindings: 0,
    redactedItems: 0,
    resolvedIncidents: 0,
  };

  const severityColorMap: Record<string, string> = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#3B82F6',
    informational: '#64748B',
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Security & Privacy Posture
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time deterministic telemetry, risk assessment, and AI trust governance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/app/events/ingest"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Activity className="w-4 h-4" />
            <span>Ingest Telemetry</span>
          </Link>
          <Link
            to="/app/privacy/scan"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <EyeOff className="w-4 h-4 text-cyan-400" />
            <span>Scan Privacy</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Events */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Events</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{summary.totalEvents}</div>
          <span className="text-[11px] text-slate-500">Ingested logs</span>
        </div>

        {/* Open Alerts */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">{summary.openAlerts}</div>
          <span className="text-[11px] text-slate-500">Pending review</span>
        </div>

        {/* Critical Alerts */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black font-mono text-red-400">{summary.criticalAlerts}</div>
          <span className="text-[11px] text-slate-500">Immediate action</span>
        </div>

        {/* Privacy Findings */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sensitive Items</span>
            <EyeOff className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400">{summary.privacyFindings}</div>
          <span className="text-[11px] text-slate-500">PII / secrets detected</span>
        </div>

        {/* Redacted Items */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Redacted</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">{summary.redactedItems}</div>
          <span className="text-[11px] text-slate-500">Sanitized tokens</span>
        </div>

        {/* Resolved Incidents */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-400">{summary.resolvedIncidents}</div>
          <span className="text-[11px] text-slate-500">Closed incidents</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Over Time Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-white">Security Ingestion Velocity</h2>
              <p className="text-xs text-slate-400">Events processed over the last 14 days</p>
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              Active Telemetry
            </span>
          </div>

          <div className="h-64 w-full">
            {timelineData && timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="eventColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A0F1D', borderColor: '#1E293B', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#eventColor)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No telemetry recorded yet in this window
              </div>
            )}
          </div>
        </div>

        {/* Alerts by Severity */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-white">Threats by Severity</h2>
              <p className="text-xs text-slate-400">Deterministic rule classification</p>
            </div>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {alertsDist && alertsDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertsDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="severity" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A0F1D', borderColor: '#1E293B', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Zero active alerts detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Privacy Categories */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Sensitive Data Categories Detected</h2>
              <p className="text-xs text-slate-400">Automated classification across scanned records</p>
            </div>
            <Link to="/app/privacy" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              <span>View Privacy</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-56 w-full">
            {privacyDist && privacyDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={privacyDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis dataKey="category" type="category" stroke="#64748B" fontSize={10} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A0F1D', borderColor: '#1E293B', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#06B6D4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Zero privacy exposures detected
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Audit Feed */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Append-Only Audit Stream</h2>
              <p className="text-xs text-slate-400">Cryptographically chained activity log</p>
            </div>
            <Link to="/app/audit" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              <span>Verify Chain</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <span className="font-semibold text-slate-200">{act.action}</span>
                      <span className="text-slate-500 block text-[11px]">{act.actorName || 'System'}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                No recent organization activity recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

