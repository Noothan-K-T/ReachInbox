import { useState, useEffect } from 'react';
import { emailApi, type Email } from '../services/api';
import { Search, Clock, Loader2, RefreshCw, Send, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Scheduled Email Queue
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full">
              {total} pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Jobs queued in Redis via BullMQ with millisecond precision and restart durability
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5">
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all"
            />
          </form>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-xs font-medium">Querying BullMQ & PostgreSQL...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No scheduled emails in queue</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              All jobs have been dispatched, or no campaigns are currently queued.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-6">Subject & Preview</th>
                  <th className="py-3.5 px-6">Scheduled Dispatch</th>
                  <th className="py-3.5 px-6 text-right">Queue State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {emails.map((email) => {
                  const scheduleInfo = formatScheduleTime(email.scheduledAt);
                  const initial = email.recipient.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={email.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Recipient */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300/40">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {email.recipient}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              via {email.sender?.displayName || email.sender?.email || 'Default Sender'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Body Preview */}
                      <td className="py-4 px-6 max-w-md">
                        <p className="font-medium text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {email.subject}
                        </p>
                        <p
                          className="text-xs text-slate-400 line-clamp-1 mt-0.5"
                          dangerouslySetInnerHTML={{
                            __html: email.body.replace(/<[^>]*>?/gm, '').slice(0, 90) + '...',
                          }}
                        />
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {scheduleInfo.date} • {scheduleInfo.time}
                            </p>
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">
                              {scheduleInfo.relative}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
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

        {/* Table Footer */}
        {emails.length > 0 && (
          <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {emails.length} of {total} scheduled emails</span>
            <span className="text-[11px] text-slate-400">BullMQ worker poll interval: 6s</span>
          </div>
        )}
      </div>
    </div>
  );
}
