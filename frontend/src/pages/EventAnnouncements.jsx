import { useState } from 'react';
import { announcementAPI } from '../services/api';

const PHASE_USE_SHORTLISTED = ['shortlisting', 'hackathon_active', 'judging', 'completed'];

export default function EventAnnouncements({ eventId, event }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const audience = event?.status && PHASE_USE_SHORTLISTED.includes(event.status)
    ? 'shortlisted'
    : 'all';

  const handleSend = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) {
      setError('Please type your announcement.');
      return;
    }
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const res = await announcementAPI.create({
        eventId,
        title: 'Announcement',
        message: text,
        audience,
      });
      if (res.data?.success) {
        setSuccess(
          audience === 'shortlisted'
            ? 'Announcement sent to all shortlisted teams.'
            : 'Announcement sent to all registered teams.'
        );
        setMessage('');
      } else {
        setError(res.data?.message || 'Failed to send announcement.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send announcement.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Announcements Page</h2>
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 max-w-2xl">
        <p className="text-xs text-white/50 mb-4">
          {audience === 'shortlisted'
            ? 'This will be sent only to participants in shortlisted teams.'
            : 'This will be sent to all participants in registered teams.'}
        </p>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label htmlFor="announcement-message" className="sr-only">Type Announcement</label>
            <textarea
              id="announcement-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type Announcement"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-cyan-400/60 focus:outline-none resize-y"
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
        {success && (
          <p className="mt-4 text-sm text-emerald-400">{success}</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
