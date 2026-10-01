import { useState, useEffect } from 'react';
import { emailApi, type Email } from '../services/api';
import { Search, Clock, Loader2, RefreshCw } from 'lucide-react';

export default function ScheduledEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEmails();
    const interval = setInterval(loadEmails, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadEmails = async () => {
    try {
      const { data } = await emailApi.getScheduled();
      setEmails(data.emails);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load scheduled emails:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      loadEmails();
      return;
    }
    try {
      setLoading(true);
      const { data } = await emailApi.search(searchQuery, 'SCHEDULED');
      setEmails(data.hits as Email[]);
      setTotal(data.total);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEmails();
  };

  const formatScheduleTime = (iso: string) => {
    const target = new Date(iso);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    let relative = '';
    if (diffMs < 0) {
      relative = 'Due now';
    } else if (diffMins < 60) {
      relative = `In ~${diffMins} min${diffMins === 1 ? '' : 's'}`;
    } else {
      const diffHours = Math.round(diffMins / 60);
      relative = `In ~${diffHours} hr${diffHours === 1 ? '' : 's'}`;
    }

    return {
      date: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: target.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      relative,
    };
  };

  return (
    <div className="space-y-4">
      {/* Clean Search & Filter Bar */}
      <div className="p-4 flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full max-w-sm flex items-center">
          <div className="absolute left-3.5 pointer-events-none flex items-center justify-center text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
            className="w-full pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </form>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-600 transition-all cursor-pointer"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <p className="text-xs">Loading pending jobs...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No scheduled emails in queue</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            All jobs have been dispatched or no campaigns are pending.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Recipient</th>
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6">Scheduled For</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {emails.map((email) => {
                const scheduleInfo = formatScheduleTime(email.scheduledAt);
                const initial = email.recipient.charAt(0).toUpperCase();

                return (
                  <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Recipient */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{email.recipient}</p>
                          <p className="text-xs text-slate-400">
                            {email.sender?.displayName || email.sender?.email || 'Default Sender'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-5 px-6 max-w-md">
                      <p className="font-medium text-slate-800 truncate">{email.subject}</p>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {email.body.replace(/<[^>]*>?/gm, '').slice(0, 80)}...
                      </p>
                    </td>

                    {/* Scheduled For */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-800">{scheduleInfo.date} • {scheduleInfo.time}</p>
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        {scheduleInfo.relative}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-5 px-6 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {email.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
