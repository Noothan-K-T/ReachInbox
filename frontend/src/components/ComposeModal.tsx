import { useState, useEffect, useRef } from 'react';
import { emailApi, type Sender } from '../services/api';
import { ArrowLeft, Upload, X, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ComposeModalProps {
  onClose: () => void;
  onScheduleComplete: () => void;
}

export default function ComposeModal({ onClose, onScheduleComplete }: ComposeModalProps) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetween, setDelayBetween] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSendLater, setShowSendLater] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSenders();
    // Default to 1 minute from now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    setScheduledAt(now.toISOString().slice(0, 16));
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
      toast.success(`${data.count} email addresses detected`);
    } catch {
      toast.error('Failed to parse file');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const addManualRecipient = (input: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const trimmed = input.trim();
    if (emailRegex.test(trimmed) && !recipients.includes(trimmed)) {
      setRecipients((prev) => [...prev, trimmed.toLowerCase()]);
      return true;
    }
    return false;
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = (e.target as HTMLInputElement).value;
      if (addManualRecipient(input)) {
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const handleSchedule = async () => {
    if (!selectedSender) {
      toast.error('Please select a sender');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please set a scheduled time');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await emailApi.schedule({
        senderId: selectedSender,
        recipients,
        subject,
        body: body || '<p>No content</p>',
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetweenEmails: delayBetween,
      });

      toast.success(`${data.count} emails scheduled successfully!`);
      onScheduleComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickTime = (minutes: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    setScheduledAt(date.toISOString().slice(0, 16));
    setShowSendLater(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative ml-64 flex-1 bg-white animate-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Compose New Email</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSendLater(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Send Later
            </button>
            <button
              onClick={handleSchedule}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {submitting ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Form */}
          <div className="flex-1 p-6 max-w-3xl">
            {/* From */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              <label className="text-sm text-gray-500 w-16">From</label>
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="flex-1 text-sm text-gray-900 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName ? `${s.displayName} <${s.email}>` : s.email}
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-100">
              <label className="text-sm text-gray-500 w-16 pt-1">To</label>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-xs border border-green-200"
                    >
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="hover:text-green-900 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Type email and press Enter"
                    onKeyDown={handleRecipientKeyDown}
                    className="flex-1 text-sm border-none focus:outline-none placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {recipients.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    ✓ {recipients.length} email address{recipients.length !== 1 ? 'es' : ''} detected
                  </p>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              <label className="text-sm text-gray-500 w-16">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
                className="flex-1 text-sm text-gray-900 border-none focus:outline-none placeholder:text-gray-400"
              />
            </div>

            {/* Scheduling Options */}
            <div className="flex items-center gap-6 mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Delay between emails</label>
                <input
                  type="number"
                  value={delayBetween}
                  onChange={(e) => setDelayBetween(parseInt(e.target.value) || 2)}
                  min={1}
                  max={60}
                  className="w-16 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:border-green-500"
                />
                <span className="text-xs text-gray-400">sec</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Hourly limit</label>
                <input
                  type="number"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 200)}
                  min={1}
                  max={10000}
                  className="w-20 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-2 block">Type Your Mail...</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email content here..."
                className="w-full h-64 text-sm text-gray-900 border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
              />
            </div>

            {/* Formatting Toolbar (visual) */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1.5">
              {['B', 'I', 'U', 'S', '⟳', '⟲', '≡', '⊞', '¶', '⟨⟩', '↗', 'A₁', 'Aₐ'].map((icon, i) => (
                <button
                  key={i}
                  className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded text-xs cursor-pointer"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Send Later Panel */}
          {showSendLater && (
            <div className="w-72 border-l border-gray-200 p-4 bg-gray-50 animate-slide-in">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Send Later</h3>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setQuickTime(60)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                >
                  ⏰ In 1 hour
                </button>
                <button
                  onClick={() => setQuickTime(240)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                >
                  🌅 Tomorrow Morning (4h)
                </button>
                <button
                  onClick={() => setQuickTime(480)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                >
                  🌆 Tomorrow Afternoon (8h)
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Custom Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setShowSendLater(false)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSendLater(false);
                    toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`);
                  }}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
