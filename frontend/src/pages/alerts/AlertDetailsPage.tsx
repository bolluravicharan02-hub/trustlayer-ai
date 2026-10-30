import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SecurityAlert, AlertStatus } from '../../types';
import { SeverityBadge, StatusBadge } from '../../components/common/Badge';
import { RiskScoreGauge } from '../../components/common/RiskScoreGauge';
import { LoadingSpinner } from '../../components/common/LoadingState';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  User,
  Bot,
  HelpCircle,
  AlertOctagon,
  Cpu
} from 'lucide-react';

export const AlertDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [newNote, setNewNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch alert details
  const { data: alert, isLoading } = useQuery({
    queryKey: ['security-alert', id],
    queryFn: async () => {
      const res = await api.get(`/alerts/${id}`);
      return res.data.data as SecurityAlert;
    },
    enabled: Boolean(id),
  });

  // Update Status Mutation
  const statusMutation = useMutation({
    mutationFn: async (status: AlertStatus) => {
      await api.patch(`/alerts/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alert', id] });
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      toast.success('Alert status updated successfully.');
    },
  });

  // Add Note Mutation
  const noteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      await api.post(`/alerts/${id}/notes`, { note: noteText });
    },
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['security-alert', id] });
      toast.success('Investigation note saved.');
    },
  });

  // Request AI Analysis
  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const res = await api.post(`/alerts/${id}/analyze`);
      queryClient.invalidateQueries({ queryKey: ['security-alert', id] });
      toast.success('AI Security Investigation completed!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'AI Investigation failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading alert evidence and telemetry..." />;
  }

  if (!alert) {
    return (
      <div className="p-8 text-center text-slate-400">
        Alert not found.
      </div>
    );
  }

  const latestAiRun = alert.aiRuns?.[0]?.output || null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link to="/app/alerts" className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Alerts</span>
        </Link>

        {/* Status Transition Control */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status:</span>
          <select
            value={alert.status}
            onChange={(e) => statusMutation.mutate(e.target.value as AlertStatus)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
          >
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>
      </div>

      {/* Alert Header & Risk Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-3">
            <SeverityBadge severity={alert.severity} />
            <span className="text-xs font-mono text-slate-500">{alert.ruleCode}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">{alert.title}</h1>
          <p className="text-sm text-slate-300 leading-relaxed">{alert.description}</p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400">
            <div>
              <span className="text-slate-500 block">Category</span>
              <span className="text-slate-200 capitalize font-medium">{alert.category.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Detection Timestamp</span>
              <span className="text-slate-200 font-medium">{new Date(alert.createdAt).toUTCString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Assigned Analyst</span>
              <span className="text-slate-200 font-medium">{alert.assignedToName || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        <div>
          <RiskScoreGauge score={alert.riskScore} size="lg" />
        </div>
      </div>

      {/* AI Investigation Trigger / Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900/60 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Sparkles className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Grok AI Security Copilot
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                Explainable
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate structured natural-language reasoning, root cause analysis, alternative hypotheses, and safe remediation steps.
            </p>
          </div>
        </div>

        <button
          onClick={handleAnalyzeWithAI}
          disabled={isAnalyzing}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/25 flex items-center gap-2 shrink-0"
        >
          {isAnalyzing ? (
            <>
              <LoadingSpinner message="Consulting Grok..." />
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>{latestAiRun ? 'Re-Analyze Incident' : 'Explain with AI'}</span>
            </>
          )}
        </button>
      </div>

      {/* AI Generated Findings (if present) */}
      {latestAiRun && (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <Bot className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">AI Incident Analysis Report</h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                Model: {alert.aiRuns?.[0]?.modelName}
              </span>
            </div>
            {latestAiRun.likely_intent && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-300">
                Likely Intent: <span className="text-cyan-400">{latestAiRun.likely_intent}</span>
              </span>
            )}
          </div>

          {/* AI Summary */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Executive Incident Summary
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              {latestAiRun.summary}
            </p>
          </div>

          {/* Key Observations */}
          {latestAiRun.observations && latestAiRun.observations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Key Observations & Confidence Assessment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {latestAiRun.observations.map((obs, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{obs.description}</span>
                      <span className="text-[11px] font-mono text-cyan-400 font-bold">
                        {(obs.confidence * 100).toFixed(0)}% Conf.
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-mono">{obs.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Explanations */}
          {latestAiRun.alternative_explanations && latestAiRun.alternative_explanations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Plausible Alternative Explanations
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {latestAiRun.alternative_explanations.map((alt, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Potential Impact */}
          {latestAiRun.potential_impact && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Potential Security Impact
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                {latestAiRun.potential_impact}
              </p>
            </div>
          )}

          {/* AI Recommended Actions */}
          {latestAiRun.recommended_actions && latestAiRun.recommended_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Recommended Investigative & Mitigation Steps
              </h4>
              <div className="space-y-2">
                {latestAiRun.recommended_actions.map((act, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200 block">{act.action}</span>
                      <span className="text-slate-400 text-[11px]">{act.reason}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {act.priority}
                      </span>
                      {act.requires_approval && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Requires Approval
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Human Review Requirement Banner */}
          {latestAiRun.requires_human_review && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-3">
              <AlertOctagon className="w-5 h-5 shrink-0 text-amber-400" />
              <span>
                <strong>Human Oversight Mandatory:</strong> Automated account termination or blocking is strictly restricted. Consequential mitigation steps must be verified and authorized by a security analyst.
              </span>
            </div>
          )}

          {/* Disclaimers & Limitations */}
          {latestAiRun.limitations && latestAiRun.limitations.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">Model Limitations: </span>
              {latestAiRun.limitations.join(' ')}
            </div>
          )}
        </div>
      )}

      {/* Deterministic Evidence Section */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Deterministic Rule Evidence</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">Mathematically Verified Findings</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.isArray(alert.evidence) && alert.evidence.map((ev, i) => (
            <div key={i} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-500 block uppercase font-mono font-semibold text-[11px]">{ev.key}</span>
              <span className="text-slate-200 font-mono block break-all">{String(ev.value)}</span>
              {ev.description && <span className="text-[11px] text-slate-400">{ev.description}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Investigation Notes & Comment Stream */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-bold text-white">Investigation Notes & Collaboration</h3>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {alert.notes && alert.notes.length > 0 ? (
            alert.notes.map((note) => (
              <div key={note.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-slate-200">{note.authorName}</span>
                  <span className="text-[11px] font-mono">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{note.note}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No notes recorded yet. Add an investigation note below.</p>
          )}
        </div>

        {/* Add Note Input */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an investigation observation or resolution justification..."
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            onClick={() => {
              if (newNote.trim()) noteMutation.mutate(newNote);
            }}
            disabled={!newNote.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};

