import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { slackApi, queueApi, type QueueStats, type SlackStatus } from '../services/api';
import { Activity, Hash, ExternalLink, Check, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Header() {
  const { user } = useAuth();
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    loadSlackStatus();
    loadQueueStats();
    const interval = setInterval(loadQueueStats, 5000); // Poll queue metrics every 5s
    return () => clearInterval(interval);
  }, []);

  const loadSlackStatus = async () => {
    try {
      const { data } = await slackApi.getStatus();
      setSlackStatus(data);
    } catch { /* ignore */ }
  };

  const loadQueueStats = async () => {
    try {
      const { data } = await queueApi.getStats();
      setQueueStats(data);
    } catch { /* ignore */ }
  };

  const handleSlackConnect = async () => {
    try {
      const { data } = await slackApi.connect();
      window.open(data.url, '_blank', 'width=600,height=700');
    } catch {
      toast.error('Failed to initiate Slack connection');
    }
  };

  const handleSlackDisconnect = async () => {
    try {
      await slackApi.disconnect();
      setSlackStatus({ connected: false, teamName: null, connectedAt: null });
      toast.success('Slack disconnected');
    } catch {
      toast.error('Failed to disconnect Slack');
    }
  };

  return (
    <header className="h-16 px-8 bg-white border-b border-slate-200/80 flex items-center justify-between z-10 shrink-0">
      {/* Left: Live BullMQ Status Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="font-semibold text-slate-700">BullMQ Live</span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-3 font-medium">
            <span className="text-amber-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {queueStats?.delayed ?? 0} delayed
            </span>
            <span className="text-blue-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              {queueStats?.active ?? 0} active
            </span>
            <span className="text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {queueStats?.completed ?? 0} completed
            </span>
          </div>
        </div>

        {/* Link to Bull Board */}
        <a
          href="http://localhost:3001/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/60 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-emerald-200 transition-all font-medium"
          title="Open Live BullMQ Dashboard"
        >
          <span>Queue Board</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Right: Slack & Profile */}
      <div className="flex items-center gap-4">
        {/* Slack Connection Pill */}
        {slackStatus?.connected ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs">
            <Hash className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-emerald-800">
              {slackStatus.teamName || 'Slack Alerts'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <button
              onClick={handleSlackDisconnect}
              className="text-[11px] text-slate-400 hover:text-rose-600 ml-1 transition-colors cursor-pointer"
              title="Disconnect Slack"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={handleSlackConnect}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            <span>Connect Slack</span>
          </button>
        )}

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-800 hidden md:inline">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
}
