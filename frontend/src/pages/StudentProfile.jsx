import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { authAPI } from '../services/api';

const SIDEBAR_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/student/my-events', label: 'My Events', icon: '📅' },
  { to: '/student/announcements', label: 'Announcements', icon: '📢' },
  { to: '/student/profile', label: 'Profile', icon: '👤' },
];

function Field({ label, value }) {
  return (
    <div className="py-3 border-b border-white/10 last:border-0">
      <dt className="text-xs font-medium text-white/50 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-white font-medium">{value || '—'}</dd>
    </div>
  );
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    authAPI
      .getMe()
      .then((r) => {
        if (r.data?.success && r.data.data) setProfile(r.data.data);
        else setError('Could not load profile.');
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(err.response?.data?.message || 'Failed to load profile.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

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
      </aside>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-white/60 text-sm">Your account details</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-500/15 border border-red-400/40 text-red-100 px-4 py-6">
            {error}
          </div>
        ) : profile ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden max-w-2xl">
            <div className="p-6 border-b border-white/10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-2xl font-bold text-cyan-200">
                {(profile.first_name || profile.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student'}
                </h2>
                <p className="text-white/60 text-sm">{profile.email}</p>
              </div>
            </div>
            <dl className="p-6">
              <Field label="First name" value={profile.first_name} />
              <Field label="Last name" value={profile.last_name} />
              <Field label="Email" value={profile.email} />
              <Field label="Date of birth" value={profile.dob} />
              <Field label="Phone" value={profile.phone} />
              <Field label="College" value={profile.college} />
            </dl>
          </div>
        ) : null}
      </main>
    </div>
  );
}
