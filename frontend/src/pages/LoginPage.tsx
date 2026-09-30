import { useAuth } from '../context/AuthContext';
import { Mail, Zap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, devLogin } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] px-6 py-16">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Main Free & Spacious Floating Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-10 sm:p-14 text-center">
          
          {/* Brand Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 mb-8">
            <Mail className="w-8 h-8" />
          </div>

          {/* Heading with generous breathing room */}
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
            ReachInbox
          </h1>
          <p className="text-base text-slate-500 mb-10 max-w-sm mx-auto leading-relaxed">
            AI-powered cold outreach engine and job scheduler
          </p>

          {/* Action Buttons with Open Space */}
          <div className="space-y-4 max-w-md mx-auto">
            {/* Primary Action: 1-Click Instant Demo */}
            <button
              onClick={devLogin}
              className="w-full h-14 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-base font-semibold rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>1-Click Demo Login</span>
              <ArrowRight className="w-5 h-5 ml-1 opacity-70" />
            </button>

            {/* Airy Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-4 text-slate-400 font-medium uppercase tracking-widest">
                  or
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={login}
              className="w-full h-14 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-base font-medium rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer"
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
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Simple Clean Footer Note */}
          <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Outbox Labs</span>
            <span>•</span>
            <span>BullMQ Scheduler</span>
          </div>
        </div>
      </div>
    </div>
  );
}
