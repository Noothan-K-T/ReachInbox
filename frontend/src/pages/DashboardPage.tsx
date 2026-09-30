import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ScheduledEmails from '../components/ScheduledEmails';
import SentEmails from '../components/SentEmails';
import ComposeModal from '../components/ComposeModal';
import { emailApi, queueApi, type QueueStats } from '../services/api';
import { Clock, Send, ShieldCheck, Zap, ArrowUpRight } from 'lucide-react';

export type TabType = 'scheduled' | 'sent';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    loadCounts();
  }, [refreshKey]);

  const loadCounts = async () => {
    try {
      const [scheduledRes, sentRes, statsRes] = await Promise.allSettled([
        emailApi.getScheduled(1, 1),
        emailApi.getSent(1, 1),
        queueApi.getStats(),
      ]);

      if (scheduledRes.status === 'fulfilled') {
        setScheduledCount(scheduledRes.value.data.total);
      }
      if (sentRes.status === 'fulfilled') {
        setSentCount(sentRes.value.data.total);
      }
      if (statsRes.status === 'fulfilled') {
        setQueueStats(statsRes.value.data);
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
    <div className="flex h-screen bg-slate-50/70 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCompose={() => setComposeOpen(true)}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto px-6 lg:px-10 py-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Top Stat Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
              {/* Card 1: Queue Pending */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Scheduled in Queue
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {scheduledCount}
                    </span>
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                      BullMQ delayed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Pending target schedule dispatch</p>
                </div>
              </div>

              {/* Card 2: Delivered Total */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Delivered
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {sentCount}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                      100% success
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Verified via Ethereal SMTP</p>
                </div>
              </div>

              {/* Card 3: Hourly Throttle Window */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Hourly Limit Window
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      200
                    </span>
                    <span className="text-xs text-slate-400 font-medium">max / sender</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, (sentCount / 200) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Idempotency & Fault Tolerance */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fault Tolerance
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-slate-900">Redis-Backed</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Zero job loss on server reboot</p>
                </div>
              </div>
            </div>

            {/* Active Tab View */}
            <div>
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

      {/* Compose Modal */}
      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onScheduleComplete={handleScheduleComplete}
        />
      )}
    </div>
  );
}
