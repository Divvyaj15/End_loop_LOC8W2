import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { teamAPI } from '../services/api';

// ── Shared SVG icons (same as StudentDashboard) ───────────────────────────────
const IconDashboard = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IconEvents = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconTeams = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconQR = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);
const IconAnnouncements = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);
const IconProfile = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconLogout = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const SIDEBAR_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', Icon: IconDashboard, end: true },
  { to: '/student/my-events', label: 'My Events', Icon: IconEvents },
  { to: '/student/teams', label: 'Teams', Icon: IconTeams },
  { to: '/student/qr-codes', label: 'QR Codes', Icon: IconQR },
  { to: '/student/announcements', label: 'Announcements', Icon: IconAnnouncements },
  { to: '/student/profile', label: 'Profile', Icon: IconProfile },
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

export default function StudentMyEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/login', { replace: true }); return; }
    try { setUser(JSON.parse(raw)); }
    catch { navigate('/login', { replace: true }); }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    teamAPI.getMyTeams()
      .then((r) => setTeams(r.data?.success ? r.data.data || [] : []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const eventTeams = teams.filter((t) => t.teams?.events);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">

      {/* ── Sidebar (identical to StudentDashboard) ── */}
      <aside className="w-20 lg:w-56 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="h-20 flex items-center justify-center lg:justify-start px-4 border-b border-white/10">
          <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs lg:text-sm">HACK-X</span>
        </div>
        <nav className="flex-1 py-6 space-y-1 px-2 lg:px-3 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive
                  ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200'
                  : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="w-8 flex items-center justify-center flex-shrink-0">
                <item.Icon className="w-5 h-5" />
              </span>
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/10 px-2 lg:px-3 pb-4">
          <button
            type="button"
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/15 text-white/50 hover:bg-white/5 hover:text-white text-sm transition-colors"
          >
            <span className="w-8 flex items-center justify-center flex-shrink-0">
              <IconLogout className="w-5 h-5" />
            </span>
            <span className="hidden lg:inline">Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 px-4 lg:px-8 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-white/90 font-medium">HACK-X&apos;s WorkSpace</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white/70 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors"
            >
              Log out
            </button>
            <span className="text-sm text-white/80 hidden sm:inline">
              Hello, {user.first_name || user.email?.split('@')[0] || 'Student'}
            </span>
            <div className="w-9 h-9 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-cyan-200 font-semibold">
              {(user.first_name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">My Events</h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : eventTeams.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <p className="text-white/50 text-lg mb-1">No events yet</p>
              <p className="text-white/30 text-sm mb-4">Register for an event from the dashboard to see it here.</p>
              <button
                type="button"
                onClick={() => navigate('/student/dashboard')}
                className="px-5 py-2.5 rounded-xl bg-cyan-500/90 text-white text-sm font-medium hover:bg-cyan-400 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            /* ── Card grid (same style as dashboard) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {eventTeams.map((t, i) => {
                const ev = t.teams?.events;
                const eventId = t.teams?.event_id;
                const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];

                return (
                  <div
                    key={t.teams?.id}
                    className={`rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br ${gradient} shadow-[0_18px_60px_rgba(0,0,0,0.4)] hover:border-cyan-400/30 transition-colors`}
                  >
                    {/* Banner */}
                    <div className="aspect-[4/2] relative bg-black/30">
                      {ev?.banner_url ? (
                        <img
                          src={ev.banner_url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl font-bold text-white/20">
                            {(ev?.title || 'E').slice(0, 2)}
                          </span>
                        </div>
                      )}
                      {/* Registered badge */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-medium">
                        Registered
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-white mb-1">{ev?.title || 'Event'}</h3>
                      {ev?.committee_name && (
                        <p className="text-xs text-white/50 mb-1">{ev.committee_name}</p>
                      )}
                      <p className="text-sm text-white/60 mb-1">
                        {formatEventDate(ev?.start_date, ev?.end_date)}
                      </p>
                      <p className="text-xs text-cyan-300/80 mb-4">
                        Team: <span className="font-medium">{t.teams?.team_name}</span>
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/student/events/${eventId}`)}
                          className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/student/events/${eventId}/dashboard`)}
                          className="px-4 py-2 rounded-xl bg-cyan-500/90 text-white text-sm font-medium hover:bg-cyan-400 transition-colors"
                        >
                          Dashboard
                        </button>
                        <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${t.teams?.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          }`}>
                          {t.teams?.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
