import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ScheduledEmails from '../components/ScheduledEmails';
import SentEmails from '../components/SentEmails';
import ComposeModal from '../components/ComposeModal';
import { emailApi, queueApi } from '../services/api';
import { Clock, CheckCircle2, Plus } from 'lucide-react';

export type TabType = 'scheduled' | 'sent';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);

  useEffect(() => {
    loadCounts();
  }, [refreshKey]);

  const loadCounts = async () => {
    try {
      const [scheduledRes, sentRes] = await Promise.allSettled([
        emailApi.getScheduled(1, 1),
        emailApi.getSent(1, 1),
      ]);

      if (scheduledRes.status === 'fulfilled') {
        setScheduledCount(scheduledRes.value.data.total);
      }
      if (sentRes.status === 'fulfilled') {
        setSentCount(sentRes.value.data.total);
      }
    } catch { /* ignore */ }
  };

  const handleScheduleComplete = () => {
    setComposeOpen(false);
    setActiveTab('scheduled');
    setRefreshKey((k) => k + 1);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar with fixed width */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCompose={() => setComposeOpen(true)}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
      />

      {/* Main Free & Open Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto px-8 lg:px-14 py-10">
          <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
            
            {/* Open, Spacious Top Hero Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {activeTab === 'scheduled' ? 'Scheduled Campaigns' : 'Delivery History'}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {activeTab === 'scheduled'
                    ? 'Emails waiting in BullMQ queue for future delivery'
                    : 'Emails processed and transmitted via Ethereal SMTP'}
                </p>
              </div>

              {/* Free-standing Stat Chips */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-2xl border border-slate-200/70 shadow-xs text-sm">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-slate-900">{scheduledCount}</span>
                  <span className="text-slate-400 text-xs">in queue</span>
                </div>

                <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-2xl border border-slate-200/70 shadow-xs text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-slate-900">{sentCount}</span>
                  <span className="text-slate-400 text-xs">delivered</span>
                </div>

                <button
                  onClick={() => setComposeOpen(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Email</span>
                </button>
              </div>
            </div>

            {/* Active Table Content */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-2 sm:p-4">
              {activeTab === 'scheduled' && (
                <ScheduledEmails key={`scheduled-${refreshKey}`} />
              )}
              {activeTab === 'sent' && (
                <SentEmails key={`sent-${refreshKey}`} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Compose Modal */}
      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onScheduleComplete={handleScheduleComplete}
        />
      )}
    </div>
  );
}
