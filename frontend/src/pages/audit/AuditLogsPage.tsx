import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import {
  History,
  ShieldCheck,
  AlertTriangle,
  Search,
  CheckCircle,
  Eye,
  Lock,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    totalRecords: number;
    headHash: string | null;
    verifiedAt: string;
    reason?: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {}),
      });
      const res = await api.get(`/audit?${params.toString()}`);
      return {
        items: res.data.data as AuditLog[],
        meta: res.data.meta as { page: number; limit: number; total: number; totalPages: number },
      };
    },
  });

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.get('/audit/verify');
      const result = res.data.data;
      setVerificationResult(result);
      if (result.isValid) {
        toast.success(`Cryptographic hash chain verified! ${result.totalRecords} records intact.`);
      } else {
        toast.error(`Chain verification anomaly: ${result.reason}`);
      }
    } catch (err: any) {
      toast.error('Failed to verify audit log integrity.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Append-Only Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            SHA-256 cryptographic hash-chained audit records. Protected against deletion and mutation by database triggers.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-200" />
          <span>{isVerifying ? 'Verifying Hash Chain...' : 'Verify Cryptographic Integrity'}</span>
        </button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs ${
          verificationResult.isValid
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center space-x-3">
            {verificationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <span className="font-bold text-white block">
                {verificationResult.isValid
                  ? 'Cryptographic Hash Chain Verified (No Tampering Detected)'
                  : 'Audit Chain Integrity Failure'}
              </span>
              <span className="text-[11px] font-mono opacity-80">
                {verificationResult.totalRecords} sequential blocks verified. Current Head: {verificationResult.headHash}
              </span>
            </div>
          </div>

          <span className="font-mono text-[11px] opacity-75 shrink-0">
            Verified: {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Filter audit logs by action or actor..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8">
            <TableSkeleton rows={8} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={History}
              title="No Audit Logs Recorded"
              description="Actions performed by users and system automations will appear here chronologically in the hash chain."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold font-sans">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Previous Hash</th>
                  <th className="py-3 px-4">Entry Hash</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right font-sans">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      {log.actorName || <span className="text-slate-500 italic">System</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans capitalize">
                      {log.resourceType || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 truncate max-w-[100px]" title={log.previousHash}>
                      {log.previousHash ? `${log.previousHash.substring(0, 10)}...` : '0000000000...'}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 truncate max-w-[100px]" title={log.entryHash}>
                      {log.entryHash.substring(0, 10)}...
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
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

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
            <div>
              Page <span className="font-semibold text-slate-200">{data.meta.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{data.meta.totalPages}</span> ({data.meta.total} records)
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

      {/* Log Inspection Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedLog.action}</h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-sans font-semibold text-[11px]">Previous Hash</span>
                <span className="text-slate-300 break-all">{selectedLog.previousHash}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-sans font-semibold text-[11px]">Computed Entry Hash</span>
                <span className="text-cyan-400 break-all">{selectedLog.entryHash}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Sanitized Metadata (Zero Raw Secret Retention)
              </span>
              <pre className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-slate-200 overflow-x-auto max-h-56">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

