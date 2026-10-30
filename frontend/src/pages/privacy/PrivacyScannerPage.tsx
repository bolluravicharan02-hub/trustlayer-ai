import React, { useState } from 'react';
import { api } from '../../services/api';
import { PrivacyFinding } from '../../types';
import { toast } from 'sonner';
import {
  EyeOff,
  Copy,
  Download,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  Loader2,
  FileText
} from 'lucide-react';

export const PrivacyScannerPage: React.FC = () => {
  const [content, setContent] = useState('');
  const [redactedOutput, setRedactedOutput] = useState<string | null>(null);
  const [findings, setFindings] = useState<PrivacyFinding[]>([]);
  const [aiAdvisory, setAiAdvisory] = useState<{
    summary: string;
    overall_risk: string;
    findings?: Array<{ category: string; risk_explanation: string; recommended_protection: string }>;
    recommended_actions?: string[];
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Selected Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'email',
    'phone',
    'payment_card',
    'api_key',
    'auth_token',
    'jwt',
    'private_key',
    'ip_address',
  ]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please enter content or load a sample to scan.');
      return;
    }

    setIsScanning(true);
    setRedactedOutput(null);
    setFindings([]);
    setAiAdvisory(null);

    try {
      const res = await api.post('/privacy/scan', {
        content,
        categories: selectedCategories,
        redact: true,
      });

      const data = res.data.data;
      setRedactedOutput(data.redactedOutput);
      setFindings(data.findings || []);
      setAiAdvisory(data.aiAdvisory || null);

      toast.success(`Scan completed. Found ${data.totalFindings} sensitive item(s).`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Privacy scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const loadSample1 = () => {
    setContent(
      `[DEBUG 2026-10-30T10:14:22Z] Exception in payment_processor:
Failed to charge Visa card 4532-0151-1283-0366 for user ravi.sharma@example.com (Contact: +1-555-839-2019).
Authorization header was: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlJhdmkiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
API key in use: sk-9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
Server IP address: 198.51.100.42`
    );
    toast.info('Loaded multi-category sensitive data leak sample.');
  };

  const loadSample2 = () => {
    setContent(
      `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3y1+T5eG3X3o2R7vU1wN8vF9yq...[PRIVATE_KEY_DATA]...
-----END RSA PRIVATE KEY-----
AWS credentials config:
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
Contact billing supervisor: accounting@enterprise-cloud.io or call 800-555-0199.`
    );
    toast.info('Loaded Private Key and AWS Secret sample.');
  };

  const copyToClipboard = () => {
    if (redactedOutput) {
      navigator.clipboard.writeText(redactedOutput);
      toast.success('Redacted output copied to clipboard!');
    }
  };

  const downloadRedacted = () => {
    if (!redactedOutput) return;
    const blob = new Blob([redactedOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustlayer-sanitized-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Redacted file downloaded.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Interactive Privacy Scanner & Redaction Studio
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Scan text, logs, or JSON payloads for sensitive PII and secrets. View instant before/after redaction diffs with zero raw secret exposure.
        </p>
      </div>

      {/* Category Checkboxes */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Active Detection & Redaction Categories:
        </span>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: 'email', label: 'Email Addresses' },
            { id: 'payment_card', label: 'Credit Cards (Luhn Validated)' },
            { id: 'api_key', label: 'API Keys & Secrets' },
            { id: 'auth_token', label: 'Bearer Tokens' },
            { id: 'jwt', label: 'JWT Structures' },
            { id: 'private_key', label: 'Private Key Blocks' },
            { id: 'phone', label: 'Phone Numbers' },
            { id: 'ip_address', label: 'IP Addresses' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                selectedCategories.includes(cat.id)
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 font-semibold shadow-inner'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Input & Action */}
      <form onSubmit={handleScan} className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300 uppercase tracking-wider">
            Input Content to Inspect:
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Quick Test Samples:</span>
            <button
              type="button"
              onClick={loadSample1}
              className="text-blue-400 hover:underline font-semibold"
            >
              Payment & API Leak
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={loadSample2}
              className="text-blue-400 hover:underline font-semibold"
            >
              Private Key Block
            </button>
          </div>
        </div>

        <textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste log output, error dumps, database records, or user text here..."
          className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition leading-relaxed"
        />

        <button
          type="submit"
          disabled={isScanning || !content.trim()}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Patterns, Running Luhn Checks & Redacting...</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-cyan-200" />
              <span>Scan Sensitive Information & Apply Redaction</span>
            </>
          )}
        </button>
      </form>

      {/* Before & After Comparison Studio */}
      {redactedOutput && (
        <div className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Sanitized Redaction Comparison</span>
              </h2>
              <p className="text-xs text-slate-400">
                Safe masked output with persistent structural utility. Safe for logging or sending to AI services.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={copyToClipboard}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Copy Redacted</span>
              </button>
              <button
                onClick={downloadRedacted}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-blue-600/15 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Input Preview */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Raw Input (Contained Sensitive Data)
              </span>
              <pre className="p-3 rounded-lg bg-slate-900/90 font-mono text-xs text-slate-300 overflow-x-auto max-h-56 whitespace-pre-wrap">
                {content}
              </pre>
            </div>

            {/* Redacted Sanitized Output */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Sanitized Output (Safe for Gemini & Logs)
              </span>
              <pre className="p-3 rounded-lg bg-slate-900/90 font-mono text-xs text-emerald-300 overflow-x-auto max-h-56 whitespace-pre-wrap">
                {redactedOutput}
              </pre>
            </div>
          </div>

          {/* Safe Previews Table */}
          {findings.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Detected Findings & Masked Previews ({findings.length})
                </h3>
                <span className="text-[11px] font-mono text-slate-500">Zero Raw Secret Leakage</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold font-sans">
                    <tr>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Safe Masked Preview</th>
                      <th className="py-2.5 px-4">Confidence</th>
                      <th className="py-2.5 px-4">Detection Method</th>
                      <th className="py-2.5 px-4">Redaction Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {findings.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-4 font-sans font-semibold text-cyan-400 uppercase">
                          {f.category.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200">
                          {f.safePreview}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {(f.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-sans">
                          {f.detectionMethod}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Redacted
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Privacy Advisory */}
          {aiAdvisory && (
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-blue-500/30 space-y-4">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Gemini AI Privacy Governance Advisory</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800">
                {aiAdvisory.summary}
              </p>
              {aiAdvisory.recommended_actions && (
                <ul className="space-y-1 text-xs text-slate-400">
                  {aiAdvisory.recommended_actions.map((act, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

