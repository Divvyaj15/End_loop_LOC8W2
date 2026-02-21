import { useState } from 'react';
import { announcementAPI } from '../services/api';

export default function EventMessageTeam({ eventId, teams }) {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const teamList = Array.isArray(teams) ? teams : [];

  const handleSend = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!selectedTeamId) {
      setError('Please select a team.');
      return;
    }
    if (!text) {
      setError('Please enter your message.');
      return;
    }
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const res = await announcementAPI.create({
        eventId,
        title: 'Message',
        message: text,
        audience: 'team',
        teamId: selectedTeamId,
      });
      if (res.data?.success) {
        setSuccess('Message sent to the selected team.');
        setMessage('');
      } else {
        setError(res.data?.message || 'Failed to send message.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Message Individual Teams</h2>
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 max-w-2xl">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label htmlFor="message-team" className="block text-xs text-white/50 mb-1">Select Team</label>
            <select
              id="message-team"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/60 focus:outline-none appearance-none bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")" }}
              disabled={sending}
            >
              <option value="">Select Team</option>
              {teamList.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_name || `Team ${team.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="message-body" className="sr-only">Enter your message</label>
            <textarea
              id="message-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message"
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
