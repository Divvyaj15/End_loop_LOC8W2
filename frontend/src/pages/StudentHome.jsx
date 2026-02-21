import { useState, useEffect } from 'react';
import { teamsAPI } from '../services/api';

export default function StudentHome() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchParticipatedEvents = async () => {
      try {
        setError('');
        const response = await teamsAPI.getMyTeams();
        if (response.data.success && Array.isArray(response.data.data)) {
          const teams = response.data.data;
          const eventMap = new Map();
          teams.forEach((tm) => {
            const ev = tm.teams?.events;
            if (ev && ev.title) {
              eventMap.set(tm.teams.event_id, {
                id: tm.teams.event_id,
                title: ev.title,
                committeeName: ev.committee_name || '—',
                startDate: ev.start_date,
                endDate: ev.end_date,
              });
            }
          });
          setEvents(Array.from(eventMap.values()));
        } else {
          setEvents([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load your events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipatedEvents();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl lg:text-3xl font-bold text-white">Your Events</h2>

      {error && (
        <div className="bg-red-500/15 border border-red-400/60 text-red-100 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl border border-white/10 bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-white/60">No events yet. Register for hackathons to see them here.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,217,255,0.1)] transition-all"
            >
              <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
              <p className="text-sm text-white/60">{event.committeeName}</p>
              {(event.startDate || event.endDate) && (
                <p className="mt-2 text-xs text-white/50">
                  {event.startDate && new Date(event.startDate).toLocaleDateString()}
                  {event.endDate && ` – ${new Date(event.endDate).toLocaleDateString()}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
