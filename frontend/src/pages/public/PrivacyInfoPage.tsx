import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, EyeOff, CheckCircle, ArrowLeft, Lock, FileCode, Check } from 'lucide-react';

export const PrivacyInfoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-white">TrustLayer AI Privacy Specification</span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto py-16 px-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <EyeOff className="w-3.5 h-3.5" />
          <span>Privacy by Design & Data Minimization</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
          How TrustLayer AI Protects Sensitive Data
        </h1>
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-12">
          TrustLayer AI implements a privacy-first data handling pipeline. Before security events, log messages, or text entries are stored in our PostgreSQL database or analyzed by xAI Grok, they undergo rigorous, automated client-side and server-side sanitization.
        </p>

        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-cyan-400" />
              Categorical Placeholder Redaction
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              All identified sensitive tokens are replaced with safe, category-specific tags. This ensures downstream security analysts and AI models retain structural context without exposure to raw credentials.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/40 text-red-300">
                <span className="text-red-500 block mb-1">Unsafe Input:</span>
                `User ravi@corp.com auth with token sk-9f8a7b6c5d4e.`
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                <span className="text-emerald-500 block mb-1">Redacted Output:</span>
                `User [REDACTED_EMAIL] auth with token [REDACTED_API_KEY].`
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-cyan-400" />
              Luhn Algorithm Payment Card Verification
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              To prevent false positives from generic 16-digit database IDs or system timestamps, credit card detection verifies checksum validity via the mathematical Luhn algorithm before triggering sensitive data alerts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-cyan-400" />
              Zero-Exposure External AI Boundary
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              xAI Grok is invoked only on sanitized, minimized payloads. Raw secrets, unredacted passwords, and sensitive credentials are mathematically blocked from being sent across model API boundaries.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

