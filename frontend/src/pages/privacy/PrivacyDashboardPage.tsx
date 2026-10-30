import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PrivacyScan } from '../../types';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { EyeOff, ShieldCheck, FileText, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const PrivacyDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['privacy-stats'],
    queryFn: async () => {
      const res = await api.get('/privacy/stats');
      return res.data.data as {
        totalFindings: number;
        totalScans: number;
        byCategory: Array<{ category: string; count: number }>;
        byStatus: Array<{ status: string; count: number }>;
      };
    },
  });

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ['privacy-scans'],
    queryFn: async () => {
      const res = await api.get('/privacy/scans');
      return res.data.data as PrivacyScan[];
    },
  });

  if (statsLoading || scansLoading) {
    return <LoadingSpinner message="Scanning privacy exposure inventory..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Privacy Exposure & Redaction Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated sensitive data identification, categorical masking, and cryptographic digest verification.
          </p>
        </div>

        <Link
          to="/app/privacy/scan"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <EyeOff className="w-4 h-4 text-cyan-200" />
          <span>Launch Privacy Scanner</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sensitive Items</span>
            <EyeOff className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono text-white">{stats?.totalFindings || 0}</div>
          <span className="text-xs text-slate-500">Detected across all events and scans</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Privacy Scans</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">{stats?.totalScans || 0}</div>
          <span className="text-xs text-slate-500">Interactive and automated jobs</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Protected Categories</span>
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black font-mono text-blue-400">{stats?.byCategory.length || 0}</div>
          <span className="text-xs text-slate-500">Active pattern & Luhn filters</span>
        </div>
      </div>

      {/* Scans History Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Recent Privacy Scans</h2>
          <span className="text-xs text-slate-500 font-mono">Append-Only Audit Linked</span>
        </div>

        {!scans || scans.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={EyeOff}
              title="No Privacy Scans Recorded"
              description="Scan text, API logs, or user data to inspect sensitive tokens and test automatic redaction."
              actionText="Scan Data Now"
              onAction={() => navigate('/app/privacy/scan')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold font-sans">
                <tr>
                  <th className="py-3 px-4">Scan Type</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Findings</th>
                  <th className="py-3 px-4">Redacted</th>
                  <th className="py-3 px-4">Input Digest</th>
                  <th className="py-3 px-4">Audited At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-200 capitalize">
                      {scan.scanType.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        scan.riskLevel === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                        scan.riskLevel === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' :
                        scan.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}>
                        {scan.riskLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-bold">
                      {scan.totalFindings}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      {scan.redactedCount}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 truncate max-w-[120px]">
                      {scan.inputDigest?.substring(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">
                      {new Date(scan.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

