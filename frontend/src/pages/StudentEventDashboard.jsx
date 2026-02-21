import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, NavLink, Link } from 'react-router-dom';
import { eventAPI, teamAPI, pptSubmissionAPI, hackathonSubmissionAPI } from '../services/api';
import StudentInbox from '../components/StudentInbox';

// ── Shared SVG icons ─────────────────────────────────────────────────────────────
const IconDashboard = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);
const IconEvents = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const IconTeams = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const IconQR = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
);
const IconAnnouncements = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
);
const IconProfile = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);
const IconLogout = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const IconFilePDF = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#94A3B8" opacity="0.2" />
        <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 12h3a2 2 0 0 1 0 4H8v-4zm0 6v-2h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SIDEBAR_ITEMS = [
    { to: '/student/dashboard', label: 'Dashboard', Icon: IconDashboard, end: true },
    { to: '/student/my-events', label: 'My Events', Icon: IconEvents },
    { to: '/student/teams', label: 'Teams', Icon: IconTeams },
    { to: '/student/qr-codes', label: 'QR Codes', Icon: IconQR },
    { to: '/student/announcements', label: 'Announcements', Icon: IconAnnouncements },
    { to: '/student/profile', label: 'Profile', Icon: IconProfile },
];

function formatEventDate(start, end) {
    if (!start || !end) return 'Date TBA';
    const s = new Date(start);
    const e = new Date(end);
    const opts = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-IN', opts)} - ${e.toLocaleDateString('en-IN', opts)}`;
}

function formatEventTime(timeString) {
    if (!timeString) return 'TBA';
    const [hours, minutes] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10));
    d.setMinutes(parseInt(minutes, 10));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function StudentEventDashboard() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [event, setEvent] = useState(null);
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');

    // Upload state
    const [pptFileBase64, setPptFileBase64] = useState(null);
    const [pptFileName, setPptFileName] = useState('');
    const [githubLink, setGithubLink] = useState('');
    const [demoVideoLink, setDemoVideoLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [teamDetails, setTeamDetails] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setUploadMessage({ text: 'Only .pdf files are allowed', type: 'error' });
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setUploadMessage({ text: 'File size must be less than 20MB', type: 'error' });
            return;
        }

        setPptFileName(file.name);
        setUploadMessage({ text: '', type: '' });

        const reader = new FileReader();
        reader.onload = (event) => setPptFileBase64(event.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!pptFileBase64) {
            setUploadMessage({ text: 'Please select a PDF file', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setUploadMessage({ text: '', type: '' });

        try {
            if (event.status === 'ppt_submission') {
                const res = await pptSubmissionAPI.submitPPT({
                    eventId,
                    teamId: team.teams.id,
                    pptBase64: pptFileBase64
                });
                if (res.data?.success) {
                    setUploadMessage({ text: 'PDF submitted successfully!', type: 'success' });
                }
            } else if (event.status === 'hackathon_active') {
                if (!githubLink.trim()) {
                    setUploadMessage({ text: 'GitHub link is required', type: 'error' });
                    setIsSubmitting(false);
                    return;
                }
                const res = await hackathonSubmissionAPI.submitHackathonProject({
                    eventId,
                    teamId: team.teams.id,
                    pptBase64: pptFileBase64,
                    githubLink,
                    demoVideoLink
                });
                if (res.data?.success) {
                    setUploadMessage({ text: 'Project submitted successfully!', type: 'success' });
                }
            }
        } catch (err) {
            setUploadMessage({
                text: err.response?.data?.message || 'Failed to submit. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Setup User
    useEffect(() => {
        const raw = localStorage.getItem('user');
        if (!raw) { navigate('/login', { replace: true }); return; }
        try { setUser(JSON.parse(raw)); }
        catch { navigate('/login', { replace: true }); }
    }, [navigate]);

    // Fetch Event and Team data
    useEffect(() => {
        if (!user || !eventId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [eventRes, teamsRes] = await Promise.all([
                    eventAPI.getEventById(eventId).catch(() => null),
                    teamAPI.getMyTeams().catch(() => null)
                ]);

                let currentEvent = null;
                let currentTeam = null;

                if (eventRes?.data?.success) {
                    currentEvent = eventRes.data.data;
                    setEvent(currentEvent);
                }

                if (teamsRes?.data?.success) {
                    const myTeams = teamsRes.data.data;
                    currentTeam = myTeams.find(t => t.teams?.event_id === eventId);
                    if (currentTeam) {
                        setTeam(currentTeam);
                        const fullTeamRes = await teamAPI.getTeamById(currentTeam.teams.id).catch(() => null);
                        if (fullTeamRes?.data?.success) {
                            setTeamDetails(fullTeamRes.data.data);
                        }
                    }
                }

                if (currentEvent && currentTeam) {
                    if (currentEvent.status === 'ppt_submission') {
                        const subRes = await pptSubmissionAPI.getTeamSubmission(currentTeam.teams.id).catch(() => null);
                        if (subRes?.data?.success && subRes.data.data) {
                            setExistingSubmission(subRes.data.data);
                        }
                    } else if (currentEvent.status === 'hackathon_active') {
                        const subRes = await hackathonSubmissionAPI.getTeamHackathonSubmission(currentTeam.teams.id).catch(() => null);
                        if (subRes?.data?.success && subRes.data.data) {
                            const data = subRes.data.data;
                            setExistingSubmission(data);
                            setGithubLink(data.github_link || '');
                            setDemoVideoLink(data.demo_video_link || '');
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching event dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, eventId]);

    // Countdown timer
    useEffect(() => {
        if (!event?.start_date) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const start = new Date(event.start_date).getTime();
            const distance = start - now;

            if (distance < 0) {
                setTimeLeft('Started');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        }, 1000);

        return () => clearInterval(interval);
    }, [event?.start_date]);

    if (!user) return null;

    const isLeader = team?.teams?.leader_id === user.id;

    // Only show members who have accepted (leader + accepted). Pending invitees are not in the team yet.
    const allTeamMembers = teamDetails?.team_members || [];
    let members = allTeamMembers
        .filter(m => m.status === 'leader' || m.status === 'accepted')
        .map(m => ({
            id: m.users?.id || m.id,
            name: m.users ? `${m.users.first_name || ''} ${m.users.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
            role: m.status === 'leader' ? 'leader' : 'member',
            joined: m.joined_at
        }));
    if (members.length === 0 && isLeader) {
        members = [{ id: user.id, name: user.first_name + ' ' + (user.last_name || ''), role: 'leader', joined: team?.teams?.created_at }];
    }
    const pendingInvitees = isLeader ? allTeamMembers.filter(m => m.status === 'pending') : [];

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-[#0c1220] via-[#050816] to-[#040610] text-white overflow-hidden relative font-sans">

            {/* Background Starry Effect Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>

            {/* ── Sidebar ── */}
            <aside className="w-20 lg:w-56 bg-white/[0.02] backdrop-blur-3xl border-r border-white/5 flex flex-col z-10">
                <div className="h-20 flex items-center justify-center lg:justify-start px-4 border-b border-white/5">
                    <span className="text-cyan-400 font-semibold tracking-[0.2em] text-xs lg:text-sm">HACK-X</span>
                </div>
                <nav className="flex-1 py-6 space-y-2 px-2 lg:px-3 overflow-y-auto">
                    {SIDEBAR_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${isActive
                                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-200 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
                                    : 'border border-transparent text-white/50 hover:bg-white/5 hover:text-white/90'
                                }`
                            }
                        >
                            <span className="w-8 flex items-center justify-center flex-shrink-0">
                                <item.Icon className="w-5 h-5" />
                            </span>
                            <span className="hidden lg:inline font-medium tracking-wide">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">

                {/* Top Header */}
                <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/5 bg-white/[0.01] backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-white/90 font-semibold tracking-wide flex items-center gap-2">
                                <span className="text-blue-400">»</span> HACK-X's WorkSpace
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <StudentInbox />
                        <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-full pl-3 pr-1 py-1 border border-white/10">
                            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <span className="text-sm font-medium text-white/80 pr-2">{user.first_name} {user.last_name || ''}</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=0D8ABC&color=fff`} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

                            {/* Greeting */}
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-4xl font-light text-white tracking-tight">
                                    Hello <span className="font-semibold text-white">{user.first_name}!</span>
                                </h1>
                                <p className="text-white/50 text-lg">
                                    Let's get ready for <span className="italic text-white/70">{event?.title || 'the event'}...</span>
                                </p>
                            </div>

                            <div className="flex flex-col xl:flex-row gap-6">

                                {/* Left Column - Main Event & Upload */}
                                <div className="flex-1 flex flex-col gap-6">
                                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                                        {/* Glow effect */}
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 rounded-3xl z-0"></div>

                                        <div className="relative z-10">
                                            {/* Event Header */}
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-white tracking-wide mb-1">{event?.title || 'Event Name'}</h2>
                                                    <p className="text-blue-300/70 text-sm font-medium tracking-wider uppercase">
                                                        {formatEventDate(event?.start_date, event?.end_date)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {timeLeft && (
                                                        <div className="text-sm text-white/60 tracking-wider">
                                                            Event Starts In: <span className="text-white font-mono">{timeLeft}</span>
                                                        </div>
                                                    )}
                                                    <Link to={`/student/events/${eventId}`} className="px-5 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-sm font-medium transition-colors backdrop-blur-sm">
                                                        View Event
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Team Info Banner inside card */}
                                            <div className="bg-white/[0.04] border border-white/5 rounded-xl p-4 flex items-center justify-between mb-8 backdrop-blur-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                                                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-semibold">{team?.teams?.team_name || 'Your Team'}</div>
                                                        <div className="text-xs text-white/50">Leader - {members.find(m => m.role === 'leader')?.name || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex -space-x-2">
                                                        {members.slice(0, 3).map((m, i) => (
                                                            <img key={i} className="w-8 h-8 rounded-full border-2 border-[#1a1f35] object-cover" src={`https://ui-avatars.com/api/?name=${m.name.replace(' ', '+')}&background=random`} alt={m.name} />
                                                        ))}
                                                    </div>
                                                    {members.length > 0 && (
                                                        <span className="text-white/60 text-sm ml-2">{members.length} member{members.length !== 1 ? 's' : ''} <span className="opacity-50">&rsaquo;</span></span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Smart Upload Area */}
                                            {event?.status === 'ppt_submission' || event?.status === 'hackathon_active' ? (
                                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-lg relative overflow-hidden group">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h3 className="text-xl font-semibold text-white">
                                                            {event.status === 'ppt_submission' ? 'Phase 1: PDF Submission' : 'Final Project Submission'}
                                                        </h3>
                                                        {uploadMessage.text && (
                                                            <span className={`text-sm px-3 py-1 rounded-full ${uploadMessage.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                                {uploadMessage.text}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-6">
                                                        {/* File Upload Field */}
                                                        {existingSubmission && !isUpdating ? (
                                                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                                                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                                <h4 className="text-lg font-medium text-emerald-400 mb-1">Project Submitted Successfully</h4>
                                                                <p className="text-sm text-emerald-400/70 mb-4 cursor-pointer" onClick={() => window.open(existingSubmission.ppt_url)}>View Submitted PDF Document</p>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className={`border-2 border-dashed ${isLeader ? 'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer' : 'border-white/10 bg-white/5 opacity-70'} rounded-xl p-8 flex flex-col items-center justify-center transition-all text-center relative`}
                                                                onClick={() => isLeader && fileInputRef.current?.click()}
                                                            >
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    ref={fileInputRef}
                                                                    onChange={handleFileChange}
                                                                    accept=".pdf"
                                                                    disabled={!isLeader || isSubmitting}
                                                                />
                                                                <IconFilePDF className="w-12 h-12 text-blue-400 mb-3 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                                                <div className="text-lg text-white mb-1">
                                                                    {pptFileName ? (
                                                                        <span className="text-emerald-400 font-medium">{pptFileName}</span>
                                                                    ) : (
                                                                        <span className="font-semibold">{isLeader ? (existingSubmission ? 'Select new .pdf file to update' : 'Drop your .pdf file here or click to browse') : 'PDF File Area'}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-white/50">
                                                                    Supported formats: .pdf (Max 20MB)
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Hackathon Active Extra Fields */}
                                                        {event.status === 'hackathon_active' && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                                                <div className="space-y-2 text-left">
                                                                    <label className="text-sm font-medium text-white/70 ml-1">GitHub Link <span className="text-red-400">*</span></label>
                                                                    <input
                                                                        type="url"
                                                                        placeholder="https://github.com/username/repo"
                                                                        value={githubLink}
                                                                        onChange={(e) => setGithubLink(e.target.value)}
                                                                        disabled={(!isLeader || isSubmitting) || (existingSubmission && !isUpdating)}
                                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all disabled:opacity-50"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2 text-left">
                                                                    <label className="text-sm font-medium text-white/70 ml-1">Demo Video Link (Optional)</label>
                                                                    <input
                                                                        type="url"
                                                                        placeholder="YouTube, Drive, etc."
                                                                        value={demoVideoLink}
                                                                        onChange={(e) => setDemoVideoLink(e.target.value)}
                                                                        disabled={(!isLeader || isSubmitting) || (existingSubmission && !isUpdating)}
                                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(!existingSubmission || isUpdating) && (
                                                            <div className="flex flex-col items-center pt-2">
                                                                <button
                                                                    onClick={handleSubmit}
                                                                    disabled={!isLeader || isSubmitting || !pptFileBase64}
                                                                    className={`w-full sm:w-auto min-w-[200px] px-8 py-3.5 rounded-xl font-semibold tracking-wide shadow-lg transition-all ${!isLeader || isSubmitting || !pptFileBase64
                                                                        ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
                                                                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-transparent'
                                                                        }`}
                                                                >
                                                                    {isSubmitting ? 'Uploading...' : (existingSubmission ? 'Update Project' : 'Submit Project')}
                                                                </button>
                                                                {!isLeader && <p className="mt-4 text-xs font-medium text-amber-400/90 text-center">Only the Team Leader can submit the project files.</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                                                        <svg className="w-8 h-8 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    </div>
                                                    <h3 className="text-xl font-medium text-white/70 mb-2">Submissions Not Open</h3>
                                                    <p className="text-sm text-white/40 max-w-sm">The submission window for this event is either not yet open or has already closed.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Team Details Table below the main card */}
                                    <div>
                                        <h3 className="text-xl font-semibold text-white/90 mb-4 px-1">Team Details</h3>
                                        {pendingInvitees.length > 0 && (
                                            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-400/30">
                                                <p className="text-amber-200 text-sm font-medium mb-2">
                                                    {pendingInvitees.length} invite{pendingInvitees.length !== 1 ? 's' : ''} pending — members will appear here once they accept
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {pendingInvitees.map((p, i) => (
                                                        <span key={i} className="text-xs text-amber-300/90 px-2 py-1 rounded-lg bg-amber-500/20">
                                                            {p.users ? `${p.users.first_name || ''} ${p.users.last_name || ''}`.trim() || p.users.email : 'Unknown'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white/[0.02] border-b border-white/5 text-white/40 font-medium">
                                                    <tr>
                                                        <th className="px-6 py-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Team Name</th>
                                                        <th className="px-6 py-4">Team</th>
                                                        <th className="px-6 py-4 text-right">Joined</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {members.map((member, idx) => (
                                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                            <td className="px-6 py-4 flex items-center gap-3">
                                                                <img src={`https://ui-avatars.com/api/?name=${member.name.replace(' ', '+')}&background=random`} alt={member.name} className="w-8 h-8 rounded-full border border-white/10" />
                                                                <span className="text-white/80 font-medium">{member.name}</span>
                                                                {member.role === 'leader' && <span className="text-amber-400" title="Leader">👑</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-white/50 capitalize">{member.role}</td>
                                                            <td className="px-6 py-4 text-right text-white/40">{member.joined ? new Date(member.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Status & QR */}
                                <div className="w-full xl:w-80 flex flex-col gap-6 flex-shrink-0">

                                    {/* Timeline Block */}
                                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
                                        {/* Subtle icon background */}
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <svg className="w-24 h-24 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Timeline Snapshot
                                            </h3>

                                            <div className="space-y-4 pt-2">
                                                <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                                                    <div>
                                                        <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Start Date</p>
                                                        <p className="text-white/90 font-medium text-sm">
                                                            {event?.start_date ? new Date(event.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">End Date</p>
                                                        <p className="text-white/90 font-medium text-sm">
                                                            {event?.end_date ? new Date(event.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-1">
                                                    <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Event Timings</p>
                                                    <p className="text-blue-300/90 font-medium text-sm">
                                                        {formatEventTime(event?.event_start_time)} - {formatEventTime(event?.event_end_time)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submission Status */}
                                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
                                        <h3 className="text-lg font-medium text-white/90 mb-4">Submission Status</h3>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                                <span className="text-sm text-white/50">Team Submission</span>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 text-xs transition-colors border border-white/10 flex items-center gap-1">
                                                        View <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <div className={`text-xl font-medium ${existingSubmission ? 'text-emerald-400' : 'text-white/80'}`}>
                                                    {existingSubmission ? 'Submitted' : 'Pending'}
                                                </div>
                                                <div className="flex gap-2">
                                                    {existingSubmission && (
                                                        <button
                                                            className="px-4 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 text-sm transition-colors border border-white/10"
                                                            onClick={() => window.open(existingSubmission.ppt_url)}
                                                        >
                                                            View
                                                        </button>
                                                    )}
                                                    {(!existingSubmission?.is_locked && isLeader) && (
                                                        <button
                                                            className={`px-4 py-1.5 rounded text-sm transition-colors border ${isUpdating ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30'}`}
                                                            onClick={() => setIsUpdating(!isUpdating)}
                                                        >
                                                            {isUpdating ? 'Cancel' : 'Update'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side Team Details (Compact) */}
                                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-md flex-1 xl:flex-none">
                                        <h3 className="text-lg font-medium text-white/90 mb-4">Team Details</h3>
                                        <div className="space-y-4">
                                            {members.map((member, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
                                                    <div className="flex items-center gap-3">
                                                        <img src={`https://ui-avatars.com/api/?name=${member.name.replace(' ', '+')}&background=random`} alt={member.name} className="w-10 h-10 rounded-full border border-white/10 group-hover:border-blue-500/50 transition-colors" />
                                                        <div>
                                                            <div className="text-sm font-medium text-white/90">{member.name}</div>
                                                            <div className="text-xs text-white/40 capitalize">{member.role}</div>
                                                        </div>
                                                    </div>
                                                    {member.role === 'leader' && (
                                                        <span className="text-[10px] text-blue-400 font-medium px-2 py-1 rounded-full bg-blue-500/10">Leader &rsaquo;</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
