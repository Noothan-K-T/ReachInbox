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
  SlidersHorizontal,
  ChevronDown,
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
  const [showPacingSettings, setShowPacingSettings] = useState(false);
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
      toast.success(`${data.count} emails imported from CSV`);
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
        toast('Already added', { icon: 'ℹ️' });
        setRecipientInput('');
      }
    } else if (trimmed) {
      toast.error('Invalid email format');
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
      toast.error('Please choose a sender address');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject line');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please pick a schedule time');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await emailApi.schedule({
        senderId: selectedSender,
        recipients,
        subject,
        body: body || '<p>Hello!</p>',
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetweenEmails: delayBetween,
      });

      toast.success(`${data.count} email(s) queued in BullMQ!`);
      onScheduleComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Clean, perfectly sized card */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[88vh] z-10 animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Send className="w-4 h-4 -rotate-12" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">New Email Campaign</h2>
              <p className="text-xs text-slate-400">Schedule delayed outbound outreach</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: From Sender */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-20 shrink-0">
              From:
            </label>
            <div className="flex-1">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName ? `${s.displayName} (${s.email})` : s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Recipients
                </label>
                {recipients.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {recipients.length} added
                  </span>
                )}
              </div>

              {/* Upload CSV button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-all cursor-pointer"
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

            {/* Recipient Pills */}
            {recipients.length > 0 && (
              <div className="max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-wrap gap-1.5">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-800 rounded-xl text-xs font-medium border border-slate-200 shadow-2xs"
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

            {/* Manual Email Input */}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Type lead email address and press Enter..."
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientKeyDown}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                type="button"
                onClick={addManualRecipient}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Section 3: Subject Line */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subject Line
            </label>
            <input
              type="text"
              placeholder="e.g. Quick question regarding Outbox Labs outreach..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Section 4: Email Body (Standard Clean Typography) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Email Body
            </label>
            <textarea
              rows={4}
              placeholder="Write your email message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all leading-relaxed"
            />
          </div>

          {/* Section 5: Delivery Timing Card */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Target Schedule Time
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetSchedule(5)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200/80 rounded-lg text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => setPresetSchedule(30)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200/80 rounded-lg text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  +30m
                </button>
                <button
                  type="button"
                  onClick={() => setPresetSchedule(120)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200/80 rounded-lg text-slate-600 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  +2 hrs
                </button>
              </div>
            </div>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />

            {/* Optional Pacing Toggle */}
            <div className="pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowPacingSettings(!showPacingSettings)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showPacingSettings ? 'Hide' : 'Configure'} Pacing & Rate Limits</span>
              </button>

              {showPacingSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>Inter-Email Delay:</span>
                      <span className="font-semibold text-emerald-700">{delayBetween}s</span>
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
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>Hourly Limit:</span>
                      <span className="font-semibold text-emerald-700">{hourlyLimit}/hr</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={hourlyLimit}
                      onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-900">{recipients.length}</span> lead{recipients.length === 1 ? '' : 's'} ready
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
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enqueuing...</span>
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
