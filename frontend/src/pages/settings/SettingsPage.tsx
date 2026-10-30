import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Settings, Building2, User, Lock, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage: React.FC = () => {
  const { currentOrg, user, refreshUser } = useAuth();

  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [retentionDays, setRetentionDays] = useState(90);
  const [requireHumanApproval, setRequireHumanApproval] = useState(true);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsSaving(true);
    try {
      await api.patch(`/organizations/${currentOrg.id}`, {
        name: orgName,
        settings: {
          retentionDays,
          requireHumanApproval,
        },
      });
      await refreshUser();
      toast.success('Organization settings updated successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update organization settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Settings & Retention Governance
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure tenant isolation parameters, telemetry retention policies, and account security.
        </p>
      </div>

      {/* Organization Settings */}
      {currentOrg && (
        <form onSubmit={handleSaveOrg} className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Organization Profile & Security Settings</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Tenant Slug
              </label>
              <input
                type="text"
                disabled
                value={currentOrg.slug}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800/60 rounded-xl text-slate-400 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Telemetry Retention (Days)
              </label>
              <input
                type="number"
                min={30}
                max={365}
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 block mt-1">Default 90-day compliance retention</span>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <input
                type="checkbox"
                id="humanApproval"
                checked={requireHumanApproval}
                onChange={(e) => setRequireHumanApproval(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="humanApproval" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold block text-white">Require Human Authorization</span>
                <span className="text-[11px] text-slate-400">Strictly forbid AI from executing automated block/delete actions.</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-blue-600/15"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Organization Settings'}</span>
          </button>
        </form>
      )}

      {/* User Profile */}
      {user && (
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
            <User className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">User Account Credentials</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block uppercase font-semibold text-[11px]">User Name</span>
              <span className="text-slate-200 font-medium text-sm">{user.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-semibold text-[11px]">Email Address</span>
              <span className="text-slate-200 font-mono text-sm">{user.email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

