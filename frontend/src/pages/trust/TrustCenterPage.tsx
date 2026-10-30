import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AIAnalysisRun } from '../../types';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import {
  Sparkles,
  Shield,
  Bot,
  Lock,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Eye,
  FileCode,
  Terminal
} from 'lucide-react';

export const TrustCenterPage: React.FC = () => {
  const [selectedRun, setSelectedRun] = useState<AIAnalysisRun | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['trust-overview'],
    queryFn: async () => {
      const res = await api.get('/trust/overview');
      return res.data.data;
    },
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['trust-ai-runs'],
    queryFn: async () => {
      const res = await api.get('/trust/ai-runs');
      return res.data.data as AIAnalysisRun[];
    },
  });

  const { data: info } = useQuery({
    queryKey: ['trust-info'],
    queryFn: async () => {
      const res = await api.get('/trust/information');
      return res.data.data;
    },
  });

  if (overviewLoading || runsLoading) {
    return <LoadingSpinner message="Loading AI model disclosures and run history..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Trust & Transparency Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Open governance, deterministic vs AI reasoning boundaries, and append-only model query auditing.
        </p>
      </div>

      {/* Model & Governance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Card */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Model Service</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
              overview?.model.isLiveConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              {overview?.model.runtimeMode}
            </span>
          </div>

          <div>
            <span className="text-2xl font-bold text-white block">{overview?.model.configuredName}</span>
            <span className="text-xs text-slate-500 font-mono">{overview?.model.provider}</span>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Total Analysis Runs:</span>
              <span className="font-mono text-white font-bold">{overview?.telemetry.totalRuns}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Average Response Latency:</span>
              <span className="font-mono text-cyan-400 font-bold">{overview?.telemetry.avgLatencyMs} ms</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Token Limit / Timeout:</span>
              <span className="font-mono text-slate-300">{overview?.model.maxOutputTokens} tok / {overview?.model.timeoutMs / 1000}s</span>
            </div>
          </div>
        </div>

        {/* Data Minimization Guarantees */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Data Minimization & Redaction Guarantees</span>
          </h2>
          <ul className="space-y-2.5 text-xs text-slate-300">
            {overview?.governance.dataSanitizationGuarantees.map((item: string, i: number) => (
              <li key={i} className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Deterministic vs AI Distinction Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-950/90 border border-blue-500/25">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
            <Shield className="w-4 h-4" />
            <span>Deterministic Rule Finding</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {overview?.governance.distinction.deterministic}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI Probabilistic Interpretation</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {overview?.governance.distinction.probabilistic}
          </p>
        </div>
      </div>

      {/* AI Analysis Run History */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Audited AI Analysis History</h2>
          <span className="text-xs text-slate-500 font-mono">Input Cryptographic Digests Logged</span>
        </div>

        {!runs || runs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No AI analysis runs recorded yet. Select an alert in Alert Center and click 'Explain with AI'.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold font-sans">
                <tr>
                  <th className="py-3 px-4">Alert Context</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">SHA-256 Input Digest</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-sans text-slate-200 font-semibold truncate max-w-[180px]">
                      {run.alertTitle || 'Standalone Investigation'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {run.modelName}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 font-bold">
                      {run.latencyMs ? `${run.latencyMs}ms` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 truncate max-w-[140px]">
                      {run.inputDigest?.substring(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">
                      {new Date(run.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Run Inspection Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">AI Analysis Execution Details</h3>
                <span className="text-xs text-slate-400 font-mono">Run ID: {selectedRun.id}</span>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-semibold">Model Used</span>
                <span className="text-slate-200 font-mono">{selectedRun.modelName}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-semibold">Latency</span>
                <span className="text-cyan-400 font-mono">{selectedRun.latencyMs} ms</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 col-span-2">
                <span className="text-slate-500 block uppercase font-semibold">Sanitized Input Digest (SHA-256)</span>
                <span className="text-slate-300 font-mono break-all">{selectedRun.inputDigest}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Validated Output Structure
              </span>
              <pre className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-cyan-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedRun.output, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

