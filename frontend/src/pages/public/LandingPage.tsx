import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  EyeOff,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Fingerprint,
  Terminal,
  Activity
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="h-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            TrustLayer <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">AI</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <Link to="/privacy" className="hover:text-white transition">Privacy Protection</Link>
          <Link to="/security" className="hover:text-white transition">Security Architecture</Link>
          <a href="#capabilities" className="hover:text-white transition">Capabilities</a>
        </nav>

        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center gap-1.5"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 py-24 md:py-32 max-w-6xl mx-auto text-center overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Security Operations & Privacy Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Autonomous Threat Detection with <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300">
              Zero-Exposure Privacy Safeguards
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10">
            TrustLayer AI combines deterministic security detection, automated sensitive data redaction, and explainable xAI Grok reasoning into a single verifiable SaaS architecture.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-base transition shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group"
            >
              <span>Launch Security Console</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl font-semibold text-base transition flex items-center justify-center gap-2"
            >
              <span>Explore Demo Workspace</span>
            </Link>
          </div>

          {/* Core Pillars */}
          <div id="capabilities" className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-12 border-t border-slate-800/80">
            {/* Pillar 1 */}
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Deterministic Threat Detection</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Mathematically verified security rules identify brute force logins, unauthorized privilege escalations, off-hours anomalies, and bulk exfiltrations with explainable risk scoring (0-100).
              </p>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Brute-force velocity thresholding</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Bounded 0–100 risk scoring engine</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                <EyeOff className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Automated Privacy Redaction</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Client uploads and event streams are scanned with Luhn-validated payment card detection, API key patterns, JWTs, and private keys. Sensitive values are replaced with safe category tags before storage.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Luhn algorithm card validation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero raw secrets sent to external AI</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-purple-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Explainable AI & Trust Center</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                xAI Grok synthesizes incident context into structured explanations while transparently separating deterministic facts from AI hypotheses. Human approval is strictly enforced for consequential actions.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>SHA-256 cryptographic audit chaining</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Input digests & human review governance</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-8 bg-slate-950/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © 2026 TrustLayer AI Platform. All rights reserved. Built with xAI Grok, Node.js 22, and PostgreSQL RLS.
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/privacy" className="hover:text-slate-300 transition">Privacy Practice</Link>
          <Link to="/security" className="hover:text-slate-300 transition">Security Overview</Link>
          <Link to="/login" className="hover:text-slate-300 transition">Console Login</Link>
        </div>
      </footer>
    </div>
  );
};

