import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { useAuth, isClerkEnabled } from '../../contexts/AuthContext';
import { Shield, Lock, Mail, User, Building2, AlertCircle, Loader2, Sparkles, KeyRound } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'clerk' | 'local'>(isClerkEnabled ? 'clerk' : 'local');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        fullName,
        email,
        organizationName,
        password,
        confirmPassword,
      });
      navigate('/app');
    } catch (err: any) {
      const status = err.response?.status;
      const dataMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : '');
      const is404 = status === 404 || dataMsg.includes('could not be found') || dataMsg.includes('Not Found');

      if (is404) {
        setError('Backend API service not reachable (404 Not Found). Please verify that your Render backend is running.');
      } else if (dataMsg) {
        setError(dataMsg);
      } else if (err.message && !err.response) {
        setError(`Network connection failed: ${err.message}. Backend might be starting up.`);
      } else {
        setError('Registration failed. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6 selection:bg-blue-600 selection:text-white relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Shield className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Organization Account</h1>
          <p className="text-xs text-slate-400 mt-1">Autonomous Security & Privacy Workspace</p>
        </div>

        {/* Clerk Sign-Up Flow */}
        {isClerkEnabled && authMode === 'clerk' ? (
          <div className="flex flex-col items-center">
            <div className="w-full clerk-container flex justify-center">
              <SignUp
                routing="path"
                path="/register"
                signInUrl="/login"
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
                <span>Switch to Local Organization Registration</span>
              </button>
            </div>
          </div>
        ) : (
          /* Local Registration Flow */
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@acmecorp.internal"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Organization / Tenant Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Acme Defense Systems"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      placeholder="Min. 12 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                By registering, your organization workspace will enforce tenant isolation, deterministic risk detection, and audit logging.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 mt-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Organization</span>}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Already have an organization?{' '}
              <Link to="/login" className="text-blue-400 hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
