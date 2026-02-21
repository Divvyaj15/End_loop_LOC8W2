import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamAPI } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CONFIG = {
  confirmed:    { label: 'Confirmed',    cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
  pending:      { label: 'Pending',      cls: 'bg-amber-500/20  text-amber-300  border-amber-400/40'  },
  disqualified: { label: 'Disqualified', cls: 'bg-red-500/20    text-red-300    border-red-400/40'    },
};

const ROLE_CONFIG = {
  leader:   { label: 'Leader',   cls: 'bg-cyan-500/20    text-cyan-200   border-cyan-400/40'   },
  accepted: { label: 'Member',   cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
  pending:  { label: 'Invited',  cls: 'bg-amber-500/20   text-amber-200  border-amber-400/40'  },
  declined: { label: 'Declined', cls: 'bg-red-500/20     text-red-200    border-red-400/40'    },
};

function Badge({ config }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}>
      {config.label}
    </span>
  );
}

export default function StudentTeams() {
  const navigate = useNavigate();
  const [myTeams, setMyTeams] = useState([]);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const res = await teamAPI.getMyTeams();
      if (res.data.success) setMyTeams(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadTeamDetails = async (teamId) => {
    if (teamDetails[teamId]) return;
    try {
      const res = await teamAPI.getTeamById(teamId);
      if (res.data.success) {
        setTeamDetails((prev) => ({ ...prev, [teamId]: res.data.data }));
      }
    } catch { /* ignore */ }
  };

  const handleExpand = (teamId) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
    } else {
      setExpandedTeam(teamId);
      loadTeamDetails(teamId);
    }
  };

  const handleAccept = async (teamId) => {
    setActionLoading(teamId + '-accept');
    try {
      await teamAPI.acceptInvite(teamId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (teamId) => {
    setActionLoading(teamId + '-decline');
    try {
      await teamAPI.declineInvite(teamId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingInvites = myTeams.filter((t) => t.status === 'pending');
  const activeTeams    = myTeams.filter((t) => t.status !== 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] flex">
        <StudentSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      <StudentSidebar pendingInvitesCount={pendingInvites.length} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">My Teams</h1>
            <p className="text-white/50 text-sm mt-0.5">All your teams across events</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/50 bg-red-500/15 text-red-100 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {/* Pending invitations */}
        {pendingInvites.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Pending Invitations ({pendingInvites.length})
            </h2>
            {pendingInvites.map((t) => (
              <div key={t.teams?.id}
                className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold text-lg">{t.teams?.team_name}</p>
                  <p className="text-sm text-white/60 mt-0.5">{t.teams?.events?.title || 'Event'}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {formatDate(t.teams?.events?.start_date)} – {formatDate(t.teams?.events?.end_date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(t.teams?.id)}
                    disabled={actionLoading === t.teams?.id + '-accept'}
                    className="px-4 py-2 rounded-xl bg-cyan-500/90 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === t.teams?.id + '-accept' ? 'Accepting…' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDecline(t.teams?.id)}
                    disabled={actionLoading === t.teams?.id + '-decline'}
                    className="px-4 py-2 rounded-xl border border-white/30 text-white/80 text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === t.teams?.id + '-decline' ? 'Declining…' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Active teams */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            {activeTeams.length === 0 && pendingInvites.length === 0 ? 'No teams yet' : `Teams (${activeTeams.length})`}
          </h2>

          {activeTeams.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-14 text-center">
              <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-white/50">You're not in any teams yet.</p>
              <p className="text-white/30 text-sm mt-1">Register for an event to create or join a team.</p>
            </div>
          ) : (
            activeTeams.map((t) => {
              const team     = t.teams;
              const teamId   = team?.id;
              const isOpen   = expandedTeam === teamId;
              const details  = teamDetails[teamId];
              const statusCfg = STATUS_CONFIG[team?.status] || STATUS_CONFIG.pending;
              const roleCfg   = ROLE_CONFIG[t.status] || ROLE_CONFIG.pending;

              return (
                <div key={teamId}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                  {/* Team header row */}
                  <button
                    type="button"
                    onClick={() => handleExpand(teamId)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-white/70">
                          {(team?.team_name || 'T').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-base truncate">{team?.team_name}</p>
                        <p className="text-sm text-white/60 truncate">{team?.events?.title || '—'}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {formatDate(team?.events?.start_date)} – {formatDate(team?.events?.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <Badge config={statusCfg} />
                      <Badge config={roleCfg} />
                      <svg
                        className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
                      {/* Event info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Event',      value: team?.events?.title || '—' },
                          { label: 'Committee',  value: team?.events?.committee_name || '—' },
                          { label: 'Team status', value: statusCfg.label },
                          { label: 'Your role',  value: roleCfg.label },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-black/30 border border-white/10 px-3 py-2.5">
                            <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">{item.label}</p>
                            <p className="text-sm text-white/90 font-medium">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Members table */}
                      {details ? (
                        <div>
                          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Members</p>
                          <div className="rounded-xl border border-white/10 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white/5 text-xs text-white/50">
                                  <th className="px-4 py-2.5 text-left font-normal">Name</th>
                                  <th className="px-4 py-2.5 text-left font-normal">Email</th>
                                  <th className="px-4 py-2.5 text-left font-normal">Role</th>
                                  <th className="px-4 py-2.5 text-left font-normal">Joined</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {(details.team_members || []).map((m, i) => {
                                  const name = m.users
                                    ? `${m.users.first_name || ''} ${m.users.last_name || ''}`.trim() || m.users.email
                                    : '—';
                                  const roleCfgM = ROLE_CONFIG[m.status] || ROLE_CONFIG.pending;
                                  return (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="px-4 py-3 text-white/90">{name}</td>
                                      <td className="px-4 py-3 text-white/50 text-xs">{m.users?.email || '—'}</td>
                                      <td className="px-4 py-3">
                                        <Badge config={roleCfgM} />
                                      </td>
                                      <td className="px-4 py-3 text-white/40 text-xs">
                                        {m.joined_at ? formatDate(m.joined_at) : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-white/40 text-sm">
                          <div className="w-4 h-4 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                          Loading members…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
      </main>
    </div>
  );
}
