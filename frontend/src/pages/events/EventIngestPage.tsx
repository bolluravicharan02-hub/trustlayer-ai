import React, { useState } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  UploadCloud,
  FileCode,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Lock,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const EventIngestPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applyRedaction, setApplyRedaction] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    totalParsed: number;
    totalInserted: number;
    totalAlertsCreated: number;
    sensitiveItemsRedacted: number;
  } | null>(null);

  // Manual Form State
  const [eventType, setEventType] = useState('auth.login_failed');
  const [source, setSource] = useState('sso_service');
  const [actorIdentifier, setActorIdentifier] = useState('contractor@acmecorp.internal');
  const [sourceIp, setSourceIp] = useState('198.51.100.42');
  const [description, setDescription] = useState('Repeated login failure with invalid API key sk-99887766554433221100');
  const [payloadJson, setPayloadJson] = useState('{\n  "attempt": 5,\n  "userAgent": "Python-urllib/3.9",\n  "bearer": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.abc"\n}');

  // Pre-configured Sample Test Datasets
  const loadBruteForceDataset = () => {
    const now = Date.now();
    const records = [1, 2, 3, 4, 5, 6].map(i => ({
      eventType: 'auth.login_failed',
      source: 'identity_gateway',
      actorIdentifier: 'analyst.jane@corp.com',
      sourceIp: '198.51.100.77',
      occurredAt: new Date(now - (6 - i) * 20 * 1000).toISOString(),
      description: `Authentication credential failed attempt #${i}`,
      payload: { attempt: i, reason: 'bad_password' },
    }));

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const file = new File([blob], 'brute-force-attack-sample.json', { type: 'application/json' });
    setSelectedFile(file);
    toast.info('Loaded Brute Force Attack Dataset (6 rapid failed logins)');
  };

  const loadSecretExposureDataset = () => {
    const records = [
      {
        eventType: 'app.debug_dump',
        source: 'billing_worker',
        actorIdentifier: 'backend_service',
        sourceIp: '10.0.5.21',
        occurredAt: new Date().toISOString(),
        description: 'Exception: Failed to sync Stripe card 4532-0151-1283-0366 using token sk-9f8a7b6c5d4e3f2a1b0c and contact admin@partner.org',
        payload: {
          apiKey: 'xai-9f8a7b6c5d4e3f2a1b0c_example_grok_key_1234567890',
          privateKeyBlock: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----',
        },
      },
    ];

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const file = new File([blob], 'sensitive-credential-leak.json', { type: 'application/json' });
    setSelectedFile(file);
    toast.info('Loaded Sensitive Secrets Leak Dataset (Credit Card + API Key + Private Key)');
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a CSV or JSON file to upload.');
      return;
    }

    setIsSubmitting(true);
    setSummaryResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/events/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSummaryResult(res.data.data);
      toast.success('Security events ingested and analyzed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to ingest file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSummaryResult(null);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadJson);
    } catch {
      toast.error('Payload must be valid JSON');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/events', {
        eventType,
        source,
        actorIdentifier,
        sourceIp,
        occurredAt: new Date().toISOString(),
        description,
        sanitizedPayload: parsedPayload,
      });

      const alertsCreated = res.data.data?.alertsCreated?.length || 0;
      setSummaryResult({
        totalParsed: 1,
        totalInserted: 1,
        totalAlertsCreated: alertsCreated,
        sensitiveItemsRedacted: 1,
      });

      toast.success('Event ingested and security rules evaluated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create security event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Security Event Ingestion Pipeline
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload JSON/CSV event logs or manually inject telemetry. Automatic privacy scanning & threat detection will be applied before storage.
        </p>
      </div>

      {/* Ingestion Summary Banner */}
      {summaryResult && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Ingestion & Detection Complete</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Total Parsed</span>
              <span className="text-lg font-bold text-white">{summaryResult.totalParsed}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Stored Events</span>
              <span className="text-lg font-bold text-emerald-400">{summaryResult.totalInserted}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Alerts Triggered</span>
              <span className="text-lg font-bold text-amber-400">{summaryResult.totalAlertsCreated}</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-500 block font-sans">Redacted Tokens</span>
              <span className="text-lg font-bold text-cyan-400">{summaryResult.sensitiveItemsRedacted}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 pt-2">
            <button
              onClick={() => navigate('/app/alerts')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span>View Generated Alerts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/app/events')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Inspect Events Table
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'upload'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File (JSON / CSV)</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 transition flex items-center gap-2 ${
            activeTab === 'manual'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Manual Event Entry</span>
        </button>
      </div>

      {/* Tab 1: File Upload */}
      {activeTab === 'upload' ? (
        <form onSubmit={handleFileUpload} className="space-y-6">
          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/40 rounded-2xl p-8 text-center transition">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <UploadCloud className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Select or Drop Security Log File
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Supports <span className="text-slate-200 font-mono">.json</span> or{' '}
              <span className="text-slate-200 font-mono">.csv</span> up to 5MB (max 5,000 rows).
            </p>

            <input
              type="file"
              accept=".json,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />

            {selectedFile && (
              <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 inline-block font-mono">
                Selected: <span className="text-blue-400 font-bold">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Quick Demo Datasets */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Quick Test Datasets (Click to load):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadBruteForceDataset}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition"
              >
                Brute-Force Attack (5 Failures)
              </button>
              <button
                type="button"
                onClick={loadSecretExposureDataset}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition"
              >
                Sensitive Secret Leak (API Key + Card)
              </button>
            </div>
          </div>

          {/* Privacy Redaction Toggle */}
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <Lock className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-white block">Pre-Storage Privacy Redaction</span>
              <span className="text-slate-400">Automatically replace sensitive API keys, cards, and tokens with safe category placeholders.</span>
            </div>
            <input
              type="checkbox"
              checked={applyRedaction}
              onChange={(e) => setApplyRedaction(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedFile || isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ingesting, Scanning Privacy & Evaluating Threat Rules...</span>
              </>
            ) : (
              <span>Ingest and Analyze Security Logs</span>
            )}
          </button>
        </form>
      ) : (
        /* Tab 2: Manual Event Form */
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Event Type
              </label>
              <input
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Event Source
              </label>
              <input
                type="text"
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Actor Identifier (User / Service)
              </label>
              <input
                type="text"
                value={actorIdentifier}
                onChange={(e) => setActorIdentifier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Source IP Address
              </label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Event Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Structured Payload JSON
            </label>
            <textarea
              rows={4}
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Inject Event & Run Detection</span>}
          </button>
        </form>
      )}
    </div>
  );
};

