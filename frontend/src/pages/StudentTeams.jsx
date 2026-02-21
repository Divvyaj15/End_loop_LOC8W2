import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamsAPI } from '../services/api';

export default function StudentTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const res = await teamsAPI.getMyTeams();
        if (res.data.success && Array.isArray(res.data.data)) {
          setTeams(res.data.data);
        } else {
          setTeams([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load teams');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAccept = async (teamId) => {
    setActionLoading(teamId);
    try {
      await teamsAPI.acceptInvite(teamId);
      const res = await teamsAPI.getMyTeams();
      if (res.data.success && Array.isArray(res.data.data)) setTeams(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (teamId) => {
    setActionLoading(teamId);
    try {
      await teamsAPI.declineInvite(teamId);
      const res = await teamsAPI.getMyTeams();
      if (res.data.success && Array.isArray(res.data.data)) setTeams(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingInvites = teams.filter((t) => t.status === 'pending');
  const myTeams = teams.filter((t) => t.status !== 'pending');

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">Teams</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-white/20 bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl lg:text-3xl font-bold text-white">Teams</h2>

      {error && (
        <div className="rounded-lg border border-red-400/60 bg-red-500/15 text-red-100 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Pending invitations</h3>
          <div className="space-y-3">
            {pendingInvites.map((t) => (
              <div
                key={t.teams?.id}
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="text-white font-medium">{t.teams?.team_name}</p>
                  <p className="text-sm text-white/60">{t.teams?.events?.title}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(t.teams.id)}
                    disabled={actionLoading === t.teams.id}
                    className="px-4 py-2 rounded-lg bg-cyan-500/80 text-white font-medium hover:bg-cyan-500 disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(t.teams.id)}
                    disabled={actionLoading === t.teams.id}
                    className="px-4 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-white">My teams</h3>
        {myTeams.length === 0 ? (
          <div className="rounded-xl border border-white/20 bg-white/5 px-6 py-12 text-center">
            <p className="text-white/60">No teams yet. Register for an event to create or join a team.</p>
            <Link
              to="/student/dashboard/hackathons"
              className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
            >
              Browse Hackathons
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myTeams.map((t) => (
              <Link
                key={t.teams?.id}
                to={`/student/dashboard/events/${t.teams?.event_id}/create-team`}
                className="block rounded-xl border border-white/20 bg-white/5 px-6 py-4 hover:border-cyan-500/40 hover:bg-white/10 transition-all"
              >
                <p className="text-white font-medium">{t.teams?.team_name}</p>
                <p className="text-sm text-white/60">{t.teams?.events?.title}</p>
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-white/10 text-white/70 capitalize">
                  {t.teams?.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
