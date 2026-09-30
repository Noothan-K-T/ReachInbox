import { useState, useEffect } from 'react';
import { emailApi, type Email } from '../services/api';
import { Search, CheckCircle2, XCircle, Loader2, RefreshCw, ExternalLink, MailCheck } from 'lucide-react';

export default function SentEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const { data } = await emailApi.getSent();
      setEmails(data.emails);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load sent emails:', err);
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
      const { data } = await emailApi.search(searchQuery, 'SENT');
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

  const formatDateTime = (iso: string | null) => {
    if (!iso) return { date: '—', time: '' };
    const date = new Date(iso);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Delivered Email History
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full">
              {total} sent
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Processed via BullMQ concurrency pipeline, rate-throttled and verified in Ethereal SMTP
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
            title="Refresh list"
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
            <p className="text-xs font-medium">Loading sent delivery records...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
              <MailCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No sent emails recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Scheduled jobs will appear here once the worker executes the SMTP payload.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-6">Subject & Preview</th>
                  <th className="py-3.5 px-6">Delivered At</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {emails.map((email) => {
                  const sentInfo = formatDateTime(email.sentAt);
                  const initial = email.recipient.charAt(0).toUpperCase();
                  const isSent = email.status === 'SENT';

                  return (
                    <tr
                      key={email.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Recipient */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border ${
                              isSent
                                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300/40'
                                : 'bg-gradient-to-br from-rose-100 to-rose-200 text-rose-800 border-rose-300/40'
                            }`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {email.recipient}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              from {email.sender?.displayName || email.sender?.email || 'Default Sender'}
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

                      {/* Delivered Time */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-800">
                          {sentInfo.date}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {sentInfo.time}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Failed
                          </span>
                        )}
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
            <span>Showing {emails.length} of {total} sent emails</span>
            <span className="text-[11px] text-slate-400">Elasticsearch 8.12 synchronized</span>
          </div>
        )}
      </div>
    </div>
  );
}
