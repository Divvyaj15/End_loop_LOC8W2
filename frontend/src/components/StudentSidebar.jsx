import { NavLink, useNavigate } from 'react-router-dom';
import StudentInbox from './StudentInbox';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
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

const NAV_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', Icon: IconDashboard, end: true },
  { to: '/student/my-events', label: 'My Events', Icon: IconEvents },
  { to: '/student/teams', label: 'Teams', Icon: IconTeams },
  { to: '/student/qr-codes', label: 'QR Codes', Icon: IconQR },
  { to: '/student/announcements', label: 'Announcements', Icon: IconAnnouncements },
  { to: '/student/profile', label: 'Profile', Icon: IconProfile },
];

export default function StudentSidebar({ pendingInvitesCount = 0 } = {}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="w-20 lg:w-56 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Logo + Inbox */}
      <div className="h-20 flex items-center justify-between px-3 lg:px-4 border-b border-white/10 gap-2">
        <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs lg:text-sm truncate">HACK-X</span>
        <StudentInbox align="left" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 space-y-1 px-2 lg:px-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const badgeCount = item.to === '/student/teams' ? pendingInvitesCount : 0;
          return (
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
              <span className="w-8 flex items-center justify-center flex-shrink-0 relative">
                <item.Icon className="w-5 h-5" />
                {badgeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-black text-[10px] font-bold">
                    {badgeCount}
                  </span>
                )}
              </span>
              <span className="hidden lg:inline flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="hidden lg:inline text-amber-400 text-xs font-medium">({badgeCount})</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="pt-4 border-t border-white/10 px-2 lg:px-3 pb-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/15 text-white/50 hover:bg-white/5 hover:text-white text-sm transition-colors"
        >
          <span className="w-8 flex items-center justify-center flex-shrink-0">
            <IconLogout className="w-5 h-5" />
          </span>
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>
  );
}
