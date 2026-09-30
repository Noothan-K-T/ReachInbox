import { useState, useEffect } from 'react';
import { emailApi, type Email } from '../services/api';
import { Search, CheckCircle2, XCircle, Loader2, Inbox } from 'lucide-react';

export default function SentEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

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
    }
  };

  const handleSearch = async () => {
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

  const formatDateTime = (iso: string | null) => {
    if (!iso) return { date: '—', time: '' };
    const date = new Date(iso);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sent Emails</h2>
          <p className="text-sm text-gray-500 mt-1">{total} emails sent</p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sent emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all w-64"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Loading sent emails...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && emails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No sent emails yet</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Once your scheduled emails are sent, they will appear here.
          </p>
        </div>
      )}

      {/* Email Table */}
      {!loading && emails.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent Time
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {emails.map((email) => {
                const { date, time } = formatDateTime(email.sentAt);
                const isFailed = email.status === 'FAILED';

                return (
                  <tr
                    key={email.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isFailed ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <span className={`text-xs font-semibold ${
                            isFailed ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {email.recipient.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">{email.recipient}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">{email.subject}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">
                        {date} {time && `at ${time}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {isFailed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent
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
