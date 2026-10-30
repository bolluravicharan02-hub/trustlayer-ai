import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SecurityAlert, AlertSeverity, AlertStatus } from '../../types';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { RiskScoreGauge } from '../../components/common/RiskScoreGauge';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const AlertsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['security-alerts', page, search, severity, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
        ...(severity ? { severity } : {}),
        ...(status ? { status } : {}),
      });
      const res = await api.get(`/alerts?${params.toString()}`);
      return {
        items: res.data.data as SecurityAlert[],
        meta: res.data.meta as { page: number; limit: number; total: number; totalPages: number },
      };
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await api.patch(`/alerts/${alertId}/status`, { status: 'acknowledged', reason: 'Quick acknowledged from Alert Center' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Alert marked as acknowledged.');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Threat Alert Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic detections, bounded risk scores (0–100), and explainable investigation workflows.
          </p>
        </div>

        <Link
          to="/app/events/ingest"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Ingest Telemetry</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search alert title, rule code (e.g. RULE_BRUTE_FORCE)..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <select
          value={severity}
          onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical (90-100)</option>
          <option value="high">High (75-89)</option>
          <option value="medium">Medium (50-74)</option>
          <option value="low">Low (25-49)</option>
          <option value="informational">Informational (0-24)</option>
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8">
            <TableSkeleton rows={8} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={AlertTriangle}
              title="No Security Alerts Found"
              description="No active security alerts match your selected filters. Threat detection rules monitor all incoming telemetry automatically."
              actionText="Ingest Sample Logs"
              onAction={() => navigate('/app/events/ingest')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Threat Alert</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Detected</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.items.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <Link to={`/app/alerts/${alert.id}`} className="hover:text-blue-400 transition block">
                        {alert.title}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-500 block">{alert.ruleCode}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 capitalize">
                      {alert.category.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskScoreGauge score={alert.riskScore} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(alert.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                        >
                          Ack
                        </button>
                      )}
                      <Link
                        to={`/app/alerts/${alert.id}`}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1 shadow-md shadow-blue-600/15"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-200" />
                        <span>Investigate</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="font-semibold text-slate-200">{data.meta.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{data.meta.totalPages}</span> ({data.meta.total} alerts)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-200 hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-200 hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

