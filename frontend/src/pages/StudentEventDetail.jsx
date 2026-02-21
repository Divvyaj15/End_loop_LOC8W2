import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamAPI } from '../services/api';

function formatEventDate(start, end) {
  if (!start || !end) return 'Date TBA';
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric', year: '2-digit' };
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
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
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white">
      <header className="h-16 px-4 lg:px-8 flex items-center justify-between border-b border-white/10 bg-black/30">
        <button
          type="button"
          onClick={() => navigate('/student/dashboard')}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <span className="text-cyan-400 font-semibold text-sm">END_LOOP</span>
      </header>

      <main className="max-w-3xl mx-auto p-4 lg:p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : !event ? (
          <div className="rounded-xl bg-red-500/15 border border-red-400/40 text-red-100 px-4 py-6 text-center">
            {error || 'Event not found.'}
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 mb-8">
              {event.banner_url && (
                <div className="aspect-[3/1] bg-black/40">
                  <img src={event.banner_url} alt="" className="w-full h-full object-cover opacity-90" />
                </div>
              )}
              <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-2">{event.title}</h1>
                <p className="text-white/60 text-sm mb-2">
                  {formatEventDate(event.start_date, event.end_date)}
                  {event.committee_name && ` · ${event.committee_name}`}
                </p>
                {event.description && (
                  <p className="text-white/80 text-sm leading-relaxed">{event.description}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/15 border border-red-400/60 text-red-100 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-emerald-500/15 border border-emerald-400/60 text-emerald-100 text-sm px-4 py-3 rounded-xl">
                {success}
              </div>
            )}

            {myTeam ? (
              <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/30 p-6">
                <h2 className="text-lg font-semibold text-cyan-200 mb-2">You&apos;re registered</h2>
                <p className="text-white/80 text-sm">
                  Team: <span className="font-medium text-white">{myTeam.teams?.team_name}</span>
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/student/dashboard')}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : registrationClosed ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-6">
                <h2 className="text-lg font-semibold text-amber-200 mb-2">Registration closed</h2>
                <p className="text-white/70 text-sm mb-4">
                  Registration for this event has ended. You can still view the event details above.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/student/dashboard')}
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/15"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Register for this event</h2>
                <p className="text-white/60 text-sm mb-4">
                  Team size: {event.min_team_size}–{event.max_team_size} members
                  {minTeammates > 0 && ` (add ${minTeammates}–${maxTeammates} teammate email${maxTeammates !== 1 ? 's' : ''} below)`}
                </p>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">Team name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. CodeCrafters"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 focus:border-cyan-400/60 focus:outline-none"
                    />
                  </div>
                  {minTeammates > 0 && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-white/80">
                        Teammate emails {minTeammates > 0 && <span className="text-amber-300/90">(required)</span>}
                      </label>
                      {teammateEmails.map((email, i) => (
                        <input
                          key={i}
                          type="email"
                          value={email}
                          onChange={(e) => updateTeammateEmail(i, e.target.value)}
                          placeholder={`Teammate ${i + 1} email`}
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 focus:border-cyan-400/60 focus:outline-none"
                        />
                      ))}
                      {teammateEmails.length < maxTeammates && (
                        <button
                          type="button"
                          onClick={addTeammateSlot}
                          className="text-sm text-cyan-400 hover:text-cyan-300"
                        >
                          + Add teammate
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !teamName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-white font-semibold shadow-[0_4px_20px_rgba(34,211,238,0.3)] hover:from-cyan-300 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating…' : 'Create team & Register'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
