import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import { RoleBadge } from '../../components/common/Badge';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import { Users, UserPlus, Trash2, Mail, Shield, Check } from 'lucide-react';
import { toast } from 'sonner';

export const MembersPage: React.FC = () => {
  const { currentOrg, user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('analyst');
  const [generatedInviteToken, setGeneratedInviteToken] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['org-members', currentOrg?.id],
    queryFn: async () => {
      const res = await api.get(`/organizations/${currentOrg?.id}/members`);
      return res.data.data as Array<{
        id: string;
        userId: string;
        fullName: string;
        email: string;
        role: Role;
        status: string;
        joinedAt: string;
      }>;
    },
    enabled: Boolean(currentOrg?.id),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/organizations/${currentOrg?.id}/invitations`, {
        email: inviteEmail,
        role: inviteRole,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setGeneratedInviteToken(data.invitationToken);
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success('Invitation token generated.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to invite user.');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: Role }) => {
      await api.patch(`/organizations/${currentOrg?.id}/members/${userId}`, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success('Member role updated.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update member role.');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/organizations/${currentOrg?.id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success('Member removed from organization.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to remove member.');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Team & Organization Access Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage role-based permissions (Owner, Admin, Analyst, Viewer) and cryptographic invitations.
          </p>
        </div>

        {(currentOrg?.role === 'owner' || currentOrg?.role === 'admin') && (
          <button
            onClick={() => {
              setInviteModalOpen(true);
              setGeneratedInviteToken(null);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8">
            <TableSkeleton rows={4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members?.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-[11px]">
                        {member.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{member.fullName}</span>
                      {member.userId === user?.id && (
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {member.email}
                    </td>
                    <td className="py-3.5 px-4">
                      {(currentOrg?.role === 'owner' || currentOrg?.role === 'admin') && member.userId !== user?.id ? (
                        <select
                          value={member.role}
                          onChange={(e) => updateRoleMutation.mutate({ userId: member.userId, newRole: e.target.value as Role })}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 capitalize font-medium cursor-pointer"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {(currentOrg?.role === 'owner' || currentOrg?.role === 'admin') && member.userId !== user?.id && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${member.fullName} from organization?`)) {
                              removeMemberMutation.mutate(member.userId);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Invite Team Member</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            {generatedInviteToken ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Check className="w-5 h-5 text-emerald-400 mb-1" />
                  <span className="font-bold text-white block">Invitation Created!</span>
                  <span className="text-[11px]">Share this secure cryptographic token with the invitee:</span>
                  <pre className="mt-2 p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all select-all">
                    {generatedInviteToken}
                  </pre>
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="w-full py-2 bg-blue-600 text-white font-semibold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="analyst@organization.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="analyst">Analyst (Investigate, Scan & Redact)</option>
                    <option value="admin">Admin (Manage Policies & Members)</option>
                    <option value="viewer">Viewer (Read-Only Access)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-blue-600/20"
                >
                  {inviteMutation.isPending ? 'Generating Invitation...' : 'Send Invitation'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

