import { useState, useEffect } from 'react';
import { emailApi, type Email } from '../services/api';
import { Search, CheckCircle2, XCircle, Loader2, RefreshCw, MailCheck } from 'lucide-react';

export default function SentEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const { data } = await emailApi.getSent();
      setEmails(data.emails);
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
    <div className="space-y-4">
      {/* Clean Search & Filter Bar */}
      <div className="p-4 flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full max-w-sm flex items-center">
          <div className="absolute left-3.5 pointer-events-none flex items-center justify-center text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search delivered emails..."
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
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <p className="text-xs">Loading sent records...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
            <MailCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No sent emails recorded</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Processed campaigns will appear here once executed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Recipient</th>
                <th className="py-4 px-6">Subject</th>
                <th className="py-4 px-6">Delivered At</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {emails.map((email) => {
                const sentInfo = formatDateTime(email.sentAt);
                const initial = email.recipient.charAt(0).toUpperCase();
                const isSent = email.status === 'SENT';

                return (
                  <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Recipient */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 ${
                            isSent
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {initial}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{email.recipient}</p>
                          <p className="text-xs text-slate-400">
                            from {email.sender?.displayName || email.sender?.email || 'Default Sender'}
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

                    {/* Delivered Time */}
                    <td className="py-5 px-6 whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-800">{sentInfo.date}</p>
                      <p className="text-xs text-slate-400">{sentInfo.time}</p>
                    </td>

                    {/* Status */}
                    <td className="py-5 px-6 whitespace-nowrap text-right">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/60">
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
    </div>
  );
}
