import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SecurityPolicy } from '../../types';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Sliders, Plus, Trash2, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const PoliciesListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('authentication');
  const [policyType, setPolicyType] = useState('brute_force_rule');
  const [configJson, setConfigJson] = useState('{\n  "threshold": 5,\n  "windowMinutes": 5,\n  "action": "alert"\n}');

  const { data: policies, isLoading } = useQuery({
    queryKey: ['security-policies'],
    queryFn: async () => {
      const res = await api.get('/policies');
      return res.data.data as SecurityPolicy[];
    },
  });

  const togglePolicyMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      await api.patch(`/policies/${id}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
      toast.success('Policy state updated.');
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
      toast.success('Security policy removed.');
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: async () => {
      let configuration = {};
      try {
        configuration = JSON.parse(configJson);
      } catch {
        throw new Error('Policy configuration must be valid JSON');
      }

      await api.post('/policies', {
        name,
        description,
        category,
        policyType,
        configuration,
        isEnabled: true,
      });
    },
    onSuccess: () => {
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
      toast.success('Security policy created and enforced.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create policy.');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Security & Privacy Policies
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure organization-level detection parameters, retention windows, and privacy redaction rules.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Security Policy</span>
        </button>
      </div>

      {/* Policies List */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8">
            <TableSkeleton rows={5} />
          </div>
        ) : !policies || policies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Sliders}
              title="No Security Policies Configured"
              description="Define organization-level security rules for brute-force thresholds, privacy redaction, or bulk data export protection."
              actionText="Create Initial Policy"
              onAction={() => setCreateModalOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {policies.map((pol) => (
              <div key={pol.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{pol.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      {pol.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{pol.description}</p>
                  <div className="pt-2">
                    <pre className="font-mono text-[11px] text-cyan-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 inline-block">
                      {JSON.stringify(pol.configuration)}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pol.isEnabled}
                      onChange={(e) => togglePolicyMutation.mutate({ id: pol.id, isEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={pol.isEnabled ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {pol.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </label>

                  <button
                    onClick={() => {
                      if (confirm(`Delete policy '${pol.name}'?`)) {
                        deletePolicyMutation.mutate(pol.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Policy Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Security Policy</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPolicyMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Export Volume Restriction"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Flags export events exceeding 1,000 records"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="authentication">Authentication</option>
                    <option value="sensitive_data">Sensitive Data</option>
                    <option value="suspicious_export">Suspicious Export</option>
                    <option value="privilege_escalation">Privilege Escalation</option>
                    <option value="retention">Retention</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                    Policy Type
                  </label>
                  <input
                    type="text"
                    required
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                  Validated Configuration JSON
                </label>
                <textarea
                  rows={4}
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createPolicyMutation.isPending}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-600/20"
              >
                {createPolicyMutation.isPending ? 'Validating & Saving...' : 'Save and Deploy Policy'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

