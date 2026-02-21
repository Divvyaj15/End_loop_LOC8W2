import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { IconTeams, IconHackathons, IconQR, IconMenu, IconLive, IconEvents } from '../components/SidebarIcons';

const navItems = [
  { path: 'hackathons', label: 'Hackathons', Icon: IconHackathons },
  { path: 'events', label: 'Events', Icon: IconEvents },
  { path: 'teams', label: 'Teams', Icon: IconTeams },
  { path: 'qrs', label: 'QRs', Icon: IconQR },
  { path: 'events/dashboard', label: 'Event Dashboard', Icon: IconEvents },
];

export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56 lg:w-64' : 'w-20'
        } bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300`}
      >
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-2 uppercase text-white/90 text-sm font-medium tracking-wider hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <IconMenu className="w-5 h-5" />
            {sidebarOpen && <span>menu</span>}
          </button>
          {sidebarOpen && (
            <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs">
              END_LOOP
            </span>
          )}
          
        </div>
        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === 'hackathons'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  item.isLive
                    ? isActive
                      ? 'bg-red-500/20 border border-red-400/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                      : 'text-red-400/80 hover:bg-red-500/10 hover:text-red-300'
                    : isActive
                    ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200'
                    : 'border border-transparent text-white/70 hover:bg-white/5 hover:text-white/90'
                }`
              }
            >
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-current group-hover:scale-110 group-hover:bg-white/15 transition-transform">
                <item.Icon className="w-4 h-4" />
              </span>
              {sidebarOpen && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Back"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white/90">
            End_Loop&apos;s WorkSpace
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">
              Hello, {user?.first_name || user?.email?.split('@')[0] || 'User'}
            </span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 border border-white/20 flex items-center justify-center overflow-hidden">
              {user?.first_name?.[0] && (
                <span className="text-white font-semibold">
                  {user.first_name[0]}
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
