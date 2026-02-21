import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI, teamsAPI } from '../services/api';

function formatDateRange(start, end) {
  if (!start && !end) return '';
  const s = start ? new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '';
  const e = end ? new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '';
  return [s, e].filter(Boolean).join(' – ');
}

function EventCard({ event, hasTeam, onSelect }) {
  const dateStr = formatDateRange(event.start_date, event.end_date);
  const isRegistered = hasTeam;

  return (
    <div className="flex-shrink-0 w-80 rounded-xl overflow-hidden border border-white/20 bg-black/60 hover:border-cyan-500/60 hover:shadow-[0_0_24px_rgba(0,217,255,0.2)] transition-all flex flex-col">
      {/* Banner */}
      <div className="h-40 bg-gradient-to-br from-cyan-900/50 via-purple-900/40 to-pink-900/30 relative overflow-hidden">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 via-purple-600/20 to-transparent" />
        )}
        {isRegistered && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-medium">
            Registered
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
        {dateStr && (
          <p className="text-sm text-white/70 mb-3">{dateStr}</p>
        )}
        {event.committee_name && event.committee_name !== '—' && (
          <p className="text-xs text-white/50 mb-4">{event.committee_name}</p>
        )}

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            {event.mode === 'offline' ? 'Offline' : event.mode === 'online' ? 'Online' : 'Hybrid'}
          </div>
          {event.venue && event.mode === 'offline' && (
            <p className="text-xs text-white/50">📍 {event.venue}</p>
          )}
          <p className="text-xs text-white/50">
            👥 {event.min_team_size === event.max_team_size ? event.max_team_size : `${event.min_team_size}-${event.max_team_size}`} members
          </p>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => onSelect(event)}
            className="w-full py-3 rounded-lg text-center text-sm font-medium bg-gradient-to-r from-cyan-400 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all"
          >
            {isRegistered ? 'View Dashboard' : 'Select Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventSelection() {
  const [events, setEvents] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        
        // Get user's registered events
        const teamsRes = await teamsAPI.getMyTeams();
        const participatedIds = [];
        if (teamsRes.data.success && Array.isArray(teamsRes.data.data)) {
          teamsRes.data.data.forEach((tm) => {
            if (tm.teams?.event_id) {
              participatedIds.push(tm.teams.event_id);
            }
          });
        }
        setRegisteredEventIds(participatedIds);

        // Get all events
        const response = await eventAPI.getAllEvents();
        if (response.data.success && Array.isArray(response.data.data)) {
          const today = new Date().toISOString().split('T')[0];
          const activeEvents = response.data.data
            .filter((e) => e.end_date >= today)
            .map((e) => ({
              id: e.id,
              title: e.title,
              committee_name: e.committee_name || '—',
              start_date: e.start_date,
              end_date: e.end_date,
              banner_url: e.banner_url || null,
              mode: e.mode,
              venue: e.venue,
              min_team_size: e.min_team_size,
              max_team_size: e.max_team_size,
            }))
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
          
          setEvents(activeEvents);
        } else {
          setEvents([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleEventSelect = (event) => {
    if (registeredEventIds.includes(event.id)) {
      // Navigate to event dashboard if already registered
      navigate(`/student/dashboard/events/${event.id}/dashboard`);
    } else {
      // Navigate to event details to register
      navigate(`/student/dashboard/events/${event.id}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded bg-white/10 animate-pulse" />
        <div className="flex gap-6 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 h-96 rounded-xl border border-white/20 bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Select Event</h2>
        <p className="text-white/60">Choose an event to view its dashboard and manage your participation</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/60 bg-red-500/15 text-red-100 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/20 bg-white/5 px-6 py-16 text-center">
          <p className="text-white/60 text-lg mb-2">No active events available</p>
          <p className="text-white/40 text-sm">Check back later for new hackathons and events</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-white/60">
              Showing {events.length} active event{events.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs text-white/60">Registered</span>
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-2 -mx-1 px-1">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                hasTeam={registeredEventIds.includes(event.id)}
                onSelect={handleEventSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
