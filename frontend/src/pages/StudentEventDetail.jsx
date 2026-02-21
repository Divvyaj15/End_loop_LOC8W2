import { useState, useEffect, useMemo } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamAPI } from '../services/api';

// ── SVG icon components ──────────────────────────────────────────────────────
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

function formatEventDate(dateString) {
  if (!dateString) return 'TBA';
  const d = new Date(dateString);
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-IN', opts);
}

function formatEventTime(timeString) {
  if (!timeString) return '';
  // Assuming timeString comes as "HH:MM:SS" or "HH:MM"
  const [hours, minutes] = timeString.split(':');
  const d = new Date();
  d.setHours(parseInt(hours, 10));
  d.setMinutes(parseInt(minutes, 10));
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Number of teammate email slots: leader counts as 1, so (min - 1) to (max - 1) teammates */
function getTeammateSlots(event) {
  const min = Math.max(1, Number(event?.min_team_size) || 1);
  const max = Math.max(min, Number(event?.max_team_size) || 4);
  const allowIndividual = event?.allow_individual !== false;
  const minTeammates = allowIndividual && min <= 1 ? 0 : min - 1;
  const maxTeammates = max - 1;
  return { minTeammates, maxTeammates };
}

export default function StudentEventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teammateEmails, setTeammateEmails] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { minTeammates, maxTeammates } = useMemo(() => getTeammateSlots(event), [event]);

  useEffect(() => {
    if (!event || minTeammates < 0) return;
    setTeammateEmails(Array.from({ length: minTeammates }, () => ''));
  }, [event?.id, minTeammates]);

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
    if (!user || !eventId) return;
    setLoading(true);
    setError('');
    Promise.all([
      eventAPI.getEventById(eventId).then((r) => (r.data?.success ? r.data.data : null)),
      teamAPI.getMyTeams().then((r) => {
        const teams = r.data?.success ? r.data.data || [] : [];
        return teams.find((t) => t.teams?.event_id === eventId) || null;
      }),
    ])
      .then(([ev, team]) => {
        setEvent(ev);
        setMyTeam(team);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load event.');
        setEvent(null);
        setMyTeam(null);
      })
      .finally(() => setLoading(false));
  }, [user, eventId]);

  const updateTeammateEmail = (index, value) => {
    setTeammateEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addTeammateSlot = () => {
    if (teammateEmails.length >= maxTeammates) return;
    setTeammateEmails((prev) => [...prev, '']);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!eventId || !teamName.trim()) {
      setError('Please enter a team name.');
      return;
    }
    const emails = teammateEmails.map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (minTeammates > 0 && emails.length < minTeammates) {
      setError(`This event requires at least ${event.min_team_size} team members (including you). Please add ${minTeammates - emails.length} more teammate email(s).`);
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await teamAPI.createTeam({
        eventId,
        teamName: teamName.trim(),
        memberEmails: emails,
      });
      if (res.data?.success) {
        setSuccess(res.data.message || 'Team created!');
        setMyTeam({ teams: { id: res.data.data?.teamId, team_name: teamName.trim(), event_id: eventId } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  const registrationOpen = event && (event.status === 'registration_open' || event.status === 'register_open');
  const registrationClosed = event && !registrationOpen;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      {/* Sidebar */}
      <aside className="w-20 lg:w-56 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col shrink-0 overflow-y-auto">
        <div className="h-20 flex items-center justify-center lg:justify-start px-4 border-b border-white/10 shrink-0">
          <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs lg:text-sm">HACK-X</span>
        </div>
        <nav className="flex-1 py-6 space-y-1 px-2 lg:px-3">
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
              <span className="hidden lg:inline font-medium tracking-wide">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/5 bg-white/[0.01] backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-white/90 font-semibold tracking-wide flex items-center gap-2">
              <span className="text-cyan-400">»</span> Event Details
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-full pl-3 pr-1 py-1 border border-white/10">
              <span className="text-sm font-medium text-white/80 pr-2">{user.first_name || 'Student'}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${user.first_name || 'U'}&background=0D8ABC&color=fff`} alt="avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16">
          {loading ? (
            <div className="flex justify-center py-32">
              <div className="w-12 h-12 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : !event ? (
            <div className="p-8 mt-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-center max-w-lg mx-auto">
              {error || 'Event not found.'}
              <button
                className="mt-4 block mx-auto px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                onClick={() => navigate(-1)}
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Banner Section */}
              <div className="relative w-full aspect-[21/9] md:aspect-[3/1] bg-black/50 overflow-hidden shadow-2xl">
                {event.banner_url ? (
                  <img
                    src={event.banner_url}
                    alt={event.title}
                    className="w-full h-full object-cover opacity-90 object-center"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-900/40 to-blue-900/40">
                    <span className="text-white/20 text-5xl font-bold tracking-wider">{event.title?.slice(0, 2)}</span>
                  </div>
                )}
                {/* Optional Gradient Overlay for readability on image bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent"></div>
              </div>

              <div className="px-4 lg:px-8 -mt-16 md:-mt-24 relative z-10 space-y-6">

                {/* STATUS ERRORS/SUCCESS */}
                {error && (
                  <div className="bg-red-500/15 border border-red-500/40 text-red-100 px-4 py-3 rounded-xl backdrop-blur-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 px-4 py-3 rounded-xl backdrop-blur-sm">
                    {success}
                  </div>
                )}

                {/* Event Details (Title & Committee) */}
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
                  <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wide text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full uppercase">
                    Event Details
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/70 tracking-tight mb-2">
                    {event.title}
                  </h1>
                  <p className="text-cyan-400/80 font-medium md:text-lg">
                    {event.committee_name || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Timeline */}
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-24 h-24 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-5">Timeline</h3>

                    <div className="space-y-4 relative z-10">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/40 text-xs mb-1">Start Date</p>
                          <p className="text-white font-medium text-lg">{formatEventDate(event.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-xs mb-1">Registration Deadline</p>
                          <p className="text-rose-300 font-medium text-lg">{formatEventDate(event.registration_deadline)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs mb-1">End Date</p>
                        <p className="text-white font-medium text-lg">{formatEventDate(event.end_date)}</p>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-white/40 text-xs mb-1">Event Timings</p>
                        <p className="text-white font-medium">
                          {formatEventTime(event.event_start_time)} - {formatEventTime(event.event_end_time)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info Block (Mode & Fee) */}
                  <div className="space-y-6">
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex flex-col justify-center h-full">
                      <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-5">Event Mode & Fee</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Mode</span>
                          <span className="px-3 py-1 bg-white/10 border border-white/20 capitalize rounded-lg text-white font-medium">
                            {event.mode || 'Offline'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <span className="text-white/60">Entry Fee</span>
                          <span className="text-2xl font-bold text-emerald-400">
                            {event.is_free ? 'Free' : `₹${event.entry_fee}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Description</h3>
                    <p className="text-white/80 leading-relaxed max-w-none text-base">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Download Brochure Link */}
                {event.problem_statement_url && (
                  <a
                    href={event.problem_statement_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-indigo-500/30 hover:border-indigo-400/50 rounded-2xl p-6 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-indigo-200 group-hover:text-indigo-100 transition-colors">
                          Download Event Brochure PDF
                        </h3>
                        <p className="text-indigo-200/50 text-sm mt-1">Problem statements and detailed info</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    </div>
                  </a>
                )}

                {/* Rules & Team requirements */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Rules & Guidelines</h3>

                  <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                    <p className="text-white/70 text-sm">
                      <strong className="text-white font-medium">Number of team members: </strong>
                      {event.min_team_size} to {event.max_team_size} members
                      {event.allow_individual ? ' (Individual participation allowed)' : ''}
                    </p>
                  </div>

                  {Array.isArray(event.rules) && event.rules.length > 0 ? (
                    <ul className="list-disc list-outside ml-5 space-y-2 text-white/70 text-sm">
                      {event.rules.map((rule, idx) => (
                        <li key={idx} className="pl-2">{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-white/50 text-sm italic">Standard competitive rules apply.</p>
                  )}
                </div>

                {/* Registration Form CTA Area */}
                <div className="mt-8">
                  {myTeam ? (
                    <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/30 p-8 text-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                      <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">You are registered!</h2>
                      <p className="text-cyan-200/70 mb-6">
                        Team: <span className="font-semibold text-cyan-100">{myTeam.teams?.team_name}</span>
                      </p>
                      <button
                        onClick={() => navigate('/student/dashboard')}
                        className="px-8 py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 font-medium hover:bg-cyan-500/30 transition-colors"
                      >
                        View Dashboard
                      </button>
                    </div>
                  ) : registrationClosed ? (
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
                      <h2 className="text-xl font-semibold text-amber-200/90 mb-2">Registration Closed</h2>
                      <p className="text-white/50 mb-0">We are no longer accepting registrations for this event.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 p-6 md:p-8">
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </span>
                        Register Now
                      </h2>

                      <form onSubmit={handleCreateTeam} className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-white/60 mb-2 ml-1">Team Name</label>
                          <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="What will you call your team?"
                            className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all"
                          />
                        </div>

                        {minTeammates > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between mb-2 ml-1">
                              <label className="block text-sm font-medium text-white/60">
                                Teammate Emails <span className="text-cyan-400/80 text-xs font-normal">({minTeammates} required)</span>
                              </label>
                            </div>

                            {teammateEmails.map((email, i) => (
                              <input
                                key={i}
                                type="email"
                                value={email}
                                onChange={(e) => updateTeammateEmail(i, e.target.value)}
                                placeholder={`Teammate ${i + 1} Email`}
                                className="w-full px-5 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all"
                              />
                            ))}

                            {teammateEmails.length < maxTeammates && (
                              <button
                                type="button"
                                onClick={addTeammateSlot}
                                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 px-2 py-1 flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add another teammate
                              </button>
                            )}
                          </div>
                        )}

                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={submitting || !teamName.trim()}
                            className="w-full relative group overflow-hidden px-6 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-emerald-600 transition-transform duration-300 group-hover:scale-[1.05]"></div>
                            <span className="relative z-10 block text-lg tracking-wide">
                              {submitting ? 'Registering...' : 'Complete Registration'}
                            </span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
