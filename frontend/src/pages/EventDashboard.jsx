import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamsAPI, submissionsAPI, announcementsAPI } from '../services/api';

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

function TimelineItem({ title, date, isActive, isCompleted }) {
  return (
    <div className="relative pl-6">
      <div className={`absolute -left-2 w-4 h-4 rounded-full border-2 ${
        isCompleted 
          ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]' 
          : isActive 
            ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]'
            : 'bg-white/20 border-white/40'
      }`} />
      <div className={`absolute left-0 top-2 w-px h-full ${
        isCompleted ? 'bg-emerald-400/30' : 'bg-white/10'
      }`} />
      <div className="pb-6">
        <p className={`text-sm font-medium ${
          isCompleted ? 'text-emerald-300' : isActive ? 'text-cyan-300' : 'text-white/60'
        }`}>
          {title}
        </p>
        <p className="text-xs text-white/50 mt-1">{date}</p>
      </div>
    </div>
  );
}

export default function EventDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [team, setTeam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

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
          setAnnouncements(announcementsRes.data.data.slice(0, 5)); // Show latest 5
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  useEffect(() => {
    if (!team?.id) return;
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
  }, [team?.id]);

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

  // Timeline items
  const timelineItems = useMemo(() => {
    if (!event) return [];
    
    const now = new Date();
    const items = [
      {
        title: 'Registration Opens',
        date: formatDate(event.created_at),
        timestamp: new Date(event.created_at),
        isCompleted: new Date(event.created_at) <= now,
      },
      {
        title: 'Registration Deadline',
        date: formatDate(event.registration_deadline),
        timestamp: new Date(event.registration_deadline),
        isCompleted: new Date(event.registration_deadline) <= now,
      },
      {
        title: 'Hackathon Starts',
        date: formatDate(event.start_date),
        timestamp: new Date(event.start_date),
        isCompleted: new Date(event.start_date) <= now,
      },
      {
        title: 'Hackathon Ends',
        date: formatDate(event.end_date),
        timestamp: new Date(event.end_date),
        isCompleted: new Date(event.end_date) <= now,
      },
    ];

    if (event.ppt_submission_deadline) {
      items.push({
        title: 'PPT Submission Deadline',
        date: formatDateTime(event.ppt_submission_deadline),
        timestamp: new Date(event.ppt_submission_deadline),
        isCompleted: new Date(event.ppt_submission_deadline) <= now,
      });
    }

    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [event]);

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

  if (!event) {
    return (
      <div className="rounded-xl border border-red-400/60 bg-red-500/15 text-red-100 px-4 py-6">
        {error || 'Event not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header with event info and countdown */}
      <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate('/student/dashboard/events')}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                ← Back to Events
              </button>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                {event.mode === 'offline' ? 'Offline' : event.mode === 'online' ? 'Online' : 'Hybrid'}
              </span>
              {event.venue && event.mode === 'offline' && (
                <span>📍 {event.venue}</span>
              )}
              <span>{formatDate(event.start_date)} – {formatDate(event.end_date)}</span>
            </div>
          </div>
          
          {/* Countdown Timer */}
          {deadline && (
            <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 px-6 py-4 flex flex-col items-center gap-3 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80 font-medium">
                {countdown.finished ? 'Submission Closed' : 'Time Left'}
              </p>
              {!countdown.finished && countdown.parts ? (
                <div className="flex gap-2">
                  {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                    <div
                      key={unit}
                      className="w-12 h-14 rounded-lg bg-black/60 border border-cyan-400/40 flex flex-col items-center justify-center"
                    >
                      <span className="text-lg font-bold text-white">
                        {String(countdown.parts[unit]).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-cyan-300/80">
                        {unit.slice(0, 1)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-300 font-medium">Deadline passed</p>
              )}
              <p className="text-[10px] text-white/60">
                {formatDateTime(deadline)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Event Details Card */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Event Details
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Committee</p>
                  <p className="text-white/90">{event.committee_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Team Size</p>
                  <p className="text-white/90">
                    {event.min_team_size === event.max_team_size 
                      ? `${event.max_team_size} members` 
                      : `${event.min_team_size}-${event.max_team_size} members`}
                  </p>
                </div>
              </div>
              {event.description && (
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-white/80 text-sm leading-relaxed">{event.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Team Details */}
          {team && (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Team Details
              </h2>
              <div className="mb-4">
                <p className="text-sm text-white/70">Team Name</p>
                <p className="text-lg font-semibold text-white">{team.team_name}</p>
              </div>
              <div className="space-y-2">
                {members.map((m, idx) => {
                  const name = m.users
                    ? [m.users.first_name, m.users.last_name].filter(Boolean).join(' ') || m.users.email
                    : '—';
                  const role = m.status === 'leader' ? 'Leader' : m.status === 'accepted' ? 'Member' : m.status;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/10">
                      <span className="text-white/90 text-sm">{name}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          m.status === 'leader'
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                            : m.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                            : 'bg-white/10 text-white/70 border border-white/20'
                        }`}
                      >
                        {role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PPT Upload */}
          {team && (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                PPT Submission
              </h2>
              <div className="border border-cyan-400/30 rounded-xl p-4 bg-gradient-to-br from-cyan-500/5 to-transparent">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 border-2 border-dashed border-cyan-400/40 flex items-center justify-center">
                      <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white/80 mb-2">
                    {submission?.ppt_url ? 'PPT Submitted Successfully' : 'Upload your presentation'}
                  </p>
                  <p className="text-xs text-white/50 mb-4">
                    Supported formats: .ppt, .pptx, .pdf
                  </p>
                  {isLeader ? (
                    <label className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-white font-semibold cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">
                      {uploading ? 'Uploading...' : submission?.ppt_url ? 'Re-upload PPT' : 'Upload PPT'}
                      <input
                        type="file"
                        accept=".ppt,.pptx,.pdf"
                        onChange={handleUploadPPT}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-white/60">
                      Only the <span className="font-semibold text-white/80">team leader</span> can upload the PPT
                    </p>
                  )}
                  {submission?.submitted_at && (
                    <p className="text-xs text-emerald-300 mt-3">
                      Last uploaded: {formatDateTime(submission.submitted_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Announcements */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              Recent Announcements
            </h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-white/60 text-center py-8">No announcements yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-white/15 bg-black/35 p-4 hover:border-cyan-400/40 hover:shadow-[0_0_18px_rgba(34,211,238,0.25)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
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

          {/* Event Timeline */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Event Timeline
            </h2>
            <div className="relative">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-cyan-400/30 via-cyan-400/10 to-transparent" />
              <div className="space-y-1">
                {timelineItems.map((item, index) => (
                  <TimelineItem
                    key={index}
                    title={item.title}
                    date={item.date}
                    isActive={!item.isCompleted && index === timelineItems.findIndex(i => !i.isCompleted)}
                    isCompleted={item.isCompleted}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Submission Status */}
          {team && (
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                Submission Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Team</span>
                  <span className="text-white/90 font-medium">{team.team_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    submission?.ppt_url 
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                      : 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/40'
                  }`}>
                    {submission?.ppt_url ? 'Submitted' : 'Pending'}
                  </span>
                </div>
                {submission?.ppt_url && (
                  <div className="pt-2 border-t border-white/10">
                    <a
                      href={submission.ppt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Submitted PPT
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
