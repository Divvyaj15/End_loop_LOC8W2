import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamsAPI, eventAPI } from '../services/api';

function formatDateRange(start, end) {
  if (!start && !end) return '';
  const s = start ? new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '';
  const e = end ? new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '';
  return [s, e].filter(Boolean).join(' – ');
}

function HackathonCard({ event, variant = 'upcoming' }) {
  const dateStr = formatDateRange(event.startDate, event.endDate);
  const isParticipated = variant === 'participated';

  return (
    <div className="flex-shrink-0 w-72 rounded-xl overflow-hidden border border-white/20 bg-black/60 hover:border-cyan-500/60 hover:shadow-[0_0_24px_rgba(0,217,255,0.2)] transition-all flex flex-col">
      {/* Banner */}
      <div className="h-36 bg-gradient-to-br from-cyan-900/50 via-purple-900/40 to-pink-900/30 relative overflow-hidden">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 via-purple-600/20 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
        {dateStr && (
          <p className="text-sm text-white/70 mb-3">{dateStr}</p>
        )}
        {event.committeeName && event.committeeName !== '—' && (
          <p className="text-xs text-white/50 mb-4">{event.committeeName}</p>
        )}

        <div className="mt-auto flex gap-2">
          {isParticipated ? (
            <>
              <Link
                to={`/student/dashboard/events/${event.id}`}
                className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium bg-gradient-to-r from-cyan-400 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all"
              >
                View
              </Link>
              <Link
                to={`/student/dashboard/events/${event.id}`}
                className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium border border-white/30 text-white/90 hover:bg-white/10 transition-all"
              >
                Details
              </Link>
            </>
          ) : (
            <>
              <Link
                to={`/student/dashboard/events/${event.id}/create-team`}
                className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium border border-white/30 text-white/90 hover:bg-white/10 transition-all"
              >
                Register
              </Link>
              <Link
                to={`/student/dashboard/events/${event.id}`}
                className="flex-1 py-2.5 rounded-lg text-center text-sm font-medium bg-gradient-to-r from-cyan-400 to-cyan-600 text-white hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all"
              >
                Details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentHackathons() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [yourEvents, setYourEvents] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingYours, setLoadingYours] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const participatedIds = [];
      try {
        const teamsRes = await teamsAPI.getMyTeams();
        if (teamsRes.data.success && Array.isArray(teamsRes.data.data)) {
          const teams = teamsRes.data.data;
          const eventMap = new Map();
          teams.forEach((tm) => {
            const ev = tm.teams?.events;
            if (tm.teams?.event_id) participatedIds.push(tm.teams.event_id);
            if (ev && ev.title) {
              eventMap.set(tm.teams.event_id, {
                id: tm.teams.event_id,
                title: ev.title,
                committeeName: ev.committee_name || '—',
                startDate: ev.start_date,
                endDate: ev.end_date,
                bannerUrl: null,
              });
            }
          });
          setYourEvents(Array.from(eventMap.values()));
        } else {
          setYourEvents([]);
        }
      } catch {
        setYourEvents([]);
      } finally {
        setLoadingYours(false);
      }

      try {
        setError('');
        const response = await eventAPI.getAllEvents();
        if (response.data.success && Array.isArray(response.data.data)) {
          const today = new Date().toISOString().split('T')[0];
          const upcoming = response.data.data
            .filter((e) => e.end_date >= today && !participatedIds.includes(e.id))
            .map((e) => ({
              id: e.id,
              title: e.title,
              committeeName: e.committee_name || '—',
              startDate: e.start_date,
              endDate: e.end_date,
              bannerUrl: e.banner_url || null,
            }));
          setUpcomingEvents(upcoming);
        } else {
          setUpcomingEvents([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load upcoming events');
        setUpcomingEvents([]);
      } finally {
        setLoadingUpcoming(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-10">
      <h2 className="text-2xl lg:text-3xl font-bold text-white">Hackathons</h2>

      {error && (
        <div className="rounded-lg border border-red-400/60 bg-red-500/15 text-red-100 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Upcoming Events */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Upcoming Events</h3>
        {loadingUpcoming ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-72 h-80 rounded-xl border border-white/20 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-white/20 bg-white/5 px-6 py-12 text-center">
            <p className="text-white/60">No upcoming hackathons.</p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-2 -mx-1 px-1">
            {upcomingEvents.map((event) => (
              <HackathonCard key={event.id} event={event} variant="upcoming" />
            ))}
          </div>
        )}
      </section>

      {/* Your Events */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Your Events</h3>
        {loadingYours ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-72 h-80 rounded-xl border border-white/20 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : yourEvents.length === 0 ? (
          <div className="rounded-xl border border-white/20 bg-white/5 px-6 py-12 text-center">
            <p className="text-white/60">No events yet. Register for hackathons to see them here.</p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-2 -mx-1 px-1">
            {yourEvents.map((event) => (
              <HackathonCard key={event.id} event={event} variant="participated" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
