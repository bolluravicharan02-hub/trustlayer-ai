import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { useAuth, isClerkEnabled } from '../../contexts/AuthContext';
import { Shield, Lock, Mail, AlertCircle, Loader2, KeyRound, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'clerk' | 'local'>(isClerkEnabled ? 'clerk' : 'local');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid credentials or connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('alex.security@acmecorp.internal');
    setPassword('DemoSecurity2026!');
    setError(null);
  };

  const fillDemoAnalyst = () => {
    setEmail('maya.analyst@acmecorp.internal');
    setPassword('DemoSecurity2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6 selection:bg-blue-600 selection:text-white relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Shield className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign In to TrustLayer AI</h1>
          <p className="text-xs text-slate-400 mt-1">Autonomous Security Operations & Privacy Shield</p>
        </div>

        {/* Clerk Sign-In flow */}
        {isClerkEnabled && authMode === 'clerk' ? (
          <div className="flex flex-col items-center">
            <div className="w-full clerk-container flex justify-center">
              <SignIn
                routing="path"
                path="/login"
                signUpUrl="/register"
                fallbackRedirectUrl="/app"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 w-full text-center">
              <button
                type="button"
                onClick={() => setAuthMode('local')}
                className="text-xs text-slate-400 hover:text-blue-400 transition inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Switch to Local Credentials / Seeded Demo Mode</span>
              </button>
            </div>
          </div>
        ) : (
          /* Local / Fallback Sign-In flow */
          <div>
            {isClerkEnabled && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setAuthMode('clerk')}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-xs font-semibold text-blue-400 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Switch to Clerk Authentication (SSO / Passkey)</span>
                </button>
              </div>
            )}

            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 mt-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
              </button>
            </form>

            {/* Demo Credentials Quick Fill */}
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <p className="text-xs text-slate-500 text-center font-medium mb-3">Quick Fill Demo Credentials:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Admin (Alex)</span>
                </button>
                <button
                  type="button"
                  onClick={fillDemoAnalyst}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Analyst (Maya)</span>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:underline font-semibold">
                Register Organization
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
