import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, KeyRound, Database, FileCheck, Layers } from 'lucide-react';

export const SecurityInfoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-white">TrustLayer AI Security Architecture</span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto py-16 px-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Shield className="w-3.5 h-3.5" />
          <span>Defense in Depth & Cryptographic Integrity</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
          Security Controls & Multi-Tenant Isolation
        </h1>
        <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-12">
          TrustLayer AI adheres to zero-trust principles. We combine database-enforced Row Level Security (RLS), Argon2id memory-hard password hashing, append-only SHA-256 audit hash chaining, and synchronizer CSRF tokens.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <Database className="w-6 h-6 text-blue-400 mb-4" />
            <h3 className="text-base font-bold text-white mb-2">PostgreSQL Row-Level Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every tenant query executes inside a transaction setting <code className="text-blue-300 font-mono">app.current_org_id</code>. Database RLS policies force tenant data isolation at the storage layer even if application filters are omitted.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <KeyRound className="w-6 h-6 text-cyan-400 mb-4" />
            <h3 className="text-base font-bold text-white mb-2">Argon2id Password Hashing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authentication credentials are encrypted with Argon2id using 64MB memory cost, 3 iterations, and 4 parallel threads, providing state-of-the-art resistance to GPU and ASIC brute force attacks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <FileCheck className="w-6 h-6 text-emerald-400 mb-4" />
            <h3 className="text-base font-bold text-white mb-2">Cryptographic SHA-256 Hash Chain</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audit logs are linked sequentially: each entry contains the SHA-256 hash of its predecessor and canonical payload. Database triggers reject any <code className="text-emerald-300 font-mono">UPDATE</code> or <code className="text-emerald-300 font-mono">DELETE</code> statements.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
            <Lock className="w-6 h-6 text-purple-400 mb-4" />
            <h3 className="text-base font-bold text-white mb-2">Synchronizer CSRF Protection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              State mutations require a cryptographic <code className="text-purple-300 font-mono">X-CSRF-Token</code> verified via constant-time comparison (<code className="text-purple-300 font-mono">timingSafeEqual</code>) along with secure session cookies.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

