import React, { useState } from 'react';
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
  Activity,
  Menu,
  X
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="h-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 md:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              TrustLayer <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">AI</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <Link to="/privacy" className="hover:text-white transition">Privacy Protection</Link>
          <Link to="/security" className="hover:text-white transition">Security Architecture</Link>
          <a href="#capabilities" className="hover:text-white transition">Capabilities</a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
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

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-blue-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-6 py-5 space-y-4 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200 sticky top-20 z-30">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            <Link
              to="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition"
            >
              Privacy Protection
            </Link>
            <Link
              to="/security"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition"
            >
              Security Architecture
            </Link>
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-slate-900 hover:text-white transition"
            >
              Capabilities
            </a>
          </nav>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col space-y-2.5">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 px-4 text-sm font-medium text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

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
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 group"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/privacy"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span>Explore Privacy Engine</span>
            </Link>
          </div>

          {/* Architecture Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white mb-2">Deterministic Detection Engine</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rules-first threat correlation for brute force, account compromise, and privilege escalations with mathematically verifiable risk scores (0-100).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <EyeOff className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white mb-2">Autonomous Privacy Shield</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-flight PII and credential sanitization with category-aware masking and SHA-256 integrity digests before storage or AI exposure.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white mb-2">Verifiable Trust & Hash Chains</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Append-only cryptographic hash chaining for audit logs and transparent disclosures on AI model confidence and boundaries.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Capabilities Section */}
        <section id="capabilities" className="py-20 border-t border-slate-800/80 bg-slate-950/40 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                Full-Stack Operational Capabilities
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Enterprise telemetry monitoring, automated incident workflows, and cryptographic data assurance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <Activity className="w-5 h-5 text-blue-400 mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-1.5">Security Event Telemetry</h3>
                  <p className="text-xs text-slate-400">
                    High-throughput ingestion with normalization and CSV/JSON batch support.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-[11px] text-blue-400">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Real-time Ingestion
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <EyeOff className="w-5 h-5 text-teal-400 mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-1.5">Categorical Redaction</h3>
                  <p className="text-xs text-slate-400">
                    SSNs, API keys, passwords, and tokens masked with category-safe tags.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-[11px] text-teal-400">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Zero Raw AI Exposure
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <Terminal className="w-5 h-5 text-purple-400 mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-1.5">Explainable AI Analysis</h3>
                  <p className="text-xs text-slate-400">
                    Contextual threat enrichment powered by xAI Grok and Groq LLMs.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-[11px] text-purple-400">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Explicit Limitations
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <Lock className="w-5 h-5 text-amber-400 mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-1.5">Cryptographic Auditing</h3>
                  <p className="text-xs text-slate-400">
                    SHA-256 block-linked audit records with real-time tampering detection.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-[11px] text-amber-400">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Non-Repudiation
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-8 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          &copy; {new Date().getFullYear()} TrustLayer AI Platform. Built for autonomous cybersecurity and verifiable trust.
        </div>
        <div className="flex space-x-6">
          <Link to="/privacy" className="hover:text-slate-400 transition">Privacy Policy & Engine</Link>
          <Link to="/security" className="hover:text-slate-400 transition">Security Architecture</Link>
          <Link to="/login" className="hover:text-slate-400 transition">Platform Console</Link>
        </div>
      </footer>
    </div>
  );
};
