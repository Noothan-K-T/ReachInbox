import { useAuth } from '../context/AuthContext';
import { Mail, Zap, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, devLogin } = useAuth();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden px-4 py-12">
      {/* Decorative emerald ambient glow orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/25 mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ReachInbox
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">
              Scheduler
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            High-throughput cold outreach engine & BullMQ job scheduler
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-8 sm:p-10 transition-all">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access scheduled campaigns, queue telemetry, and deliverability stats
            </p>
          </div>

          <div className="space-y-4">
            {/* Instant Demo Access (Primary Action for Evaluators & Local Testing) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/70 to-emerald-50/30 border border-emerald-200/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Instant Access Mode
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                  Pre-configured
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Log in instantly with seeded demo leads, test senders, and active BullMQ queue state.
              </p>
              <button
                onClick={devLogin}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-3.5 px-5 rounded-xl shadow-md shadow-emerald-600/25 transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>1-Click Demo Login</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
              </button>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium uppercase tracking-wider">
                  or OAuth
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 cursor-pointer hover:border-slate-300"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Idempotency Guarded
            </span>
            <span>•</span>
            <span>BullMQ Redis Queue</span>
            <span>•</span>
            <span>Ethereal SMTP</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          ReachInbox by Outbox Labs • Enterprise Cold Outreach Engine
        </p>
      </div>
    </div>
  );
}
