import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { LoadingSpinner, ErrorCard } from '../../components/common/LoadingState';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileCode,
  Shield,
  EyeOff,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export const ReportsPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: overview,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => {
      const res = await api.get('/reports/overview');
      return res.data.data;
    },
  });

  const handleExport = async (type: string, format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const response = await api.get(`/reports/export?type=${type}&format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `trustlayer-${type}-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const jsonStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `trustlayer-${type}-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      toast.success(`${type.toUpperCase()} report exported successfully in ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export report.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Generating executive security and compliance report..." />;
  }

  if (isError) {
    return (
      <ErrorCard
        title="Compliance Report Generation Failed"
        message="Unable to aggregate telemetry metrics for executive reporting. Please verify backend status."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Compliance & Security Reports
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export organization telemetry, threat detections, and privacy audits for external compliance and executive review.
        </p>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Threat Alerts Report */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Threat Detection Report</h3>
            <p className="text-xs text-slate-400 mt-1">
              Full registry of deterministic security alerts, risk scores, status changes, and analyst assignments.
            </p>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => handleExport('alerts', 'json')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => handleExport('alerts', 'csv')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Privacy Findings Report */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Privacy Exposure Report</h3>
            <p className="text-xs text-slate-400 mt-1">
              Inventory of detected sensitive items, safe masked previews, confidence levels, and categorical classifications.
            </p>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => handleExport('privacy', 'json')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => handleExport('privacy', 'csv')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Raw Telemetry Report */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Security Events Log Report</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sanitized event telemetry, source IPs, actor identifiers, and ISO-8601 execution timestamps.
            </p>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => handleExport('events', 'json')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => handleExport('events', 'csv')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Overview Card */}
      {overview && (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Executive Posture Summary</h2>
              <span className="text-xs text-slate-400">Organization: {overview.organization.name}</span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Generated: {new Date(overview.generatedAt).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Total Events</span>
              <span className="text-lg font-bold text-white">{overview.metrics.totalEvents}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Total Alerts</span>
              <span className="text-lg font-bold text-amber-400">{overview.metrics.totalAlerts}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Privacy Findings</span>
              <span className="text-lg font-bold text-cyan-400">{overview.metrics.totalPrivacyFindings}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">AI Analysis Runs</span>
              <span className="text-lg font-bold text-purple-400">{overview.metrics.totalAiRuns}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

