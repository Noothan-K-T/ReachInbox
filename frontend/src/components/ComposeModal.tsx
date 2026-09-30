import { useState, useEffect, useRef } from 'react';
import { emailApi, type Sender } from '../services/api';
import {
  X,
  Clock,
  Loader2,
  Upload,
  Send,
  Calendar,
  Sparkles,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ComposeModalProps {
  onClose: () => void;
  onScheduleComplete: () => void;
}

export default function ComposeModal({ onClose, onScheduleComplete }: ComposeModalProps) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetween, setDelayBetween] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showScheduleConfig, setShowScheduleConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSenders();
    // Default scheduled time: 2 minutes from now
    const target = new Date(Date.now() + 2 * 60 * 1000);
    setScheduledAt(target.toISOString().slice(0, 16));
  }, []);

  const loadSenders = async () => {
    try {
      const { data } = await emailApi.getSenders();
      setSenders(data.senders);
      if (data.senders.length > 0) {
        setSelectedSender(data.senders[0].id);
      }
    } catch {
      toast.error('Failed to load senders');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data } = await emailApi.uploadCsv(file);
      setRecipients((prev) => [...new Set([...prev, ...data.emails])]);
      toast.success(`${data.count} email addresses extracted from CSV!`);
    } catch {
      toast.error('Failed to parse CSV file');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const addManualRecipient = () => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const trimmed = recipientInput.trim();
    if (emailRegex.test(trimmed)) {
      if (!recipients.includes(trimmed.toLowerCase())) {
        setRecipients((prev) => [...prev, trimmed.toLowerCase()]);
        setRecipientInput('');
      } else {
        toast('Recipient already added', { icon: 'ℹ️' });
        setRecipientInput('');
      }
    } else if (trimmed) {
      toast.error('Please enter a valid email address');
    }
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addManualRecipient();
    }
  };

  const setPresetSchedule = (minutes: number) => {
    const target = new Date(Date.now() + minutes * 60 * 1000);
    setScheduledAt(target.toISOString().slice(0, 16));
    toast.success(`Scheduled for ${target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  };

  const handleSchedule = async () => {
    if (!selectedSender) {
      toast.error('Please select an active sender');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient email');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please pick a target schedule timestamp');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await emailApi.schedule({
        senderId: selectedSender,
        recipients,
        subject,
        body: body || '<p>Hello from ReachInbox!</p>',
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetweenEmails: delayBetween,
      });

      toast.success(`${data.count} emails enqueued into BullMQ successfully!`);
      onScheduleComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to schedule campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Main Floating Modal Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] z-10 animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Send className="w-4 h-4 -rotate-12" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Compose Outbound Campaign
              </h2>
              <p className="text-xs text-slate-400">
                Configure recipients, content, and BullMQ pacing rules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sender Selector */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
              From:
            </label>
            <div className="flex-1">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName ? `${s.displayName} (${s.email})` : s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipients Input & CSV Upload */}
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recipients ({recipients.length})
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Recipient Chips Container */}
            {recipients.length > 0 && (
              <div className="max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-wrap gap-1.5">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-800 rounded-lg text-xs font-medium border border-slate-200 shadow-2xs"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add manual email input */}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Type lead email address and press Enter or click Add..."
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientKeyDown}
                className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addManualRecipient}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subject Line
            </label>
            <input
              type="text"
              placeholder="e.g. Quick question regarding Outbox Labs workflow"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email Body
            </label>
            <textarea
              rows={4}
              placeholder="Hi {{name}}, wanted to touch base regarding our automated cold email infrastructure..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none font-mono"
            />
          </div>

          {/* BullMQ Pacing & Scheduling Accordion */}
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScheduleConfig(!showScheduleConfig)}
              className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-emerald-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Delivery Timing & Queue Pacing
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  BullMQ Throttled
                </span>
              </div>
              {showScheduleConfig ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showScheduleConfig && (
              <div className="p-4 pt-1 border-t border-emerald-100 space-y-4">
                {/* Datetime picker & presets */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Target Dispatch Timestamp:
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPresetSchedule(5)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        In 5m
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule(30)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        In 30m
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule(120)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        In 2 hrs
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delay & Rate Limit sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-100/60">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Inter-Email Delay:</span>
                      <span className="text-emerald-700">{delayBetween} seconds</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={delayBetween}
                      onChange={(e) => setDelayBetween(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Minimum pause between sends to mimic human behavior
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Hourly Limit Cap:</span>
                      <span className="text-emerald-700">{hourlyLimit} emails / hr</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={500}
                      step={5}
                      value={hourlyLimit}
                      onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Automatic re-delaying to next window if quota exceeded
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{recipients.length}</span> recipients selected
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSchedule}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-md shadow-emerald-600/25 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                  <span>Schedule Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
