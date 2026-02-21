import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamsAPI, submissionsAPI, announcementsAPI, shortlistAPI } from '../services/api';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function useCountdown(deadline) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return useMemo(() => {
    if (!deadline) return { finished: true, parts: null, totalMs: 0 };
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) {
      return { finished: true, parts: null, totalMs: diff };
    }
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      finished: false,
      totalMs: diff,
      parts: { days, hours, minutes, seconds },
    };
  }, [deadline, now]);
}

export default function LiveEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [team, setTeam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [checkingShortlist, setCheckingShortlist] = useState(true);

  const user = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const [eventRes, teamsRes, announcementsRes] = await Promise.all([
          eventAPI.getEventById(eventId),
          teamsAPI.getMyTeams(),
          announcementsAPI.getByEvent(eventId),
        ]);

        if (eventRes.data.success) {
          setEvent(eventRes.data.data);
        }

        const teams = teamsRes.data.success && Array.isArray(teamsRes.data.data) ? teamsRes.data.data : [];
        const myTeamRow = teams.find((t) => t.teams?.event_id === eventId);
        if (myTeamRow?.teams?.id) {
          const teamRes = await teamsAPI.getTeamById(myTeamRow.teams.id);
          if (teamRes.data.success) {
            setTeam(teamRes.data.data);
          }
        }

        if (announcementsRes.data.success && Array.isArray(announcementsRes.data.data)) {
          setAnnouncements(announcementsRes.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load live event');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  useEffect(() => {
    if (!team?.id) return;
    
    // Check if team is shortlisted
    const checkShortlist = async () => {
      try {
        const res = await shortlistAPI.checkTeamShortlisted(eventId, team.id);
        if (res.data.success && res.data.data.shortlisted) {
          // Team is shortlisted, redirect to final submission page
          navigate(`/student/dashboard/events/${eventId}/final-submission`, { replace: true });
          return;
        }
      } catch (err) {
        console.error('Failed to check shortlist status:', err);
      } finally {
        setCheckingShortlist(false);
      }
    };

    checkShortlist();

    const loadSubmission = async () => {
      try {
        const res = await submissionsAPI.getTeamSubmission(team.id);
        if (res.data.success && res.data.data) {
          setSubmission(res.data.data);
        } else {
          setSubmission(null);
        }
      } catch {
        setSubmission(null);
      }
    };
    loadSubmission();
  }, [eventId, team?.id, navigate]);

  const handleUploadPPT = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !team?.id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      if (typeof base64 !== 'string') return;
      try {
        setUploading(true);
        await submissionsAPI.submitPPT({
          eventId,
          teamId: team.id,
          pptBase64: base64,
        });
        const res = await submissionsAPI.getTeamSubmission(team.id);
        if (res.data.success) setSubmission(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload PPT');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const deadline = event?.ppt_submission_deadline || null;
  const countdown = useCountdown(deadline);
  const isLeader = team && user && team.leader_id === user.id;
  const members = team?.team_members || [];

  if (loading || checkingShortlist) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-white/10 animate-pulse" />
        <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
          <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!event || !team) {
    return (
      <div className="rounded-xl border border-red-400/60 bg-red-500/15 text-red-100 px-4 py-6">
        {error || 'No active team found for this event.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header + countdown */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-sm text-white/60">
            Let&apos;s get ready for <span className="text-cyan-300 font-semibold">{event.title}</span>...
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Live Event • {event.committee_name || 'Hackathon'}
          </h2>
        </div>
        <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-6 py-4 flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Submission ends in</p>
          {deadline && !countdown.finished && countdown.parts ? (
            <div className="flex gap-3">
              {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                <div
                  key={unit}
                  className="w-14 h-16 rounded-xl bg-black/40 border border-cyan-400/40 flex flex-col items-center justify-center"
                >
                  <span className="text-xl font-semibold text-white">
                    {String(countdown.parts[unit]).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-cyan-300/80">
                    {unit.slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          ) : deadline ? (
            <p className="text-sm text-red-300 font-medium">Submission window closed</p>
          ) : (
            <p className="text-sm text-white/70">Submission deadline not configured</p>
          )}
          {deadline && (
            <p className="text-[11px] text-white/60 mt-1">
              Deadline: <span className="text-white/80">{formatDateTime(deadline)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[2.1fr,1.1fr]">
        {/* Left column: submission + team details */}
        <div className="space-y-6">
          {/* Event + team submission card */}
          <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-[0.2em] mb-1">Current event</p>
                <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                <p className="text-xs text-white/50 mt-1">
                  {formatDate(event.start_date)} – {formatDate(event.end_date)}
                </p>
              </div>
              <div className="text-xs text-white/70">
                <p>
                  Mode: <span className="text-white/90 capitalize">{event.mode}</span>
                </p>
                {event.venue && (
                  <p>
                    Venue: <span className="text-white/90">{event.venue}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Submission panel */}
            <div className="mt-4 rounded-xl border border-cyan-400/40 bg-gradient-to-br from-[#020617] via-[#020617] to-[#022c42] p-5 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute -top-16 -left-10 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute -bottom-24 right-0 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl" />
              </div>

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80 mb-1">
                      Team submission
                    </p>
                    <p className="text-sm text-white/80">
                      Team <span className="font-semibold">{team.team_name}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/60">
                    <p>Status:</p>
                    <p className="font-semibold text-white/90">
                      {submission?.ppt_url ? 'Submitted' : 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-black/40 border border-white/20 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/80">
                      Drag &amp; drop your <span className="font-semibold">.pptx</span> file here<br />
                      <span className="text-xs text-white/50">or click Upload to choose a file.</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isLeader ? (
                      <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-white text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">
                        {uploading ? 'Uploading…' : submission?.ppt_url ? 'Re-upload PPT' : 'Submit PPT'}
                        <input
                          type="file"
                          accept=".ppt,.pptx,.pdf"
                          onChange={handleUploadPPT}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <p className="text-[11px] text-white/60 max-w-[180px] text-right">
                        Only the <span className="font-semibold text-white/80">team leader</span> can upload
                        the PPT.
                      </p>
                    )}
                    {submission?.submitted_at && (
                      <p className="text-[11px] text-emerald-300/90">
                        Last uploaded: {formatDateTime(submission.submitted_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline card */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-2">Event Timeline</h3>
            <div className="relative pl-4">
              <div className="absolute left-1 top-1 bottom-1 w-px bg-gradient-to-b from-cyan-400/80 via-cyan-400/20 to-transparent" />
              <div className="space-y-4">
                <div className="relative pl-4">
                  <div className="absolute -left-2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                  <p className="text-xs text-white/60">Registration opens</p>
                  <p className="text-sm text-white/90">{formatDate(event.created_at)}</p>
                </div>
                <div className="relative pl-4">
                  <div className="absolute -left-2 w-3 h-3 rounded-full bg-cyan-300" />
                  <p className="text-xs text-white/60">Registration deadline</p>
                  <p className="text-sm text-white/90">{formatDate(event.registration_deadline)}</p>
                </div>
                <div className="relative pl-4">
                  <div className="absolute -left-2 w-3 h-3 rounded-full bg-sky-400" />
                  <p className="text-xs text-white/60">Hackathon dates</p>
                  <p className="text-sm text-white/90">
                    {formatDate(event.start_date)} – {formatDate(event.end_date)}
                  </p>
                </div>
                {event.ppt_submission_deadline && (
                  <div className="relative pl-4">
                    <div className="absolute -left-2 w-3 h-3 rounded-full bg-indigo-400" />
                    <p className="text-xs text-white/60">PPT submission deadline</p>
                    <p className="text-sm text-white/90">
                      {formatDateTime(event.ppt_submission_deadline)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Team details table */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Team Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-xs text-white/60">
                    <th className="px-3 py-2 font-normal">Member</th>
                    <th className="px-3 py-2 font-normal">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => {
                    const name = m.users
                      ? [m.users.first_name, m.users.last_name].filter(Boolean).join(' ') ||
                        m.users.email
                      : '—';
                    const role =
                      m.status === 'leader'
                        ? 'Leader'
                        : m.status === 'accepted'
                        ? 'Member'
                        : m.status;
                    return (
                      <tr key={idx} className="bg-black/20 hover:bg-black/30 transition-colors">
                        <td className="px-3 py-2 text-white/90">{name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${
                              m.status === 'leader'
                                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                                : m.status === 'accepted'
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                                : 'bg-white/10 text-white/70 border border-white/20'
                            }`}
                          >
                            {role}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: announcements + submission status summary */}
        <div className="space-y-6">
          {/* Announcements */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Announcements</h3>
            {announcements.length === 0 ? (
              <p className="text-sm text-white/60">No announcements yet.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 hover:border-cyan-400/40 hover:shadow-[0_0_18px_rgba(34,211,238,0.25)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-white/90 truncate">{a.title}</p>
                      <span className="text-[10px] text-white/50 whitespace-nowrap">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 whitespace-pre-wrap line-clamp-3">
                      {a.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission status small card */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-2">
            <h3 className="text-lg font-semibold text-white mb-1">Submission Status</h3>
            <p className="text-sm text-white/70">
              Team: <span className="font-semibold text-white/90">{team.team_name}</span>
            </p>
            <p className="text-sm text-white/70">
              Status:{' '}
              <span className="font-semibold text-white/90">
                {submission?.ppt_url ? 'Submitted' : 'Pending'}
              </span>
            </p>
            {submission?.ppt_url && (
              <a
                href={submission.ppt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
              >
                View submitted PPT
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

