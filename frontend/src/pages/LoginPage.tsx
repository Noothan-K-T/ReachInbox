import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Zap, ArrowRight, ShieldCheck, X, KeyRound, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { devLogin, login } = useAuth();
  const [showConfigNotice, setShowConfigNotice] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(false);

  // Show error from OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      toast.error(`Google login failed: ${decodeURIComponent(error)}`, { duration: 8000 });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleGoogleClick = async () => {
    setCheckingGoogle(true);
    const res = await login();
    setCheckingGoogle(false);
    if (!res.configured) {
      setShowConfigNotice(true);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-[440px] animate-fade-in">
        {/* Main Authentication Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-8 sm:p-10 flex flex-col items-center text-center">
          
          {/* Brand Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center mb-5">
            <Mail className="w-7 h-7" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 mb-2">
            ReachInbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">
            AI-powered cold outreach engine and BullMQ job scheduler
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-3.5">
            {/* Primary Action: 1-Click Instant Demo */}
            <button
              onClick={devLogin}
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current shrink-0" />
              <span>1-Click Demo Login</span>
              <ArrowRight className="w-4 h-4 opacity-80 shrink-0" />
            </button>

            {/* Divider */}
            <div className="relative py-1.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/90" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                  or
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleClick}
              disabled={checkingGoogle}
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>{checkingGoogle ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Secure Authentication Guarantee */}
          <div className="w-full mt-7 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Secure OAuth 2.0 & JWT Protected</span>
          </div>
        </div>
      </div>

      {/* Google OAuth Credentials Notice Modal */}
      {showConfigNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 text-center relative">
              <button
                onClick={() => setShowConfigNotice(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>

              <h2 className="text-lg font-bold text-slate-900">Google OAuth Setup Required</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Real Google authentication requires verified credentials from Google Cloud Console to securely authenticate profiles.
              </p>
            </div>

            {/* Instruction Steps */}
            <div className="p-6 space-y-4 text-left">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Create an OAuth 2.0 Client ID in your Google Cloud Console.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Set Authorized Redirect URI to: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-slate-800">http://localhost:3001/api/auth/google/callback</code></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Add your <code className="font-mono text-slate-800 font-semibold">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-slate-800 font-semibold">GOOGLE_CLIENT_SECRET</code> to <code className="font-mono text-slate-800">backend/.env</code>.</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Instant Evaluation</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfigNotice(false);
                    devLogin();
                  }}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Instant Demo Login</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              ReachInbox enforces strict OAuth 2.0 to prevent unverified account takeovers.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
