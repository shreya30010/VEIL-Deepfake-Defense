import React, { useState } from 'react';
import { Lock, Mail, Key, User, Shield, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import type { AuthUser } from '@/types/veil';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
}

export const DEMO_ACCOUNTS = [
  {
    role: 'Employee' as const,
    name: 'Sarah Chen',
    title: 'Finance Analyst',
    email: 'employee@veil.corp',
    password: 'Employee123!',
    badge: 'Submitter',
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    description: 'Submits payment requests, initiates video verification, and runs Live Shield.',
  },
  {
    role: 'Approver' as const,
    name: 'Ananya Rao',
    title: 'VP Finance & Operations',
    email: 'approver@veil.corp',
    password: 'Approver123!',
    badge: 'Dual-Custody Gate',
    badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    description: 'Reviews held payment requests, verifies safe phrases, and authorizes or blocks releases.',
  },
  {
    role: 'Admin' as const,
    name: 'David Vance',
    title: 'CISO / Security Admin',
    email: 'admin@veil.corp',
    password: 'Admin123!',
    badge: 'Full Directory Admin',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    description: 'Manages vendor bank accounts directory, staff safe phrases, and audits activity logs.',
  },
];

export function AuthModal({ isOpen, onClose, currentUser, onLoginSuccess, onLogout }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (loginEmail = email, loginPass = password) => {
    setError('');
    setLoading(true);

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    handleLogin(demo.email, demo.password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Authentication & Role Access
              </h2>
              <p className="text-xs text-slate-400">
                Log in with your corporate credentials or choose a pre-seeded demo profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto text-sm">
          {/* Active User Status (if logged in) */}
          {currentUser && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center font-bold text-cyan-400 text-sm">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs text-slate-400">Currently Logged In As:</div>
                  <div className="font-semibold text-slate-100 flex items-center gap-2">
                    {currentUser.name}
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{currentUser.email}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  onLogout();
                }}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-lg text-xs font-semibold transition"
              >
                Log Out
              </button>
            </div>
          )}

          {/* Seeded Demo Accounts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <Shield size={14} />
                One-Click Demo Accounts (Judges & Evaluators)
              </span>
              <span className="text-[11px] text-slate-400">Click to switch role instantly</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const isCurrent = currentUser?.email === acc.email;
                return (
                  <div
                    key={acc.email}
                    onClick={() => handleQuickLogin(acc)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">{acc.name}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${acc.badgeColor}`}>
                          {acc.role}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{acc.description}</p>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {acc.email} · Password: <span className="text-slate-400">{acc.password}</span>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-300 group-hover:bg-cyan-600 group-hover:text-white'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Select'}
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Credentials Form */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              Or Enter Credentials Manually
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. employee@veil.corp"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
