import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { slackApi, queueApi, type QueueStats, type SlackStatus } from '../services/api';
import { Bell, Hash, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Header() {
  const { user } = useAuth();
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    loadSlackStatus();
    loadQueueStats();
    const interval = setInterval(loadQueueStats, 10000); // Poll every 10s
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
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      {/* Left: Queue Stats */}
      <div className="flex items-center gap-4">
        {queueStats && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Activity className="w-3.5 h-3.5" />
            <span>
              <span className="font-medium text-amber-600">{queueStats.delayed}</span> delayed
            </span>
            <span>·</span>
            <span>
              <span className="font-medium text-blue-600">{queueStats.active}</span> active
            </span>
            <span>·</span>
            <span>
              <span className="font-medium text-green-600">{queueStats.completed}</span> sent
            </span>
          </div>
        )}
      </div>

      {/* Right: Slack + User */}
      <div className="flex items-center gap-4">
        {/* Slack Integration */}
        {slackStatus?.connected ? (
          <button
            onClick={handleSlackDisconnect}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5" />
            {slackStatus.teamName || 'Slack'} Connected
          </button>
        ) : (
          <button
            onClick={handleSlackConnect}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5" />
            Connect Slack
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-semibold text-xs">
                {user?.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
