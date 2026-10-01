import { useState, useEffect, useRef } from 'react';
import { emailApi, type Sender } from '../services/api';
import {
  X,
  Clock,
  Loader2,
  Upload,
  Send,
  SlidersHorizontal,
  Mail,
  Users,
  Calendar,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ComposeModalProps {
  onClose: () => void;
  onScheduleComplete: () => void;
}

/** Format a Date as 'YYYY-MM-DDTHH:mm' in the user's local timezone */
function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
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
    setScheduledAt(toLocalDatetimeString(target));
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
    setScheduledAt(toLocalDatetimeString(target));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Spacious Enlarged Outer Container */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10 animate-scale-in">
        
        {/* Header */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Email Campaign</h2>
              <p className="text-xs text-slate-500 mt-0.5">Schedule delayed cold outreach with BullMQ rate pacing</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spacious 2-Column Content Body */}
        <div className="flex-1 overflow-y-auto p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            
            {/* Left Column: Email Message (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Sender Select */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>From Sender</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedSender}
                    onChange={(e) => setSelectedSender(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors"
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName ? `${s.displayName} (${s.email})` : s.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subject Line
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quick question regarding Outbox Labs outreach..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Body
                  </label>
                  <span className="text-[11px] text-slate-400">Plain text or HTML</span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Write your email copy here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Right Column: Audience & Timing Strategy (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Recipients Card */}
              <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Recipients
                    </span>
                  </div>

                  {/* CSV Upload */}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs transition-all cursor-pointer"
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
                </div>

                {/* Email Add Input */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter email and press Enter..."
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={handleRecipientKeyDown}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addManualRecipient}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    Add
                  </button>
                </div>

                {/* Recipients Chips Container */}
                <div className="min-h-[90px] max-h-[140px] overflow-y-auto p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap gap-2 content-start">
                  {recipients.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center py-4 text-slate-400 text-xs">
                      <span>No recipients added yet</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">Upload a CSV or add leads manually</span>
                    </div>
                  ) : (
                    recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium border border-slate-200"
                      >
                        <span className="truncate max-w-[160px]">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {recipients.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                    <span>Total leads: <strong className="text-slate-900">{recipients.length}</strong></span>
                    <button
                      type="button"
                      onClick={() => setRecipients([])}
                      className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery Timing Card */}
              <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Schedule Timing
                    </span>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPresetSchedule(5)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      +5m
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetSchedule(30)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetSchedule(120)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      +2h
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Pacing Settings Toggle */}
                <div className="pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setShowPacingSettings(!showPacingSettings)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showPacingSettings ? 'Hide' : 'Configure'} Pacing & Rate Limits</span>
                  </button>

                  {showPacingSettings && (
                    <div className="space-y-3 pt-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                          <span>Inter-Email Delay:</span>
                          <span className="font-bold text-emerald-700">{delayBetween}s</span>
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

                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                          <span>Hourly Limit:</span>
                          <span className="font-bold text-emerald-700">{hourlyLimit}/hr</span>
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
          </div>
        </div>

        {/* Modal Sticky Footer with Ample Breathing Room */}
        <div
          style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0' }}
          className="bg-slate-50 flex items-center justify-between shrink-0 rounded-b-3xl"
        >
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {recipients.length}
            </span>
            <span>lead{recipients.length === 1 ? '' : 's'} queued for dispatch</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSchedule}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold py-2.5 px-6 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enqueuing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 -rotate-12" />
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
