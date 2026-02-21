import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { teamAPI } from '../services/api';

const SIDEBAR_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/student/my-events', label: 'My Events', icon: '📅' },
  { to: '/student/announcements', label: 'Announcements', icon: '📢' },
  { to: '/student/profile', label: 'Profile', icon: '👤' },
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
    if (!raw) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    teamAPI
      .getMyTeams()
      .then((r) => setTeams(r.data?.success ? r.data.data || [] : []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const eventTeams = teams.filter((t) => t.teams?.events);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      <aside className="w-20 lg:w-56 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="h-20 flex items-center justify-center lg:justify-start px-4 border-b border-white/10">
          <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs lg:text-sm">END_LOOP</span>
        </div>
        <nav className="flex-1 py-6 space-y-1 px-2 lg:px-3">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200' : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="text-lg w-8 flex items-center justify-center">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/10 px-2 lg:px-3 pb-4">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/15 text-white/50 hover:bg-white/5 hover:text-white text-sm transition-colors"
          >
            <span className="text-lg w-8 flex items-center justify-center">⎋</span>
            <span className="hidden lg:inline">Log out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <header className="h-20 flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Events</h1>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Dashboard
          </button>
        </header>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : eventTeams.length === 0 ? (
          <p className="text-white/50 py-12 text-center">You haven’t registered for any events yet.</p>
        ) : (
          <div className="space-y-4">
            {eventTeams.map((t) => {
              const ev = t.teams?.events;
              const eventId = t.teams?.event_id;
              return (
                <div
                  key={t.teams?.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-white">{ev?.title || 'Event'}</h2>
                    <p className="text-sm text-white/60">
                      {ev ? formatEventDate(ev.start_date, ev.end_date) : ''}
                      {ev?.committee_name && ` · ${ev.committee_name}`}
                    </p>
                    <p className="text-xs text-cyan-300/80 mt-1">Team: {t.teams?.team_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/student/events/${eventId}`)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-sm font-medium hover:bg-cyan-500/30"
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
