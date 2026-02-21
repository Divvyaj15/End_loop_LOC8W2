import { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';

const SIDEBAR_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/student/my-events', label: 'My Events', icon: '📅' },
  { to: '/student/announcements', label: 'Announcements', icon: '📢' },
  { to: '/student/profile', label: 'Profile', icon: '👤' },
];

export default function StudentPlaceholder({ title = 'Page' }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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

  if (!user) return null;

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
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 flex items-center justify-center">
        <div className="text-center text-white/60">
          <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
          <p>Coming soon.</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/30"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
