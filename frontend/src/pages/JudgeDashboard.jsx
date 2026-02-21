import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { judgeAPI } from '../services/api';

export default function JudgeDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [total, setTotal] = useState(0);
  const [scored, setScored] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchTeams();
    } else {
      setTeams([]);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await judgeAPI.getMyEvents();
      if (res.data.success) {
        setEvents(res.data.data || []);
        if (res.data.data?.length > 0 && !selectedEventId) {
          setSelectedEventId(res.data.data[0].id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!selectedEventId) return;
    setTeamsLoading(true);
    setError('');
    try {
      const res = await judgeAPI.getMyAssignedTeams(selectedEventId);
      if (res.data.success) {
        setTeams(res.data.data || []);
        setTotal(res.data.total ?? 0);
        setScored(res.data.scored ?? 0);
        setPending(res.data.pending ?? 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleScoreClick = (team) => {
    if (team.locked) {
      setError('Scoring has been locked for this team');
      return;
    }
    navigate(`/judge/events/${selectedEventId}/teams/${team.id}/score`);
  };


  const getTeamMembers = (team) => {
    if (!team.team_members || !Array.isArray(team.team_members)) return 'N/A';
    const members = team.team_members
      .filter((m) => m.status === 'accepted' || m.status === 'leader')
      .map((m) => {
        const u = m.users;
        return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : 'Unknown';
      });
    return members.join(', ') || 'N/A';
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      <aside className="w-20 lg:w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="h-20 flex items-center justify-center lg:justify-start px-6 border-b border-white/10">
          <span className="text-purple-400 font-semibold tracking-[0.25em] text-xs lg:text-sm">END_LOOP</span>
        </div>
        <nav className="flex-1 py-6 px-2 lg:px-4">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-xl border border-white/15 text-white/50 hover:bg-white/5 hover:text-white text-xs transition-colors"
          >
            Log out
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold">Judge Dashboard</h1>
            <p className="text-xs lg:text-sm text-white/60">Score your assigned teams</p>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8">
          {error && (
            <div className="mb-4 bg-red-500/15 border border-red-400/60 text-red-100 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          {success && (
            <div className="mb-4 bg-emerald-500/15 border border-emerald-400/60 text-emerald-100 text-sm px-4 py-3 rounded-xl">{success}</div>
          )}

          {events.length === 0 ? (
            <div className="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/60">No events assigned to you yet.</p>
              <p className="text-white/40 text-sm mt-2">Contact the admin to get team assignments.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <label className="block text-sm font-medium text-white/80 mb-2">Select Event</label>
                <select
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(e.target.value || null)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-purple-400 focus:outline-none"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEventId && (
                <>
                  <div className="flex gap-4 flex-wrap">
                    <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/50">
                      <span className="text-purple-200 text-sm">Total Teams</span>
                      <span className="block text-lg font-semibold text-white">{total}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50">
                      <span className="text-emerald-200 text-sm">Scored</span>
                      <span className="block text-lg font-semibold text-white">{scored}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50">
                      <span className="text-amber-200 text-sm">Pending</span>
                      <span className="block text-lg font-semibold text-white">{pending}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Assigned Teams</h2>
                    {teamsLoading ? (
                      <div className="text-white/50 py-8 text-center">Loading teams...</div>
                    ) : teams.length === 0 ? (
                      <div className="text-white/40 py-8 text-center">No teams assigned for this event.</div>
                    ) : (
                      <div className="space-y-2">
                        {teams.map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10 hover:border-purple-400/50 transition-colors"
                          >
                            <div>
                              <div className="font-semibold text-white">{team.team_name}</div>
                              <div className="text-xs text-white/60 mt-0.5">{getTeamMembers(team)}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              {team.score && (
                                <span className="text-sm text-cyan-300">
                                  Score: {team.score.total_score}
                                  {team.locked && (
                                    <span className="ml-2 text-amber-400 text-xs">(Locked)</span>
                                  )}
                                </span>
                              )}
                              <button
                                onClick={() => handleScoreClick(team)}
                                disabled={team.locked}
                                className="px-4 py-2 rounded-xl bg-purple-500/80 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {team.scored ? 'Re-score' : 'Score'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>

    </div>
  );
}
