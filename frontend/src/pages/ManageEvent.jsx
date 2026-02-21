import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, teamAPI, shortlistAPI, qrAPI, submissionAPI, judgeAPI } from '../services/api';

export default function ManageEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [registeredTeams, setRegisteredTeams] = useState([]);
  const [shortlistedTeams, setShortlistedTeams] = useState([]);
  const [grandFinaleTeams, setGrandFinaleTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('manage'); // 'manage' | 'ppt' | 'judging'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDeleting, setSettingsDeleting] = useState(false);
  const [allJudges, setAllJudges] = useState([]);
  const [judgeScores, setJudgeScores] = useState([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [createJudgeForm, setCreateJudgeForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [createJudgeLoading, setCreateJudgeLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [selectedJudgeForAssign, setSelectedJudgeForAssign] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    title: '',
    description: '',
    committeeName: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    eventStartTime: '',
    eventEndTime: '',
    pptSubmissionDeadline: '',
    status: '',
    venue: '',
    teamsToShortlist: 5,
  });

  const openSettingsModal = () => {
    if (!event) return;
    setSettingsForm({
      title: event.title || '',
      description: event.description || '',
      committeeName: event.committee_name || '',
      startDate: event.start_date ? event.start_date.slice(0, 10) : '',
      endDate: event.end_date ? event.end_date.slice(0, 10) : '',
      registrationDeadline: event.registration_deadline ? event.registration_deadline.slice(0, 10) : '',
      eventStartTime: event.event_start_time ? String(event.event_start_time).slice(0, 5) : '',
      eventEndTime: event.event_end_time ? String(event.event_end_time).slice(0, 5) : '',
      pptSubmissionDeadline: event.ppt_submission_deadline ? event.ppt_submission_deadline.slice(0, 10) : '',
      status: event.status || 'registration_open',
      venue: event.venue || '',
      teamsToShortlist: event.teams_to_shortlist ?? 5,
    });
    setShowSettingsModal(true);
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  useEffect(() => {
    if (activeSection === 'judging' && eventId) {
      fetchJudgesData();
    }
  }, [activeSection, eventId]);

  const fetchEventData = async () => {
    setLoading(true);
    try {
      const [eventRes, teamsRes, shortlistedRes, submissionsRes] = await Promise.all([
        eventAPI.getEventById(eventId),
        teamAPI.getTeamsByEvent(eventId),
        shortlistAPI.getShortlistedTeams(eventId),
        submissionAPI.getSubmissionsByEvent(eventId),
      ]);

      if (eventRes.data.success) {
        setEvent(eventRes.data.data);
      }

      if (teamsRes.data.success) {
        const teams = teamsRes.data.data || [];
        setRegisteredTeams(teams);
        
        // Get scores for teams
        const leaderboardRes = await shortlistAPI.getLeaderboard(eventId);
        if (leaderboardRes.data.success) {
          const scores = leaderboardRes.data.data || [];
          const teamsWithScores = teams.map((team) => {
            const scoreData = scores.find((s) => s.teams?.id === team.id);
            return {
              ...team,
              score: scoreData?.total_score || null,
            };
          });
          setRegisteredTeams(teamsWithScores);
        }
      }

      if (shortlistedRes.data.success) {
        const shortlisted = shortlistedRes.data.data || [];
        setShortlistedTeams(shortlisted);
        // Grand Finale Teams are the same as shortlisted for now
        setGrandFinaleTeams(shortlisted);
      }

      if (submissionsRes.data.success) {
        setSubmissions(submissionsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch event data:', err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const fetchJudgesData = async () => {
    setJudgesLoading(true);
    try {
      const [judgesRes, scoresRes] = await Promise.all([
        judgeAPI.getAllJudges(),
        judgeAPI.getEventScores(eventId),
      ]);
      if (judgesRes.data.success) setAllJudges(judgesRes.data.data || []);
      if (scoresRes.data.success) setJudgeScores(scoresRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch judges data:', err);
    } finally {
      setJudgesLoading(false);
    }
  };

  const handleCreateJudge = async (e) => {
    e.preventDefault();
    setCreateJudgeLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await judgeAPI.createJudge(createJudgeForm);
      if (res.data.success) {
        setSuccess(res.data.message || 'Judge created successfully');
        setCreateJudgeForm({ firstName: '', lastName: '', email: '', password: '' });
        await fetchJudgesData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create judge');
    } finally {
      setCreateJudgeLoading(false);
    }
  };

  const handleAssignTeams = async () => {
    if (!selectedJudgeForAssign || allJudges.length === 0) return;
    const teamsToAssign = shortlistedTeams.map((item) => item.teams?.id || item.team_id).filter(Boolean);
    if (teamsToAssign.length === 0) {
      setError('No shortlisted teams to assign');
      return;
    }
    setAssignLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await judgeAPI.assignTeams(eventId, selectedJudgeForAssign.id, teamsToAssign);
      if (res.data.success) {
        setSuccess(res.data.message || 'Teams assigned');
        setSelectedJudgeForAssign(null);
        await fetchJudgesData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign teams');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSplitAndAssign = async () => {
    if (allJudges.length === 0) {
      setError('Create at least 4 judges first');
      return;
    }
    const teamsToAssign = shortlistedTeams.map((item) => item.teams?.id || item.team_id).filter(Boolean);
    if (teamsToAssign.length === 0) {
      setError('No shortlisted teams. Shortlist teams first.');
      return;
    }
    setAssignLoading(true);
    setError('');
    setSuccess('');
    try {
      const numJudges = Math.min(allJudges.length, 4);
      const perJudge = Math.ceil(teamsToAssign.length / numJudges);
      const judgesToUse = allJudges.slice(0, numJudges);
      for (let i = 0; i < judgesToUse.length; i++) {
        const chunk = teamsToAssign.slice(i * perJudge, (i + 1) * perJudge);
        if (chunk.length > 0) {
          await judgeAPI.assignTeams(eventId, judgesToUse[i].id, chunk);
        }
      }
      setSuccess(`Split ${teamsToAssign.length} teams across ${judgesToUse.length} judges`);
      await fetchJudgesData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign teams');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleLockScores = async () => {
    if (!window.confirm('Lock all scores? Judges will no longer be able to re-score.')) return;
    setLockLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await judgeAPI.lockScores(eventId);
      if (res.data.success) {
        setSuccess(res.data.message || 'Scores locked');
        await fetchJudgesData();
        await fetchEventData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to lock scores');
    } finally {
      setLockLoading(false);
    }
  };

  const handleShortlistTeams = async () => {
    if (!window.confirm('Are you sure you want to shortlist teams? This will select the top teams based on scores.')) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await shortlistAPI.confirmShortlist(eventId);
      if (response.data.success) {
        setSuccess(response.data.message || 'Teams shortlisted successfully!');
        await fetchEventData(); // Refresh data
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to shortlist teams');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendQRs = async () => {
    if (!window.confirm('Generate and send QR codes to all shortlisted teams?')) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await qrAPI.generateEntryQRs(eventId);
      if (response.data.success) {
        setSuccess(response.data.message || 'QR codes generated and sent successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR codes');
    } finally {
      setActionLoading(false);
    }
  };

  const getTeamMembers = (team) => {
    if (!team.team_members || !Array.isArray(team.team_members)) return 'N/A';
    const members = team.team_members
      .filter((m) => m.status === 'accepted' || m.status === 'leader')
      .map((m) => {
        const user = m.users;
        return user ? `${user.first_name} ${user.last_name}` : 'Unknown';
      });
    return members.join(' - ') || 'N/A';
  };

  const timeAgo = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const sec = Math.floor((Date.now() - d) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  };

  const handleSettingsChange = (field, value) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        title: settingsForm.title || undefined,
        description: settingsForm.description || undefined,
        committeeName: settingsForm.committeeName || undefined,
        startDate: settingsForm.startDate || undefined,
        endDate: settingsForm.endDate || undefined,
        registrationDeadline: settingsForm.registrationDeadline || undefined,
        eventStartTime: settingsForm.eventStartTime || undefined,
        eventEndTime: settingsForm.eventEndTime || undefined,
        pptSubmissionDeadline: settingsForm.pptSubmissionDeadline || undefined,
        venue: settingsForm.venue || undefined,
        teamsToShortlist: settingsForm.teamsToShortlist != null ? Number(settingsForm.teamsToShortlist) : undefined,
      };
      if (settingsForm.status === 'draft') {
        payload.status = 'draft';
      }
      const res = await eventAPI.updateEvent(eventId, payload);
      if (res.data?.success) {
        setEvent(res.data.data);
        setSuccess('Event settings saved.');
        setShowSettingsModal(false);
        await fetchEventData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Delete this event? This cannot be undone. Only draft events can be deleted; published events must be set to draft first.')) {
      return;
    }
    setSettingsDeleting(true);
    setError('');
    try {
      await eventAPI.deleteEvent(eventId);
      setSuccess('Event deleted.');
      setShowSettingsModal(false);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete event. Only draft events can be deleted.');
    } finally {
      setSettingsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="h-20 flex items-center justify-center lg:justify-start px-6 border-b border-white/10">
          <span className="text-cyan-400 font-semibold tracking-[0.25em] text-xs lg:text-sm">
            END_LOOP
          </span>
        </div>
        <nav className="flex-1 py-6 space-y-2 px-2 lg:px-4">
          <button
            onClick={() => setActiveSection('manage')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              activeSection === 'manage'
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                : 'border border-white/20 text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="hidden lg:inline">Manage Event</span>
          </button>
          <button
            onClick={() => setActiveSection('ppt')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              activeSection === 'ppt'
                ? 'bg-purple-500/20 border border-purple-400/50 text-purple-200'
                : 'border border-white/20 text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            </span>
            <span className="hidden lg:inline">PPT Submissions</span>
          </button>
          <button
            onClick={() => setActiveSection('judging')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              activeSection === 'judging'
                ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200'
                : 'border border-white/20 text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="hidden lg:inline">Judging</span>
          </button>
          <div className="pt-4 border-t border-white/10 space-y-1">
            <button
              onClick={() => navigate(`/admin/events/${eventId}`)}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-xl border border-white/15 text-white/50 hover:bg-white/5 hover:text-white text-xs transition-colors"
            >
              <span>←</span>
              <span className="hidden lg:inline">Event Dashboard</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
              }}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-xl border border-white/15 text-white/50 hover:bg-white/5 hover:text-white text-xs transition-colors"
            >
              <span className="hidden lg:inline">Log out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-semibold mb-1">ManageEvent</h1>
            {event && (
              <p className="text-xs lg:text-sm text-white/60">{event.title}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openSettingsModal}
              className="px-4 py-2 rounded-xl border border-white/30 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Event Settings
            </button>
          </div>
        </header>

        {/* Content */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-8">
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

          {activeSection === 'manage' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Registered Teams */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Registered Teams</h2>
                <button
                  onClick={handleShortlistTeams}
                  disabled={actionLoading || registeredTeams.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-xs font-semibold shadow-[0_4px_20px_rgba(34,211,238,0.4)] hover:from-cyan-300 hover:to-cyan-500 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Shortlist Teams'}
                </button>
              </div>
              {registeredTeams.length === 0 ? (
                <div className="text-white/40 text-sm py-8 text-center">
                  No registered teams yet
                </div>
              ) : (
                <div className="space-y-2">
                  {registeredTeams.map((team) => (
                    <div
                      key={team.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTeam(team)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedTeam(team)}
                      className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10 hover:border-cyan-400/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-white">
                          {team.team_name}
                        </div>
                        <div className="text-xs text-white/60">
                          {getTeamMembers(team)}
                        </div>
                      </div>
                      <div className="text-xs text-white/70">
                        Score: {team.score !== null ? team.score : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>

              {/* Shortlisted Teams */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Shortlisted Teams</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShortlistTeams}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl border border-white/30 text-xs font-medium hover:bg-white/5 transition-colors disabled:opacity-60"
                  >
                    shortlist
                  </button>
                  <button
                    onClick={handleSendQRs}
                    disabled={actionLoading || shortlistedTeams.length === 0}
                    className="px-4 py-2 rounded-xl border border-white/30 text-xs font-medium hover:bg-white/5 transition-colors disabled:opacity-60"
                  >
                    Send QRs
                  </button>
                </div>
              </div>
              {shortlistedTeams.length === 0 ? (
                <div className="text-white/40 text-sm py-8 text-center">
                  No shortlisted teams yet. Click "Shortlist Teams" to shortlist registered teams.
                </div>
              ) : (
                <div className="space-y-2">
                  {shortlistedTeams.map((item) => {
                    const team = item.teams || {};
                    return (
                      <div
                        key={item.team_id || team.id}
                        className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10 hover:border-cyan-400/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-white">
                            {team.team_name || `Team ${item.rank || ''}`}
                          </div>
                          <div className="text-xs text-white/60">
                            {getTeamMembers(team)}
                          </div>
                        </div>
                        <div className="text-xs text-white/70">
                          Score: {item.total_score !== undefined ? item.total_score : 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>

              {/* Grand Finale Teams */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Grand Finale Teams:</h2>
              </div>
              {grandFinaleTeams.length === 0 ? (
                <div className="text-white/40 text-sm py-8 text-center">
                  No grand finale teams yet
                </div>
              ) : (
                <div className="space-y-2">
                  {grandFinaleTeams.map((item) => {
                    const team = item.teams || {};
                    return (
                      <div
                        key={item.team_id || team.id}
                        className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10 hover:border-cyan-400/50 transition-colors"
                      >
                        <div className="text-sm font-semibold text-white">
                          {team.team_name || `Team ${item.rank || ''}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          )}

          {activeSection === 'ppt' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📄 PPT Submissions
                </h2>
                {submissions.length === 0 ? (
                  <div className="text-white/40 text-sm py-8 text-center">
                    No submissions received yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => navigate(`/admin/events/${eventId}/submissions/evaluate`, { state: { submission: sub } })}
                        className="w-full text-left flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/40 hover:bg-black/60 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {sub.teams?.team_name || 'Team'}
                          </p>
                          <p className="text-xs text-white/50 mt-0.5">
                            Submitted {timeAgo(sub.submitted_at)}
                          </p>
                        </div>
                        <span className="text-xs text-cyan-300 border border-cyan-500/40 rounded-full px-3 py-1">
                          Evaluate PPT
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'judging' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Create Judge */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                <h2 className="text-lg font-semibold mb-4">Create Judge Account</h2>
                <form onSubmit={handleCreateJudge} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="First name"
                    value={createJudgeForm.firstName}
                    onChange={(e) => setCreateJudgeForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={createJudgeForm.lastName}
                    onChange={(e) => setCreateJudgeForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={createJudgeForm.email}
                    onChange={(e) => setCreateJudgeForm((p) => ({ ...p, email: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={createJudgeForm.password}
                    onChange={(e) => setCreateJudgeForm((p) => ({ ...p, password: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={createJudgeLoading}
                    className="px-4 py-2 rounded-xl bg-amber-500/80 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-50"
                  >
                    {createJudgeLoading ? 'Creating...' : 'Create Judge'}
                  </button>
                </form>
                <p className="text-xs text-white/50 mt-2">Create 4 judges, then assign shortlisted teams.</p>
              </div>

              {/* Assign Teams */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                <h2 className="text-lg font-semibold mb-4">Assign Teams to Judges</h2>
                {judgesLoading ? (
                  <div className="text-white/50 py-4">Loading...</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {allJudges.map((j) => (
                        <button
                          key={j.id}
                          onClick={() => setSelectedJudgeForAssign(selectedJudgeForAssign?.id === j.id ? null : j)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                            selectedJudgeForAssign?.id === j.id
                              ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                              : 'bg-black/40 border-white/20 text-white/70 hover:border-amber-400/60'
                          }`}
                        >
                          {j.first_name} {j.last_name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAssignTeams}
                        disabled={!selectedJudgeForAssign || shortlistedTeams.length === 0 || assignLoading}
                        className="px-4 py-2 rounded-xl border border-amber-400/60 text-amber-200 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Assign all shortlisted to selected judge
                      </button>
                      <button
                        onClick={handleSplitAndAssign}
                        disabled={allJudges.length === 0 || shortlistedTeams.length === 0 || assignLoading}
                        className="px-4 py-2 rounded-xl bg-amber-500/80 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assignLoading ? 'Assigning...' : 'Split 40 teams across 4 judges'}
                      </button>
                    </div>
                    <p className="text-xs text-white/50 mt-2">Shortlisted teams: {shortlistedTeams.length}. Split distributes teams evenly across up to 4 judges.</p>
                  </>
                )}
              </div>

              {/* Scores Leaderboard */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Judge Scores & Leaderboard</h2>
                  <button
                    onClick={handleLockScores}
                    disabled={judgeScores.length === 0 || lockLoading}
                    className="px-4 py-2 rounded-xl border border-red-400/60 text-red-200 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {lockLoading ? 'Locking...' : 'Lock Scores'}
                  </button>
                </div>
                {judgeScores.length === 0 ? (
                  <div className="text-white/40 text-sm py-8 text-center">
                    No scores yet. Judges must score their assigned teams.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {judgeScores.map((item, idx) => (
                      <div
                        key={item.team?.id || idx}
                        className="p-4 rounded-xl bg-black/40 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">
                            #{item.rank} {item.team?.team_name}
                          </span>
                          <span className="text-cyan-300 font-medium">Avg: {item.avgTotal}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {item.judgeScores?.map((js, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-white/80">
                              {js.judge}: {js.total_score}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/50 mt-4">Lock scores when judging is complete. Admin manually announces winners.</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Event Settings Modal */}
      {showSettingsModal && event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0f172a]/95 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Event Settings</h2>
              <button type="button" onClick={() => setShowSettingsModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSettingsSave} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-500/15 border border-red-400/60 text-red-100 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              {success && (
                <div className="bg-emerald-500/15 border border-emerald-400/60 text-emerald-100 text-sm px-4 py-3 rounded-xl">{success}</div>
              )}

              {/* Basic info */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-200 mb-3">Basic info</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Event title</label>
                    <input type="text" value={settingsForm.title} onChange={(e) => handleSettingsChange('title', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" placeholder="Event title" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Committee name</label>
                    <input type="text" value={settingsForm.committeeName} onChange={(e) => handleSettingsChange('committeeName', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" placeholder="Committee" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Description</label>
                    <textarea value={settingsForm.description} onChange={(e) => handleSettingsChange('description', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none resize-none" placeholder="Short description" />
                  </div>
                </div>
              </div>

              {/* Timelines */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-200 mb-3">Timelines</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Start date</label>
                    <input type="date" value={settingsForm.startDate} onChange={(e) => handleSettingsChange('startDate', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">End date</label>
                    <input type="date" value={settingsForm.endDate} onChange={(e) => handleSettingsChange('endDate', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Registration deadline</label>
                    <input type="date" value={settingsForm.registrationDeadline} onChange={(e) => handleSettingsChange('registrationDeadline', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">PPT submission deadline</label>
                    <input type="date" value={settingsForm.pptSubmissionDeadline} onChange={(e) => handleSettingsChange('pptSubmissionDeadline', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Event start time</label>
                    <input type="time" value={settingsForm.eventStartTime} onChange={(e) => handleSettingsChange('eventStartTime', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Event end time</label>
                    <input type="time" value={settingsForm.eventEndTime} onChange={(e) => handleSettingsChange('eventEndTime', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Event phase & options */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-200 mb-3">Event phase & options</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Status (phase)</label>
                    <div className="px-3 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white text-sm">
                      {settingsForm.status === 'draft'
                        ? 'Draft (hidden from students)'
                        : settingsForm.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <p className="text-[11px] text-white/50 mt-1.5">
                      Status is set automatically from event dates (registration deadline, PPT deadline, start/end). To delete this event, mark as Draft below and save first.
                    </p>
                    {event?.status !== 'draft' && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsForm.status === 'draft'}
                          onChange={(e) => handleSettingsChange('status', e.target.checked ? 'draft' : event?.status || 'registration_open')}
                          className="rounded border-white/30 bg-black/60 accent-cyan-400"
                        />
                        Mark as Draft (required to delete event)
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Venue</label>
                    <input type="text" value={settingsForm.venue} onChange={(e) => handleSettingsChange('venue', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" placeholder="e.g. Main Hall" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Teams to shortlist</label>
                    <input type="number" min={1} max={50} value={settingsForm.teamsToShortlist} onChange={(e) => handleSettingsChange('teamsToShortlist', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-red-300/90 mb-3">Danger zone</h3>
                <p className="text-xs text-white/50 mb-3">Only draft events can be deleted. Check &quot;Mark as Draft&quot; above, save, then click Delete event.</p>
                <button type="button" onClick={handleDeleteEvent} disabled={settingsDeleting} className="px-4 py-2 rounded-xl border border-red-400/50 text-red-300 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50">
                  {settingsDeleting ? 'Deleting…' : 'Delete event'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSettingsModal(false)} className="px-4 py-2 rounded-xl border border-white/30 text-sm font-medium hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={settingsSaving} className="px-5 py-2 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50">
                  {settingsSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team detail modal – list of members, click member for info */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedTeam(null)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Team: {selectedTeam.team_name}</h2>
              <button type="button" onClick={() => setSelectedTeam(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {(selectedTeam.team_members || [])
                .filter((m) => m.status === 'accepted' || m.status === 'leader')
                .map((m) => {
                  const u = m.users;
                  const name = u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : 'Unknown';
                  return (
                    <button
                      key={m.user_id || u?.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember({ user: u, teamName: selectedTeam.team_name, role: m.status === 'leader' ? 'Leader' : 'Member' });
                        setSelectedTeam(null);
                      }}
                      className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{name}</p>
                        <p className="text-xs text-white/50">{u?.email}</p>
                      </div>
                      <span className="text-xs text-cyan-300/90">{m.status === 'leader' ? 'Leader' : 'Member'}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Member / participant info modal */}
      {selectedMember && selectedMember.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Participant</h2>
              <button type="button" onClick={() => setSelectedMember(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Name</p>
                <p className="text-white font-medium">
                  {[selectedMember.user.first_name, selectedMember.user.last_name].filter(Boolean).join(' ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Email</p>
                <p className="text-white font-medium">{selectedMember.user.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Team</p>
                <p className="text-cyan-300 font-medium">{selectedMember.teamName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Role</p>
                <p className="text-white font-medium">{selectedMember.role || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
