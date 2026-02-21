import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { eventAPI, teamAPI, submissionAPI, shortlistAPI, qrAPI, foodQrAPI } from '../services/api';
import EventAnnouncements from './EventAnnouncements';
import EventMessageTeam from './EventMessageTeam';

function isEventDay(event) {
  if (!event?.start_date || !event?.end_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  const start = event.start_date.slice(0, 10);
  const end = event.end_date.slice(0, 10);
  return today >= start && today <= end;
}

export default function EventDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAnnouncements = location.pathname.includes('/announcements');
  const isMessage = location.pathname.includes('/message');
  
  const [event, setEvent] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanMode, setScanMode] = useState('entry'); // 'entry' | 'food'
  const [eventNotStartedMessage, setEventNotStartedMessage] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [foodLookup, setFoodLookup] = useState(null);
  const [foodPendingToken, setFoodPendingToken] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastScannedTokenRef = useRef({ token: null, at: 0 });
  const SCAN_COOLDOWN_MS = 3000;
  const [stats, setStats] = useState({
    totalParticipants: 0,
    teamsRegistered: 0,
    shortlistedTeams: 0,
    pptSubmissions: 0,
  });
  const [qrStats, setQrStats] = useState({
    entriesScanned: 0,
    mealsDistributed: 0,
  });
  const [dayStats, setDayStats] = useState({
    attendance: 0,
    breakfastsClaimed: 0,
    lunchesClaimed: 0,
    dinnersClaimed: 0,
  });
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        eventRes,
        teamsRes,
        submissionsRes,
        shortlistedRes,
        attendanceRes,
        foodReportRes,
        leaderboardRes,
      ] = await Promise.all([
        eventAPI.getEventById(eventId),
        teamAPI.getTeamsByEvent(eventId),
        submissionAPI.getSubmissionsByEvent(eventId),
        shortlistAPI.getShortlistedTeams(eventId),
        qrAPI.getAttendance(eventId),
        foodQrAPI.getFoodReport(eventId),
        shortlistAPI.getLeaderboard(eventId),
      ]);

      // Set event data
      if (eventRes.data.success) {
        setEvent(eventRes.data.data);
      }

      // Calculate stats
      const teamsData = teamsRes.data.success ? teamsRes.data.data : [];
      const submissionsData = submissionsRes.data.success ? submissionsRes.data.data : [];
      const shortlistedData = shortlistedRes.data.success ? shortlistedRes.data.data : [];
      const attendanceData = attendanceRes.data.success ? attendanceRes.data.summary : {};
      const foodData = foodReportRes.data.success ? foodReportRes.data.summary : {};
      const leaderboardData = leaderboardRes.data.success ? leaderboardRes.data.data : [];

      // Calculate total participants from teams (include both 'leader' and 'accepted')
      let totalParticipants = 0;
      teamsData.forEach((team) => {
        if (team.team_members && Array.isArray(team.team_members)) {
          totalParticipants += team.team_members.filter(
            (member) => member.status === 'accepted' || member.status === 'leader'
          ).length;
        }
      });

      // Set stats
      setStats({
        totalParticipants,
        teamsRegistered: teamsData.length,
        shortlistedTeams: shortlistedData.length,
        pptSubmissions: submissionsData.length,
      });

      // Set QR stats (entriesScanned = total individual scans; meals from food report)
      const entriesScanned = attendanceData.entriesScanned ?? attendanceData.reportedTeams ?? 0;
      const mealsConsumed = Object.values(foodData).reduce(
        (sum, meal) => sum + (meal?.consumed || 0),
        0
      );
      setQrStats({
        entriesScanned,
        mealsDistributed: mealsConsumed,
      });

      // Set day stats
      const breakfasts = foodData.breakfast?.consumed || 0;
      const lunches = foodData.lunch?.consumed || 0;
      const dinners = foodData.dinner?.consumed || 0;
      setDayStats({
        attendance: entriesScanned,
        breakfastsClaimed: breakfasts,
        lunchesClaimed: lunches,
        dinnersClaimed: dinners,
      });

      // Set teams and submissions
      setTeams(teamsData);
      setSubmissions(submissionsData);
      setPendingSubmissions(
        submissionsData.filter((sub) => !sub.is_reviewed || sub.status === 'pending')
      );

      // Set top teams from leaderboard
      setTopTeams(leaderboardData.slice(0, 3));
    } catch (err) {
      console.error('Failed to fetch event data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleScanQRClick = () => {
    if (!event) return;
    if (!isEventDay(event)) {
      setEventNotStartedMessage(true);
      return;
    }
    setEventNotStartedMessage(false);
    setScanResult(null);
    setShowScanModal(true);
  };

  const closeScanModal = useCallback(() => {
    setShowScanModal(false);
    setFoodLookup(null);
    setFoodPendingToken(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const submitScannedToken = useCallback(async (token) => {
    if (!token || scanning) return;
    const now = Date.now();
    if (lastScannedTokenRef.current.token === token && now - lastScannedTokenRef.current.at < SCAN_COOLDOWN_MS) return;
    lastScannedTokenRef.current = { token, at: now };
    setScanning(true);
    setScanResult(null);
    setFoodLookup(null);
    setFoodPendingToken(null);
    try {
      if (scanMode === 'entry') {
        const res = await qrAPI.scanEntry(token);
        const data = res.data?.data;
        setScanResult({
          success: true,
          message: res.data?.message || 'Entry recorded!',
          student: data?.student,
          team: data?.team,
        });
        fetchEventData(false);
      } else {
        const res = await foodQrAPI.lookupFood(token);
        if (res.data?.success && res.data?.data) {
          setFoodLookup(res.data.data);
          setFoodPendingToken(token);
        } else {
          setScanResult({ success: false, message: res.data?.message || 'Invalid meal QR code' });
        }
      }
    } catch (err) {
      setScanResult({
        success: false,
        message: err.response?.data?.message || 'Invalid or already used QR code.',
      });
    } finally {
      setScanning(false);
    }
  }, [eventId, scanning, scanMode]);

  const handleFulfilMeal = useCallback(async () => {
    if (!foodPendingToken || fulfilling) return;
    setFulfilling(true);
    setScanResult(null);
    try {
      const res = await foodQrAPI.scanFood(foodPendingToken);
      setScanResult({
        success: true,
        message: res.data?.message || 'Meal fulfilled!',
        student: res.data?.data?.student,
        team: res.data?.data?.team,
        meal: res.data?.data?.meal,
      });
      setFoodLookup(null);
      setFoodPendingToken(null);
      await fetchEventData(false);
    } catch (err) {
      setScanResult({
        success: false,
        message: err.response?.data?.message || 'Failed to fulfil meal',
      });
    } finally {
      setFulfilling(false);
    }
  }, [foodPendingToken, fulfilling]);

  useEffect(() => {
    if (!showScanModal || !event || !videoRef.current) return;
    let cancelled = false;
    const video = videoRef.current;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
      } catch (e) {
        if (!cancelled) setScanResult({ success: false, message: 'Camera access denied or unavailable.' });
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [showScanModal, event]);

  useEffect(() => {
    if (!showScanModal || !event || scanning) return;
    const video = videoRef.current;
    if (!video || !video.srcObject) return;
    const BarcodeDetector = window.BarcodeDetector;
    if (!BarcodeDetector) return;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    let rafId;
    const tick = async () => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue;
          let token = raw;
          // Try to parse as JSON (QR codes are stored as JSON with {token, type})
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.token) {
              token = parsed.token;
            }
          } catch {
            // Not JSON, use raw value as token
            token = raw.trim();
          }
          if (token) {
            submitScannedToken(token.trim());
            return;
          }
        }
      } catch (_) {}
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [showScanModal, event, scanning, submitScannedToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-white/60">Loading event dashboard...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-white/60">Event not found</div>
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
            onClick={() => navigate(`/admin/events/${eventId}`)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
              !isAnnouncements && !isMessage ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200' : 'border border-white/30 text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="hidden lg:inline">Event Home Page</span>
          </button>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/manage`)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-white/30 text-white/70 hover:bg-white/5 hover:text-white transition-colors text-sm"
          >
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-xs">⚙</span>
            </span>
            <span className="hidden lg:inline">Manage Event</span>
          </button>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/manage`, { state: { openSection: 'judging' } })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-white/30 text-white/70 hover:bg-white/5 hover:text-white transition-colors text-sm"
          >
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </span>
            <span className="hidden lg:inline">Judging</span>
          </button>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/announcements`)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              isAnnouncements ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200' : 'border border-white/30 text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="text-xs">📢</span>
            </span>
            <span className="hidden lg:inline">Announcements</span>
          </button>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/message`)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              isMessage ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200' : 'border border-white/30 text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="text-xs">✉</span>
            </span>
            <span className="hidden lg:inline">Message</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-20 px-4 lg:px-8 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg lg:text-xl font-semibold text-white truncate">{event.title}</h1>
            <p className="text-xs lg:text-sm text-white/50 mt-0.5">
              {formatDate(event.start_date)} – {formatDate(event.end_date)}
              {event.committee_name && ` · ${event.committee_name}`}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={handleScanQRClick}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isEventDay(event)
                  ? 'bg-cyan-500/90 text-white hover:bg-cyan-400 shadow-[0_4px_20px_rgba(34,211,238,0.25)]'
                  : 'border border-white/30 text-white/70 hover:bg-white/5'
              }`}
            >
              Scan QRs
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  navigate('/login');
                }}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-white/70 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors"
              >
                Log out
              </button>
              <div className="text-right">
                <p className="text-xs font-medium text-white/90">Admin</p>
                <p className="text-xs text-white/50 truncate max-w-[120px]">{event.committee_name || '—'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 border border-white/20 flex-shrink-0" />
            </div>
          </div>
        </header>

        {/* Event not started message */}
        {eventNotStartedMessage && (
          <div className="mx-4 mt-4 lg:mx-8 p-4 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-100 text-sm flex items-center justify-between">
            <span>Event has not started yet. QR scanning will be available on the event day ({formatDate(event.start_date)} – {formatDate(event.end_date)}).</span>
            <button type="button" onClick={() => setEventNotStartedMessage(false)} className="p-1 rounded hover:bg-amber-500/20 text-amber-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Content */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-8">
          {isAnnouncements && (
            <EventAnnouncements eventId={eventId} event={event} />
          )}
          {isMessage && (
            <EventMessageTeam eventId={eventId} teams={teams} />
          )}
          {!isAnnouncements && !isMessage && (
            <>
          {/* Tabs */}
          <div className="flex items-center gap-4 mb-6 border-b border-white/10">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-cyan-400 text-cyan-200'
                  : 'border-transparent text-white/50 hover:text-white/70'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'qr'
                  ? 'border-cyan-400 text-cyan-200'
                  : 'border-transparent text-white/50 hover:text-white/70'
              }`}
            >
              QR Codes
            </button>
          </div>

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Key Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setShowParticipantsModal(true)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)] text-left hover:border-cyan-400/30 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="text-3xl font-bold text-white mb-1">{stats.totalParticipants}</div>
                  <div className="text-xs text-white/70">Total Participants</div>
                  <div className="text-xs text-cyan-400/80 mt-1">Click to view all</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTeamsModal(true)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)] text-left hover:border-cyan-400/30 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="text-3xl font-bold text-white mb-1">{stats.teamsRegistered}</div>
                  <div className="text-xs text-white/70">Teams Registered</div>
                  <div className="text-xs text-cyan-400/80 mt-1">Click to view all</div>
                </button>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <div className="text-3xl font-bold text-white mb-1">{stats.shortlistedTeams}</div>
                  <div className="text-xs text-white/70">Shortlisted Teams</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <div className="text-3xl font-bold text-white mb-1">{stats.pptSubmissions}</div>
                  <div className="text-xs text-white/70">PPT Submissions</div>
                </div>
              </div>

              {/* QR Stats and Analytics Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* QR Stats */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                    <h3 className="text-sm font-semibold mb-4">QR Statistics</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Entries Scanned</span>
                        <span className="text-xl font-bold text-cyan-400">{qrStats.entriesScanned}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Meals Distributed</span>
                        <span className="text-xl font-bold text-purple-400">{qrStats.mealsDistributed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hackathon Day Stats */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                    <h3 className="text-sm font-semibold mb-4">Hackathon Day Stats</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Participants Attendance</span>
                        <span className="text-lg font-semibold text-white">{dayStats.attendance}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Breakfasts Claimed</span>
                        <span className="text-lg font-semibold text-emerald-400">{dayStats.breakfastsClaimed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Lunches Claimed</span>
                        <span className="text-lg font-semibold text-yellow-400">{dayStats.lunchesClaimed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Dinners Claimed</span>
                        <span className="text-lg font-semibold text-pink-400">{dayStats.dinnersClaimed}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Analytics Chart */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <h3 className="text-sm font-semibold mb-4">Event Analytics</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Participants', value: stats.totalParticipants, color: 'cyan' },
                      { label: 'Teams', value: stats.teamsRegistered, color: 'purple' },
                      { label: 'Shortlisted Teams', value: stats.shortlistedTeams, color: 'pink' },
                      { label: 'Submissions', value: stats.pptSubmissions, color: 'emerald' },
                    ].map((item) => {
                      const maxValue = Math.max(
                        stats.totalParticipants,
                        stats.teamsRegistered,
                        stats.shortlistedTeams,
                        stats.pptSubmissions,
                        1
                      );
                      const percentage = (item.value / maxValue) * 100;
                      const colorClasses = {
                        cyan: 'bg-cyan-400',
                        purple: 'bg-purple-400',
                        pink: 'bg-pink-400',
                        emerald: 'bg-emerald-400',
                      };
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/70">{item.label}</span>
                            <span className="text-white font-semibold">{item.value}</span>
                          </div>
                          <div className="h-3 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colorClasses[item.color]} rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Teams */}
              {topTeams.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <h3 className="text-sm font-semibold mb-4">Top Teams</h3>
                  <div className="space-y-3">
                    {topTeams.map((team, index) => (
                      <div
                        key={team.team_id || index}
                        className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {team.team_name || 'Team ' + (index + 1)}
                            </div>
                            <div className="text-xs text-white/60">
                              {team.leader_name || 'Leader Name'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-cyan-400">
                            Score: {team.total_score || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-sm font-semibold mb-4">QR Code Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/40 rounded-xl border border-white/10">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">{qrStats.entriesScanned}</div>
                    <div className="text-xs text-white/70">Entries Scanned</div>
                  </div>
                  <div className="p-4 bg-black/40 rounded-xl border border-white/10">
                    <div className="text-2xl font-bold text-purple-400 mb-1">{qrStats.mealsDistributed}</div>
                    <div className="text-xs text-white/70">Meals Distributed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </section>
      </main>

      {/* Scan QR modal – camera + result */}
      {showScanModal && event && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Scan QR">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
            <h2 className="text-lg font-semibold text-white">{scanMode === 'entry' ? 'Scan entry QR' : 'Scan meal QR'}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setScanMode('entry'); setFoodLookup(null); setFoodPendingToken(null); setScanResult(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${scanMode === 'entry' ? 'bg-cyan-500/90 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}>Entry</button>
              <button type="button" onClick={() => { setScanMode('food'); setFoodLookup(null); setFoodPendingToken(null); setScanResult(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${scanMode === 'food' ? 'bg-purple-500/90 text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}>Meal</button>
              <button type="button" onClick={closeScanModal} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white ml-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border-2 border-cyan-400/50 bg-black">
              <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              {!window.BarcodeDetector && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/80 text-sm text-center p-4">
                  Camera on, but QR scan requires Chrome/Edge. Use manual entry below.
                </div>
              )}
            </div>
            <p className="text-white/60 text-sm mt-4">{scanMode === 'entry' ? "Point the camera at the participant's entry QR code" : "Point the camera at the participant's meal QR (breakfast/lunch/dinner)"}</p>
            {scanResult && (
              <div className={`mt-4 w-full max-w-md p-4 rounded-xl text-sm ${scanResult.success ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-100' : 'bg-red-500/20 border border-red-400/50 text-red-100'}`}>
                {scanResult.message}
                {scanResult.student && <p className="mt-1 font-medium">{scanResult.student} · {scanResult.team}{scanResult.meal ? ` · ${scanResult.meal}` : ''}</p>}
              </div>
            )}
            <div className="mt-4 w-full max-w-md">
              <label className="block text-xs text-white/50 mb-1">Or enter token manually</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const token = e.currentTarget.token?.value?.trim();
                  if (token) submitScannedToken(token);
                }}
                className="flex gap-2"
              >
                <input name="token" type="text" placeholder="Paste QR token" className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:border-cyan-400/60 focus:outline-none" disabled={scanning} />
                <button type="submit" disabled={scanning} className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-50">
                  {scanning ? '…' : 'Submit'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Meal lookup popup – Fulfil */}
      {showScanModal && foodLookup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setFoodLookup(null); setFoodPendingToken(null); }}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Meal: {foodLookup.meal}</h3>
              <p className="text-xs text-white/50 mt-0.5">Fulfil to mark as claimed</p>
            </div>
            <div className="p-5 space-y-3">
              <div><p className="text-xs text-white/50 uppercase tracking-wider">Name</p><p className="text-white font-medium">{foodLookup.student}</p></div>
              <div><p className="text-xs text-white/50 uppercase tracking-wider">Team</p><p className="text-cyan-300 font-medium">{foodLookup.team}</p></div>
              <div><p className="text-xs text-white/50 uppercase tracking-wider">Meal</p><p className="text-purple-300 font-medium capitalize">{foodLookup.meal}</p></div>
            </div>
            <div className="p-5 pt-0 flex gap-2">
              <button type="button" onClick={() => { setFoodLookup(null); setFoodPendingToken(null); }} className="flex-1 px-4 py-2.5 rounded-xl border border-white/30 text-white text-sm font-medium hover:bg-white/5">Cancel</button>
              <button type="button" onClick={handleFulfilMeal} disabled={fulfilling} className="flex-1 px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-400 disabled:opacity-50">{fulfilling ? 'Fulfilling…' : 'Fulfil'}</button>
            </div>
          </div>
        </div>
      )}

      {/* All Participants modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowParticipantsModal(false)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">All Participants</h2>
              <button type="button" onClick={() => setShowParticipantsModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {(() => {
                const list = [];
                teams.forEach((team) => {
                  (team.team_members || []).forEach((m) => {
                    if (m.status !== 'accepted' && m.status !== 'leader') return;
                    const u = m.users;
                    list.push({
                      name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : 'Unknown',
                      email: u?.email,
                      team: team.team_name,
                      role: m.status === 'leader' ? 'Leader' : 'Member',
                    });
                  });
                });
                if (list.length === 0) return <p className="text-white/50 text-sm py-4 text-center">No participants yet</p>;
                return list.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-white/50">{p.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-cyan-300">{p.team}</p>
                      <p className="text-xs text-white/40">{p.role}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* All Teams modal */}
      {showTeamsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowTeamsModal(false)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">All Teams</h2>
              <button type="button" onClick={() => setShowTeamsModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {teams.length === 0 ? (
                <p className="text-white/50 text-sm py-4 text-center">No teams registered yet</p>
              ) : (
                teams.map((team) => {
                  const memberCount = (team.team_members || []).filter((m) => m.status === 'accepted' || m.status === 'leader').length;
                  return (
                    <div key={team.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-sm font-medium text-white">{team.team_name}</p>
                        <p className="text-xs text-white/50">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
