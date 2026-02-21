import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { teamsAPI, eventAPI, submissionsAPI } from '../services/api';
import { IconPlus } from '../components/SidebarIcons';

const MEMBER_LABELS = { leader: 'Leader', pending: 'pending', accepted: 'accepted', declined: 'declined' };

export default function CreateTeam() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [memberEmails, setMemberEmails] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [problemStatement, setProblemStatement] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [psLoading, setPsLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const user = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const [eventRes, teamsRes] = await Promise.all([
          eventAPI.getEventById(eventId),
          teamsAPI.getMyTeams(),
        ]);

        if (eventRes.data.success) setEvent(eventRes.data.data);
        else setEvent(null);

        const teams = teamsRes.data.success && Array.isArray(teamsRes.data.data) ? teamsRes.data.data : [];
        const myTeam = teams.find((t) => t.teams?.event_id === eventId);
        if (myTeam?.teams?.id) {
          const teamRes = await teamsAPI.getTeamById(myTeam.teams.id);
          if (teamRes.data.success) setTeam(teamRes.data.data);
        } else {
          setTeam(null);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  useEffect(() => {
    if (!team?.id) return;
    const fetchPs = async () => {
      setPsLoading(true);
      try {
        const res = await submissionsAPI.getProblemStatement(eventId);
        if (res.data.success && res.data.data?.problem_statement_url) {
          setProblemStatement(res.data.data);
        } else {
          setProblemStatement(null);
        }
      } catch {
        setProblemStatement(null);
      } finally {
        setPsLoading(false);
      }
    };
    const fetchSub = async () => {
      setSubLoading(true);
      try {
        const res = await submissionsAPI.getTeamSubmission(team.id);
        if (res.data.success && res.data.data) {
          setSubmission(res.data.data);
        } else {
          setSubmission(null);
        }
      } catch {
        setSubmission(null);
      } finally {
        setSubLoading(false);
      }
    };
    fetchPs();
    fetchSub();
  }, [team?.id, eventId]);

  const addMember = () => {
    setMemberEmails((prev) => [...prev, '']);
  };

  const removeMember = (i) => {
    setMemberEmails((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateEmail = (i, value) => {
    setMemberEmails((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const emails = memberEmails.filter((e) => e.trim());
    if (!teamName.trim()) {
      setError('Enter team name');
      return;
    }
    if (event && !event.allow_individual && emails.length + 1 < event.min_team_size) {
      setError(`Minimum team size is ${event.min_team_size}`);
      return;
    }
    if (event && emails.length + 1 > event.max_team_size) {
      setError(`Maximum team size is ${event.max_team_size}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await teamsAPI.createTeam({
        eventId,
        teamName: teamName.trim(),
        memberEmails: emails.map((e) => e.trim()),
      });
      if (res.data.success) {
        setSuccess(res.data.message || 'Team created!');
        const teamRes = await teamsAPI.getTeamById(res.data.data.teamId);
        if (teamRes.data.success) setTeam(teamRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPPT = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !team?.id) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      if (typeof base64 !== 'string') return;
      try {
        await submissionsAPI.submitPPT({
          eventId,
          teamId: team.id,
          pptBase64: base64,
        });
        const res = await submissionsAPI.getTeamSubmission(team.id);
        if (res.data.success) setSubmission(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload');
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
        <div className="h-64 rounded-xl border border-white/20 bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-xl border border-red-400/60 bg-red-500/15 text-red-100 px-4 py-6">
        Event not found.
      </div>
    );
  }

  const members = team?.team_members || [];
  const isLeader = team?.leader_id === user?.id;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">
          {event.title} – Create Team
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/60 bg-red-500/15 text-red-100 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-400/60 bg-emerald-500/15 text-emerald-100 text-sm px-4 py-3">
          {success}
        </div>
      )}

      {/* Create New Team form - shown when no team yet */}
      {!team && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Create New Team</h3>
          <p className="text-sm text-white/60">Invite members by email. Invitations are sent by email and matched to registered students; you’ll see their status (Leader, pending, accepted) below once the team is created.</p>
          <form onSubmit={handleCreateTeam} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm text-white/70 mb-2">Team Name *</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Member Emails (invite by email)</label>
              {memberEmails.map((email, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    placeholder="teammate@example.com"
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    disabled={memberEmails.length <= 1}
                    className="px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMember}
                className="mt-2 inline-flex items-center bg-white/15 border border-white/30 hover:bg-white/20 transition-all rounded-lg overflow-hidden text-white"
              >
                <span className="w-11 h-11 flex items-center justify-center border-r border-white/30 flex-shrink-0">
                  <IconPlus className="w-5 h-5" />
                </span>
                <span className="px-4 py-2.5 font-medium">Add Member</span>
              </button>
            </div>
            {event && (
              <p className="text-sm text-white/50">
                Team size: {event.min_team_size}–{event.max_team_size} members
                {event.allow_individual && ' (individual allowed)'}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center bg-white/15 border border-white/30 hover:bg-white/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all rounded-lg overflow-hidden text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <span className="w-12 h-12 flex items-center justify-center border-r border-white/30 flex-shrink-0">
                <IconPlus className="w-6 h-6" />
              </span>
              <span className="px-5 py-3 font-medium">Create New Team</span>
            </button>
          </form>
        </section>
      )}

      {/* My Team - shown when team exists */}
      {team && (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xl font-semibold text-white">My Team</h3>
              <span
                className={`text-xs font-medium px-3 py-1.5 rounded-lg capitalize ${
                  team.status === 'confirmed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                }`}
              >
                {team.status === 'confirmed' ? 'Confirmed' : 'Pending invites'}
              </span>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/5 p-6">
              <h4 className="text-sm font-medium text-white/70 mb-3">Members</h4>
              <div className="space-y-2">
                {members.map((m, i) => {
                  const name = m.users
                    ? [m.users.first_name, m.users.last_name].filter(Boolean).join(' ') || m.users.email
                    : '—';
                  const status = MEMBER_LABELS[m.status] || m.status;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-3"
                    >
                      <span className="text-white font-medium">{name}</span>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded capitalize ${
                          m.status === 'leader'
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                            : m.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                            : m.status === 'declined'
                            ? 'bg-red-500/20 text-red-200 border border-red-400/40'
                            : 'bg-white/20 text-white/70 border border-white/30'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

         
        </>
      )}
    </div>
  );
}
