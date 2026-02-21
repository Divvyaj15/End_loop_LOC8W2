import { useState, useEffect } from 'react';
import { teamAPI, announcementAPI } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function formatFull(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Announcement card ─────────────────────────────────────────────────────────
function AnnouncementCard({ announcement, eventTitle }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = announcement.message?.length > 200;
  const displayText = isLong && !expanded
    ? announcement.message.slice(0, 200) + '…'
    : announcement.message;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            {eventTitle}
          </span>
          {announcement.is_pinned && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
              Pinned
            </span>
          )}
        </div>
        <span className="text-white/40 text-xs flex-shrink-0" title={formatFull(announcement.created_at)}>
          {timeAgo(announcement.created_at)}
        </span>
      </div>

      <h3 className="text-white font-semibold text-base mb-1.5">{announcement.title}</h3>
      <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {announcement.created_by_name && (
        <p className="mt-3 text-white/30 text-xs">— {announcement.created_by_name}</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentAnnouncements() {
  const [events, setEvents] = useState([]);       // [{ id, title, announcements[] }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        // 1. Get all events the student is part of
        const teamsRes = await teamAPI.getMyTeams();
        const teams = teamsRes.data.success ? (teamsRes.data.data || []) : [];

        // Deduplicate by event_id
        const seen = new Set();
        const uniqueEvents = [];
        for (const t of teams) {
          const ev = t.teams?.events;
          const id = t.teams?.event_id;
          if (id && !seen.has(id) && ev) {
            seen.add(id);
            uniqueEvents.push({ id, title: ev.title || 'Event' });
          }
        }

        if (uniqueEvents.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        // 2. Fetch announcements for each event in parallel
        const results = await Promise.allSettled(
          uniqueEvents.map((ev) =>
            announcementAPI.getByEvent(ev.id).then((r) => ({
              ...ev,
              announcements: r.data?.success ? (r.data.data || []) : [],
            }))
          )
        );

        const loaded = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value);

        setEvents(loaded);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Flatten all announcements for "All" view, sorted by date desc
  const allAnnouncements = events
    .flatMap((ev) => ev.announcements.map((a) => ({ ...a, _eventTitle: ev.title })))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const displayEvents = selectedEvent === 'all'
    ? null
    : events.find((e) => e.id === selectedEvent);

  const displayList = selectedEvent === 'all'
    ? allAnnouncements
    : (displayEvents?.announcements || [])
        .map((a) => ({ ...a, _eventTitle: displayEvents.title }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalCount = allAnnouncements.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      <StudentSidebar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Announcements</h1>
              <p className="text-white/50 text-sm mt-0.5">
                {loading ? 'Loading…' : `${totalCount} announcement${totalCount !== 1 ? 's' : ''} across your events`}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/50 bg-red-500/15 text-red-100 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Event filter tabs */}
          {!loading && events.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedEvent('all')}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                  selectedEvent === 'all'
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                    : 'border-white/15 text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                All events
              </button>
              {events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEvent(ev.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                    selectedEvent === ev.id
                      ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                      : 'border-white/15 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {ev.title}
                  <span className="ml-1.5 text-xs opacity-60">
                    ({ev.announcements.length})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <p className="text-white/50">No announcements yet.</p>
              <p className="text-white/30 text-sm mt-1">Register for an event to see announcements here.</p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
              <p className="text-white/50">No announcements for this event yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayList.map((a, i) => (
                <AnnouncementCard
                  key={a.id || i}
                  announcement={a}
                  eventTitle={a._eventTitle}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
