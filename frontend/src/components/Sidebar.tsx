import { useAuth } from '../context/AuthContext';
import { Clock, Send, Plus, LogOut, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';
import type { TabType } from '../pages/DashboardPage';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onCompose: () => void;
  scheduledCount?: number;
  sentCount?: number;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  onCompose,
  scheduledCount,
  sentCount,
}: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside className="w-72 min-w-[280px] max-w-[280px] shrink-0 h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between select-none z-20">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <Send className="w-4 h-4 text-white -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-base tracking-tight">ReachInbox</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Scheduler Service</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-4 my-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Action: Compose Button */}
        <div className="px-4 pt-3 pb-2">
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="text-sm font-medium">Compose Campaign</span>
          </button>
        </div>

        {/* Subtle separator with clean breathing room */}
        <div style={{ margin: '16px 16px', borderTop: '1px solid #e2e8f0' }} />

        {/* Email Operations Nav */}
        <div className="px-3 space-y-1">
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Email Operations
          </p>

          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'scheduled'
                ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/60 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock
                className={`w-4 h-4 ${
                  activeTab === 'scheduled' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>Scheduled Queue</span>
            </div>
            {typeof scheduledCount === 'number' && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                  activeTab === 'scheduled'
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {scheduledCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/60 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2
                className={`w-4 h-4 ${
                  activeTab === 'sent' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>Sent Emails</span>
            </div>
            {typeof sentCount === 'number' && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                  activeTab === 'sent'
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sentCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Section: Telemetry & Logout */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Real-time System Status Pill */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 space-y-1.5">
          <div className="flex items-center justify-between font-medium text-slate-700">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              Worker Status
            </span>
            <span className="flex items-center gap-1 text-emerald-700 text-[10px] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Concurrency: 5</span>
            <span>Min Delay: 2s</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
