import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { eventAPI, teamAPI } from '../services/api';

const SIDEBAR_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/student/my-events', label: 'My Events', icon: '📅' },
  { to: '/student/announcements', label: 'Announcements', icon: '📢' },
  { to: '/student/profile', label: 'Profile', icon: '👤' },
];

const CARD_GRADIENTS = [
  'from-cyan-600/40 via-blue-900/50 to-slate-900',
  'from-violet-600/40 via-purple-900/50 to-slate-900',
  'from-emerald-600/40 via-teal-900/50 to-slate-900',
];

function formatEventDate(start, end) {
  if (!start || !end) return 'Date TBA';
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric', year: '2-digit' };
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

function isUpcoming(event) {
  const end = event?.end_date;
  if (!end) return true;
  const today = new Date().toISOString().slice(0, 10);
  return end >= today;
}

/** Only show in "Upcoming" if registration is still open */
function isRegistrationOpen(event) {
  const status = (event?.status || '').toLowerCase();
  const open = status === 'registration_open' || status === 'register_open';
  if (!open) return false;
  const deadline = event?.registration_deadline;
  if (!deadline) return true;
  const today = new Date().toISOString().slice(0, 10);
  return deadline >= today;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const registeredEventIds = new Set(
    (myTeams || [])
      .map((t) => t.teams?.event_id)
      .filter(Boolean)
  );

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      eventAPI.getEvents().then((r) => (r.data?.success ? r.data.data : [])),
      teamAPI.getMyTeams().then((r) => (r.data?.success ? r.data.data : [])),
    ])
      .then(([eventList, teams]) => {
        if (cancelled) return;
        setEvents(Array.isArray(eventList) ? eventList : []);
        setMyTeams(Array.isArray(teams) ? teams : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load events.');
          setEvents([]);
          setMyTeams([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Show all events that haven't ended in Upcoming; use registration status only for the Register button
  const upcoming = events.filter(isUpcoming);
  const past = events.filter((e) => !isUpcoming(e));

  const handleRegister = (eventId) => {
    navigate(`/student/events/${eventId}`);
  };

  const handleViewEvent = (eventId) => {
    navigate(`/student/events/${eventId}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      {/* Sidebar */}
      <aside className="w-20 lg:w-56 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="h-20 flex items-center justify-center lg:justify-start px-4 border-b border-white/10">
          <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs lg:text-sm">
            END_LOOP
          </span>
        </div>
        <nav className="flex-1 py-6 space-y-1 px-2 lg:px-3">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200'
                    : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="text-lg w-8 flex items-center justify-center">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 px-4 lg:px-8 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Back"
            >
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-white/90 font-medium">End_Loop&apos;s WorkSpace</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80 hidden sm:inline">
              Hello, {user.first_name || user.email?.split('@')[0] || 'Student'}
            </span>
            <div className="w-9 h-9 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-cyan-200 font-semibold">
              {(user.first_name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8">
          {error && (
            <div className="mb-4 bg-red-500/15 border border-red-400/60 text-red-100 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">Upcoming Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {upcoming.length === 0 ? (
                  <p className="text-white/50 col-span-full py-8 text-center">No upcoming events.</p>
                ) : (
                  upcoming.map((event, i) => {
                    const registered = registeredEventIds.has(event.id);
                    const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
                    return (
                      <div
                        key={event.id}
                        className={`rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${gradient} shadow-[0_18px_60px_rgba(0,0,0,0.4)] hover:border-cyan-400/30 transition-colors`}
                      >
                        <div className="aspect-[4/2] relative bg-black/30">
                          {event.banner_url ? (
                            <img
                              src={event.banner_url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover opacity-80"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-4xl font-bold text-white/20">
                                {(event.title || 'Event').slice(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>
                          <p className="text-sm text-white/60 mb-4">
                            {formatEventDate(event.start_date, event.end_date)}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {registered ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleViewEvent(event.id)}
                                  className="px-4 py-2 rounded-xl bg-cyan-500/90 text-white text-sm font-medium hover:bg-cyan-400 transition-colors"
                                >
                                  View
                                </button>
                                <span className="text-xs text-cyan-300 border border-cyan-500/40 rounded-full px-3 py-1">
                                  Registered
                                </span>
                              </>
                            ) : isRegistrationOpen(event) ? (
                              <button
                                type="button"
                                onClick={() => handleRegister(event.id)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-white text-sm font-semibold shadow-[0_4px_20px_rgba(34,211,238,0.3)] hover:from-cyan-300 hover:to-cyan-500 transition-all"
                              >
                                Register
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleViewEvent(event.id)}
                                  className="px-4 py-2 rounded-xl border border-white/30 text-white/80 text-sm font-medium hover:bg-white/5 transition-colors"
                                >
                                  View
                                </button>
                                <span className="text-xs text-amber-300/90 border border-amber-500/40 rounded-full px-3 py-1">
                                  Registration closed
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-6">Past Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {past.length === 0 ? (
                  <p className="text-white/50 col-span-full py-8 text-center">No past events.</p>
                ) : (
                  past.map((event, i) => {
                    const registered = registeredEventIds.has(event.id);
                    const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
                    return (
                      <div
                        key={event.id}
                        className={`rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${gradient} opacity-90 shadow-[0_18px_60px_rgba(0,0,0,0.4)]`}
                      >
                        <div className="aspect-[4/2] relative bg-black/30">
                          {event.banner_url ? (
                            <img
                              src={event.banner_url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover opacity-70"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-4xl font-bold text-white/20">
                                {(event.title || 'Event').slice(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>
                          <p className="text-sm text-white/60 mb-4">
                            {formatEventDate(event.start_date, event.end_date)}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewEvent(event.id)}
                              className="px-4 py-2 rounded-xl border border-cyan-400/50 text-cyan-300 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
                            >
                              View
                            </button>
                            {registered && (
                              <span className="text-xs text-white/50">You participated</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
