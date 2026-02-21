import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamsAPI } from '../services/api';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m || '00'} ${ampm}`;
}

export default function HackathonDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const [eventRes, teamsRes] = await Promise.all([
          eventAPI.getEventById(eventId),
          teamsAPI.getMyTeams(),
        ]);

        if (eventRes.data.success) {
          setEvent(eventRes.data.data);
        } else {
          setEvent(null);
        }

        if (teamsRes.data.success && Array.isArray(teamsRes.data.data)) {
          const myTeamForEvent = teamsRes.data.data.find((t) => t.teams?.event_id === eventId);
          setHasTeam(!!myTeamForEvent?.teams?.id);
        } else {
          setHasTeam(false);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event');
        setEvent(null);
        setHasTeam(false);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const handleRegister = () => {
    navigate(`/student/dashboard/events/${eventId}/create-team`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rounded-xl border border-red-400/60 bg-red-500/15 text-red-100 px-4 py-6">
        {error || 'Event not found.'}
      </div>
    );
  }

  const rules = Array.isArray(event.rules) ? event.rules : [];
  const eventMode = event.mode === 'offline' ? 'Offline' : event.mode === 'online' ? 'Online' : event.mode || '—';
  const entryFeeText = event.is_free ? 'Free' : event.entry_fee != null ? `₹${Number(event.entry_fee)}` : '—';

  return (
    <div className="space-y-6 pb-12">
      {/* Top: menu hint / back is in dashboard header */}
      <div className="rounded-xl overflow-hidden border border-white/20 bg-black/40">
        {/* Event background image */}
        <div className="h-48 sm:h-56 bg-gradient-to-br from-cyan-900/40 via-purple-900/30 to-transparent relative">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-purple-600/10 to-transparent" />
          )}
        </div>

        {/* Event Details */}
        <div className="p-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white/90 mb-4 pb-2 border-b border-white/10">Event Details</h2>
          <div className="space-y-3">
            <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Event name</p>
              <p className="text-white font-semibold">{event.title}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Committee name</p>
              <p className="text-white">{event.committee_name || '—'}</p>
            </div>
          </div>
        </div>

        {/* Timeline & Registration deadline */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-white/70 font-medium">Timeline</span>
            <span className="text-white/60">Registration deadline: {formatDate(event.registration_deadline)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
              <p className="text-xs text-white/50 mb-0.5">Start Date</p>
              <p className="text-white">{formatDate(event.start_date)}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
              <p className="text-xs text-white/50 mb-0.5">End Date</p>
              <p className="text-white">{formatDate(event.end_date)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
            <p className="text-xs text-white/50 mb-0.5">Event timings</p>
            <p className="text-white">
              {formatTime(event.event_start_time)} – {formatTime(event.event_end_time)}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-6">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Description</p>
          <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3 min-h-[80px]">
            <p className="text-white/90 whitespace-pre-wrap">{event.description || '—'}</p>
          </div>
        </div>

        {/* Event Mode & Entry Fee */}
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
            <p className="text-xs text-white/50 mb-0.5">Event Mode</p>
            <p className="text-white">{eventMode}</p>
            {event.mode === 'offline' && event.venue && (
              <p className="text-white/70 text-sm mt-1">{event.venue}</p>
            )}
          </div>
          <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-3">
            <p className="text-xs text-white/50 mb-0.5">Entry Fee</p>
            <p className="text-white">{entryFeeText}</p>
          </div>
        </div>

        {/* Download Event Brochure PDF */}
        <div className="px-6 pb-6">
          {event.problem_statement_url ? (
            <a
              href={event.problem_statement_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              Download Event Brochure PDF
            </a>
          ) : (
            <p className="text-white/50 text-sm">Event brochure not available yet.</p>
          )}
        </div>

        {/* Rules */}
        <div className="px-6 pb-6">
          <p className="text-lg font-semibold text-white mb-3">Rules</p>
          <div className="rounded-lg bg-white/10 border border-white/20 px-4 py-4 space-y-2">
            <p className="text-white/90">
              <span className="text-white/60">Number of team members:</span>{' '}
              {event.min_team_size === event.max_team_size
                ? event.max_team_size
                : `${event.min_team_size} – ${event.max_team_size}`}
              {event.allow_individual ? ' (individual allowed)' : ''}
            </p>
            {rules.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                {rules.map((rule, i) => (
                  <p key={i} className="text-white/80 text-sm pl-2">
                    • {rule}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Register button - bottom right */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            type="button"
            onClick={handleRegister}
            className="px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            {hasTeam ? 'View team status' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
