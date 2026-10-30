import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SecurityEvent } from '../../types';
import { LoadingSpinner, TableSkeleton } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Activity,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EventsListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['security-events', page, search, eventType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
        ...(eventType ? { eventType } : {}),
      });
      const res = await api.get(`/events?${params.toString()}`);
      return {
        items: res.data.data as SecurityEvent[],
        meta: res.data.meta as { page: number; limit: number; total: number; totalPages: number },
      };
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Security Telemetry Events
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Normalized, privacy-scanned security event records and audit telemetry.
          </p>
        </div>

        <Link
          to="/app/events/ingest"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Import Security Events</span>
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
            placeholder="Search event type, actor identity, source IP..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Event Types</option>
          <option value="auth.login_failed">Login Failed</option>
          <option value="iam.privilege_escalation">Privilege Escalation</option>
          <option value="storage.data_export">Data Export</option>
          <option value="app.debug_log">App Debug Log</option>
          <option value="cloud.database_delete_snapshot">Database Delete</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8">
            <TableSkeleton rows={8} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Activity}
              title="No Security Events Found"
              description="No security telemetry has been recorded matching your search filters. Ingest logs via JSON or CSV to start threat detection."
              actionText="Import Events"
              onAction={() => window.location.href = '/app/events/ingest'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Origin IP</th>
                  <th className="py-3 px-4">Occurred (UTC)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {data.items.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                      {ev.eventType}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-xs">
                        {ev.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 truncate max-w-[140px]">
                      {ev.actorIdentifier || <span className="text-slate-600 font-sans italic">None</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {ev.sourceIp || <span className="text-slate-600 font-sans italic">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans text-xs">
                      {new Date(ev.occurredAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedEvent(ev)}
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

        {/* Pagination Footer */}
        {data && data.meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
            <div>
              Showing page <span className="font-semibold text-slate-200">{data.meta.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{data.meta.totalPages}</span> ({data.meta.total} total events)
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

      {/* Event Details Drawer/Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedEvent.eventType}</h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedEvent.id}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-semibold">Source</span>
                <span className="text-slate-200">{selectedEvent.source}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-semibold">Actor Identity</span>
                <span className="text-slate-200">{selectedEvent.actorIdentifier || 'None'}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-semibold">Origin IP</span>
                <span className="text-slate-200 font-mono">{selectedEvent.sourceIp || 'None'}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-semibold">Timestamp</span>
                <span className="text-slate-200">{new Date(selectedEvent.occurredAt).toUTCString()}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Sanitized Payload (Safe for AI & Analysts)
              </span>
              <pre className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedEvent.sanitizedPayload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

