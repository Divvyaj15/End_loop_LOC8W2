import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamsAPI, submissionsAPI } from '../services/api';

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

export default function FinalSubmission() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [team, setTeam] = useState(null);
  const [finalSubmission, setFinalSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({ ppt: false, github: false, video: false });

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
        const [eventRes, teamsRes] = await Promise.all([
          eventAPI.getEventById(eventId),
          teamsAPI.getMyTeams(),
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
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load final submission page');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  useEffect(() => {
    if (!team?.id) return;
    const loadFinalSubmission = async () => {
      try {
        const res = await submissionsAPI.getFinalSubmission(team.id);
        if (res.data.success && res.data.data) {
          setFinalSubmission(res.data.data);
        } else {
          setFinalSubmission(null);
        }
      } catch {
        setFinalSubmission(null);
      }
    };
    loadFinalSubmission();
  }, [team?.id]);

  const handleUploadPPT = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !team?.id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      if (typeof base64 !== 'string') return;
      try {
        setUploading(prev => ({ ...prev, ppt: true }));
        await submissionsAPI.submitFinalPPT({
          eventId,
          teamId: team.id,
          pptBase64: base64,
        });
        const res = await submissionsAPI.getFinalSubmission(team.id);
        if (res.data.success) setFinalSubmission(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload final PPT');
      } finally {
        setUploading(prev => ({ ...prev, ppt: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadGitHub = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !team?.id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      if (typeof base64 !== 'string') return;
      try {
        setUploading(prev => ({ ...prev, github: true }));
        await submissionsAPI.submitFinalGitHub({
          eventId,
          teamId: team.id,
          githubBase64: base64,
        });
        const res = await submissionsAPI.getFinalSubmission(team.id);
        if (res.data.success) setFinalSubmission(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload GitHub file');
      } finally {
        setUploading(prev => ({ ...prev, github: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !team?.id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      if (typeof base64 !== 'string') return;
      try {
        setUploading(prev => ({ ...prev, video: true }));
        await submissionsAPI.submitFinalVideo({
          eventId,
          teamId: team.id,
          videoBase64: base64,
        });
        const res = await submissionsAPI.getFinalSubmission(team.id);
        if (res.data.success) setFinalSubmission(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload demo video');
      } finally {
        setUploading(prev => ({ ...prev, video: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const deadline = event?.final_submission_deadline || null;
  const countdown = useCountdown(deadline);
  const isLeader = team && user && team.leader_id === user.id;
  const members = team?.team_members || [];

  if (loading) {
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
            🎉 Congratulations! Your team <span className="text-cyan-300 font-semibold">{team.team_name}</span> has been shortlisted for <span className="text-cyan-300 font-semibold">{event.title}</span>
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Final Submissions • {event.committee_name || 'Hackathon'}
          </h2>
        </div>
        <div className="rounded-2xl border border-purple-400/40 bg-purple-500/10 px-6 py-4 flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-200/80">Final submission ends in</p>
          {deadline && !countdown.finished && countdown.parts ? (
            <div className="flex gap-3">
              {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                <div
                  key={unit}
                  className="w-14 h-16 rounded-xl bg-black/40 border border-purple-400/40 flex flex-col items-center justify-center"
                >
                  <span className="text-xl font-semibold text-white">
                    {String(countdown.parts[unit]).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-purple-300/80">
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
        {/* Left column: final submissions + team details */}
        <div className="space-y-6">
          {/* Event + final submission card */}
          <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-[0.2em] mb-1">Final submissions</p>
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

            {/* Final submission panels */}
            <div className="space-y-4">
              {/* Final PPT Upload */}
              <div className="rounded-xl border border-purple-400/40 bg-gradient-to-br from-[#020617] via-[#020617] to-[#1e1b4b] p-5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute -top-16 -left-10 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl" />
                  <div className="absolute -bottom-24 right-0 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl" />
                </div>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-purple-200/80 mb-1">
                        Final presentation
                      </p>
                      <p className="text-sm text-white/80">
                        Upload your final <span className="font-semibold">.pptx</span> presentation
                      </p>
                    </div>
                    <div className="text-right text-xs text-white/60">
                      <p>Status:</p>
                      <p className="font-semibold text-white/90">
                        {finalSubmission?.final_ppt_url ? 'Submitted' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-black/40 border border-white/20 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/80">
                        Drag &amp; drop your final presentation file here<br />
                        <span className="text-xs text-white/50">or click Upload to choose a file.</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isLeader ? (
                        <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-purple-500/90 hover:bg-purple-400 text-white text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all">
                          {uploading.ppt ? 'Uploading…' : finalSubmission?.final_ppt_url ? 'Re-upload PPT' : 'Submit Final PPT'}
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
                          the final presentation.
                        </p>
                      )}
                      {finalSubmission?.final_ppt_submitted_at && (
                        <p className="text-[11px] text-emerald-300/90">
                          Last uploaded: {formatDateTime(finalSubmission.final_ppt_submitted_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {finalSubmission?.final_ppt_url && (
                    <div className="mt-2">
                      <a
                        href={finalSubmission.final_ppt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-purple-300 hover:text-purple-200 underline underline-offset-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Submitted Final PPT
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* GitHub Upload */}
              <div className="rounded-xl border border-cyan-400/40 bg-gradient-to-br from-[#020617] via-[#020617] to-[#022c42] p-5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute -top-16 -left-10 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl" />
                  <div className="absolute -bottom-24 right-0 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl" />
                </div>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80 mb-1">
                        Source code
                      </p>
                      <p className="text-sm text-white/80">
                        Upload your <span className="font-semibold">GitHub repository link</span> file
                      </p>
                    </div>
                    <div className="text-right text-xs text-white/60">
                      <p>Status:</p>
                      <p className="font-semibold text-white/90">
                        {finalSubmission?.github_url ? 'Submitted' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-black/40 border border-white/20 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/80">
                        Upload a text file with your GitHub repository link<br />
                        <span className="text-xs text-white/50">or paste the link directly.</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isLeader ? (
                        <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-white text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">
                          {uploading.github ? 'Uploading…' : finalSubmission?.github_url ? 'Re-upload GitHub' : 'Submit GitHub Link'}
                          <input
                            type="file"
                            accept=".txt,.md"
                            onChange={handleUploadGitHub}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <p className="text-[11px] text-white/60 max-w-[180px] text-right">
                          Only the <span className="font-semibold text-white/80">team leader</span> can upload
                          the GitHub link.
                        </p>
                      )}
                      {finalSubmission?.github_submitted_at && (
                        <p className="text-[11px] text-emerald-300/90">
                          Last uploaded: {formatDateTime(finalSubmission.github_submitted_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {finalSubmission?.github_url && (
                    <div className="mt-2">
                      <a
                        href={finalSubmission.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        View GitHub Repository
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo Video Upload */}
              <div className="rounded-xl border border-pink-400/40 bg-gradient-to-br from-[#020617] via-[#020617] to-[#831843] p-5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute -top-16 -left-10 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />
                  <div className="absolute -bottom-24 right-0 w-48 h-48 rounded-full bg-rose-500/20 blur-3xl" />
                </div>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-pink-200/80 mb-1">
                        Demo video
                      </p>
                      <p className="text-sm text-white/80">
                        Upload your <span className="font-semibold">demo video</span> file
                      </p>
                    </div>
                    <div className="text-right text-xs text-white/60">
                      <p>Status:</p>
                      <p className="font-semibold text-white/90">
                        {finalSubmission?.demo_video_url ? 'Submitted' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-black/40 border border-white/20 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/80">
                        Upload your demo video (MP4, AVI, MOV)<br />
                        <span className="text-xs text-white/50">Max file size: 100MB</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isLeader ? (
                        <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-pink-500/90 hover:bg-pink-400 text-white text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all">
                          {uploading.video ? 'Uploading…' : finalSubmission?.demo_video_url ? 'Re-upload Video' : 'Submit Demo Video'}
                          <input
                            type="file"
                            accept=".mp4,.avi,.mov,.wmv,.flv"
                            onChange={handleUploadVideo}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <p className="text-[11px] text-white/60 max-w-[180px] text-right">
                          Only the <span className="font-semibold text-white/80">team leader</span> can upload
                          the demo video.
                        </p>
                      )}
                      {finalSubmission?.demo_video_submitted_at && (
                        <p className="text-[11px] text-emerald-300/90">
                          Last uploaded: {formatDateTime(finalSubmission.demo_video_submitted_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {finalSubmission?.demo_video_url && (
                    <div className="mt-2">
                      <a
                        href={finalSubmission.demo_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-pink-300 hover:text-pink-200 underline underline-offset-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        View Demo Video
                      </a>
                    </div>
                  )}
                </div>
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
                                ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40'
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

        {/* Right column: submission status summary */}
        <div className="space-y-6">
          {/* Final submission status */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-1">Final Submission Status</h3>
            <p className="text-sm text-white/70">
              Team: <span className="font-semibold text-white/90">{team.team_name}</span>
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Final PPT</span>
                <span className={`text-sm font-semibold ${finalSubmission?.final_ppt_url ? 'text-emerald-300' : 'text-white/50'}`}>
                  {finalSubmission?.final_ppt_url ? 'Submitted' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">GitHub Link</span>
                <span className={`text-sm font-semibold ${finalSubmission?.github_url ? 'text-emerald-300' : 'text-white/50'}`}>
                  {finalSubmission?.github_url ? 'Submitted' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Demo Video</span>
                <span className={`text-sm font-semibold ${finalSubmission?.demo_video_url ? 'text-emerald-300' : 'text-white/50'}`}>
                  {finalSubmission?.demo_video_url ? 'Submitted' : 'Pending'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-xs text-white/60 mb-2">Overall Progress</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((step) => {
                    const isCompleted = 
                      (step === 1 && finalSubmission?.final_ppt_url) ||
                      (step === 2 && finalSubmission?.github_url) ||
                      (step === 3 && finalSubmission?.demo_video_url);
                    return (
                      <div
                        key={step}
                        className={`w-8 h-2 rounded-full ${
                          isCompleted ? 'bg-emerald-400' : 'bg-white/20'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-white/50 mt-2">
                  {[
                    finalSubmission?.final_ppt_url,
                    finalSubmission?.github_url,
                    finalSubmission?.demo_video_url
                  ].filter(Boolean).length}/3 submissions completed
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <p>Upload your final presentation with all project details and implementation.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <p>Provide a link to your GitHub repository with complete source code.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-pink-400 mt-1">•</span>
                <p>Submit a demo video showcasing your project's features and functionality.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <p>Only the team leader can upload final submissions.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <p>Make sure all submissions are completed before the deadline.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
