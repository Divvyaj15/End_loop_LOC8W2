import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const CATEGORY_OPTIONS = [
  { value: 'web_dev', label: 'Web Dev' },
  { value: 'ai_ml', label: 'AI/ML' },
  { value: 'app_dev', label: 'App Dev' },
  { value: 'blockchain', label: 'Blockchain' },
];

export default function AdminDashboard() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    committeeName: '',
    category: '',
    mode: 'offline',
    venue: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    eventStartTime: '',
    eventEndTime: '',
    minTeamSize: 1,
    maxTeamSize: 4,
    allowIndividual: true,
    isFree: true,
    entryFee: 0,
    firstPrize: '',
    secondPrize: '',
    thirdPrize: '',
    rules: ['Original Work Only', 'No Plagiarism', 'Bring Your Own Laptop'],
  });

  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerBase64, setBannerBase64] = useState('');
  const [problemPreviewName, setProblemPreviewName] = useState('');
  const [problemPdfBase64, setProblemPdfBase64] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pastEvents, setPastEvents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'live', or 'past'
  const [hasActiveEvent, setHasActiveEvent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
    setSuccess('');
  };

  const handleModeToggle = (mode) => {
    setForm((prev) => ({
      ...prev,
      mode,
      venue: mode === 'offline' ? prev.venue : '',
    }));
  };

  const handleIsFreeToggle = (isFree) => {
    setForm((prev) => ({
      ...prev,
      isFree,
      entryFee: isFree ? 0 : prev.entryFee,
    }));
  };

  const handleRuleChange = (index, value) => {
    setForm((prev) => {
      const rules = [...prev.rules];
      rules[index] = value;
      return { ...prev, rules };
    });
  };

  const addRule = () => {
    setForm((prev) => ({ ...prev, rules: [...prev.rules, ''] }));
  };

  const removeRule = (index) => {
    setForm((prev) => {
      const rules = prev.rules.filter((_, i) => i !== index);
      return { ...prev, rules };
    });
  };

  const fileToBase64 = (file, callback) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        callback(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToBase64(file, (base64) => {
      setBannerPreview(base64);
      setBannerBase64(base64);
    });
  };

  const handleProblemFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProblemPreviewName(file.name);
    fileToBase64(file, (base64) => {
      setProblemPdfBase64(base64);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.category) {
      setError('Please select an event category');
      return;
    }
    if (form.mode === 'offline' && !form.venue.trim()) {
      setError('Please enter a venue for offline events');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        committeeName: form.committeeName.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        registrationDeadline: form.registrationDeadline,
        eventStartTime: form.eventStartTime,
        eventEndTime: form.eventEndTime,
        minTeamSize: Number(form.minTeamSize) || 1,
        maxTeamSize: Number(form.maxTeamSize) || 4,
        allowIndividual: form.allowIndividual,
        mode: form.mode,
        venue: form.mode === 'offline' ? form.venue.trim() : null,
        firstPrize: form.firstPrize ? Number(form.firstPrize) : 0,
        secondPrize: form.secondPrize ? Number(form.secondPrize) : 0,
        thirdPrize: form.thirdPrize ? Number(form.thirdPrize) : 0,
        entryFee: form.isFree ? 0 : Number(form.entryFee || 0),
        isFree: form.isFree,
        rules: form.rules.filter((r) => r.trim() !== ''),
        bannerBase64: bannerBase64 || undefined,
      };

      const createRes = await eventAPI.createEvent(payload);
      const createdEvent = createRes.data?.data;

      if (!createdEvent) {
        throw new Error('Event creation failed');
      }

      if (problemPdfBase64) {
        await eventAPI.uploadProblemStatement(createdEvent.id, problemPdfBase64);
      }

      setSuccess('Event created successfully!');
      
      // Refresh live events to check if new event is active
      await fetchLiveEvents();
      
      // Check if the newly created event is active
      const today = new Date().toISOString().split('T')[0];
      const isActive = createdEvent.start_date <= today && createdEvent.end_date >= today;
      
      if (isActive) {
        setActiveTab('live'); // Switch to live events if event is active
      } else {
        setActiveTab('live'); // Still switch to live events to see the new event
      }

      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        committeeName: '',
        category: '',
        mode: 'offline',
        venue: '',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        eventStartTime: '',
        eventEndTime: '',
        minTeamSize: 1,
        maxTeamSize: 4,
        allowIndividual: true,
        isFree: true,
        entryFee: 0,
        firstPrize: '',
        secondPrize: '',
        thirdPrize: '',
      }));
      setBannerPreview('');
      setBannerBase64('');
      setProblemPreviewName('');
      setProblemPdfBase64('');
      
      // Already handled above with await fetchLiveEvents()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to create event. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await eventAPI.getAdminEvents();
      if (response.data.success) {
        const today = new Date().toISOString().split('T')[0];
        const live = response.data.data.filter(
          (event) => event.end_date >= today
        );
        setLiveEvents(live);
        
        // Check if there's an active event (currently happening)
        const active = response.data.data.filter(
          (event) => {
            const startDate = event.start_date;
            const endDate = event.end_date;
            return startDate <= today && endDate >= today;
          }
        );
        setHasActiveEvent(active.length > 0);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchPastEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await eventAPI.getAdminEvents();
      if (response.data.success) {
        const today = new Date().toISOString().split('T')[0];
        const past = response.data.data.filter(
          (event) => event.end_date < today
        );
        setPastEvents(past);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Check for active events on mount and set initial tab
  useEffect(() => {
    const checkActiveEvents = async () => {
      try {
        const response = await eventAPI.getAdminEvents();
        if (response.data.success) {
          const today = new Date().toISOString().split('T')[0];
          const active = response.data.data.filter(
            (event) => {
              const startDate = event.start_date;
              const endDate = event.end_date;
              return startDate <= today && endDate >= today;
            }
          );
          const hasActive = active.length > 0;
          setHasActiveEvent(hasActive);
          
          // If there's an active event, default to live events tab
          if (hasActive && activeTab === 'create') {
            setActiveTab('live');
          }
        }
      } catch (err) {
        console.error('Failed to check active events:', err);
      }
    };
    
    checkActiveEvents();
  }, []);

  useEffect(() => {
    if (activeTab === 'live') {
      fetchLiveEvents();
    } else if (activeTab === 'past') {
      fetchPastEvents();
    } else if (activeTab === 'create') {
      // Check for active events when switching to create tab
      fetchLiveEvents();
    }
  }, [activeTab]);

  // Redirect to live events if trying to create while event is active
  useEffect(() => {
    if (hasActiveEvent && activeTab === 'create') {
      setActiveTab('live');
    }
  }, [hasActiveEvent, activeTab]);

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
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 text-sm">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="hidden lg:inline">Events</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex-1">
            <div className="flex items-center gap-6 mb-2">
              {!hasActiveEvent && (
                <button
                  onClick={() => setActiveTab('create')}
                  className={`text-lg lg:text-xl font-semibold transition-colors ${
                    activeTab === 'create'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  Create New Event
                </button>
              )}
              <button
                onClick={() => setActiveTab('live')}
                className={`text-lg lg:text-xl font-semibold transition-colors ${
                  activeTab === 'live'
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Live Events
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`text-lg lg:text-xl font-semibold transition-colors ${
                  activeTab === 'past'
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Past Events
              </button>
            </div>
            <p className="text-xs lg:text-sm text-white/60">
              {activeTab === 'create'
                ? 'Fill in the details to create a new hackathon.'
                : activeTab === 'live'
                ? 'Manage your active and upcoming events.'
                : 'View and manage your past events.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden lg:flex flex-col items-end text-xs text-white/70">
              <span className="font-medium">Admin</span>
              <span className="text-white/50">ACM Committee</span>
            </span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 border border-white/20" />
          </div>
        </header>

        {/* Content */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeTab === 'create' && !hasActiveEvent ? (
            <form
              onSubmit={handleSubmit}
              className="max-w-6xl mx-auto space-y-6"
            >
            {error && (
              <div className="bg-red-500/15 border border-red-400/60 text-red-100 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/15 border border-emerald-400/60 text-emerald-100 text-sm px-4 py-3 rounded-xl">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[2fr,1.5fr,1.5fr] gap-6">
              {/* Event Details */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                <h2 className="text-lg font-semibold mb-4">Event Details</h2>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70">Event Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. TechSprint 2025"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70">Committee *</label>
                    <input
                      type="text"
                      name="committeeName"
                      value={form.committeeName}
                      onChange={handleChange}
                      placeholder="e.g. ACM Committee"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70">Event Category *</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, category: opt.value }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                            form.category === opt.value
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                              : 'bg-black/40 border-white/15 text-white/70 hover:border-cyan-400/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70">Mode *</label>
                    <div className="inline-flex rounded-xl bg-black/40 border border-white/15 p-1">
                      <button
                        type="button"
                        onClick={() => handleModeToggle('online')}
                        className={`px-4 py-1.5 text-xs rounded-lg ${
                          form.mode === 'online'
                            ? 'bg-cyan-500/80 text-black font-semibold'
                            : 'text-white/70'
                        }`}
                      >
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeToggle('offline')}
                        className={`px-4 py-1.5 text-xs rounded-lg ${
                          form.mode === 'offline'
                            ? 'bg-cyan-500/80 text-black font-semibold'
                            : 'text-white/70'
                        }`}
                      >
                        Offline
                      </button>
                    </div>
                  </div>

                  {form.mode === 'offline' && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">
                        Venue (if Offline) *
                      </label>
                      <input
                        type="text"
                        name="venue"
                        value={form.venue}
                        onChange={handleChange}
                        placeholder="e.g. Main Auditorium, Campus"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70">
                      Event Description *
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Describe your hackathon, theme, and goals..."
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60 resize-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time + Team & Rules */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-lg font-semibold mb-4">Date &amp; Time</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">Start Date *</label>
                      <input
                        type="date"
                        name="startDate"
                        value={form.startDate}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">End Date *</label>
                      <input
                        type="date"
                        name="endDate"
                        value={form.endDate}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">
                        Registration Deadline *
                      </label>
                      <input
                        type="date"
                        name="registrationDeadline"
                        value={form.registrationDeadline}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">Start Time *</label>
                      <input
                        type="time"
                        name="eventStartTime"
                        value={form.eventStartTime}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">End Time *</label>
                      <input
                        type="time"
                        name="eventEndTime"
                        value={form.eventEndTime}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-lg font-semibold mb-4">Team &amp; Rules</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">Team Size</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          name="minTeamSize"
                          value={form.minTeamSize}
                          onChange={handleChange}
                          className="w-20 bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        />
                        <span className="text-xs text-white/60">to</span>
                        <input
                          type="number"
                          min={form.minTeamSize || 1}
                          name="maxTeamSize"
                          value={form.maxTeamSize}
                          onChange={handleChange}
                          className="w-20 bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        />
                        <span className="text-xs text-white/60">members</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">Entry Fee</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          name="entryFee"
                          value={form.isFree ? 0 : form.entryFee}
                          onChange={handleChange}
                          disabled={form.isFree}
                          className="w-28 bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60 disabled:opacity-60"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/70">Free</span>
                          <button
                            type="button"
                            onClick={() => handleIsFreeToggle(!form.isFree)}
                            className={`w-10 h-5 rounded-full flex items-center px-0.5 ${
                              form.isFree ? 'bg-cyan-500' : 'bg-white/20'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                                form.isFree ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <input
                      id="allowIndividual"
                      type="checkbox"
                      name="allowIndividual"
                      checked={form.allowIndividual}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border border-white/30 bg-black/60 accent-cyan-400"
                    />
                    <label
                      htmlFor="allowIndividual"
                      className="text-xs text-white/80"
                    >
                      Allow Individual Participation
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/70">Rules</label>
                    <div className="space-y-1.5">
                      {form.rules.map((rule, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs text-white/80"
                        >
                          <span className="w-4 text-center text-white/40">
                            {index + 1}.
                          </span>
                          <input
                            type="text"
                            value={rule}
                            onChange={(e) =>
                              handleRuleChange(index, e.target.value)
                            }
                            className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                          />
                          {form.rules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRule(index)}
                              className="text-white/40 hover:text-red-400 px-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addRule}
                      className="mt-1 text-[11px] text-cyan-300 hover:text-cyan-200"
                    >
                      + Add Rule
                    </button>
                  </div>
                </div>
              </div>

              {/* Problem Statement & Prizes */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-lg font-semibold mb-4">Problem Statement</h2>

                  <div className="space-y-3">
                    <label className="text-xs text-white/70">
                      Event Banner (optional)
                    </label>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-xl py-6 px-4 cursor-pointer bg-black/40 hover:bg-black/30 transition-colors">
                      <span className="text-xs text-white/70">
                        Drag &amp; Drop Banner or Click to Upload
                      </span>
                      <span className="text-[11px] text-white/50">
                        PNG, JPG recommended 16:9
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBannerFile}
                      />
                    </label>
                    {bannerPreview && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-cyan-500/40 bg-black/60">
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <label className="text-xs text-white/70">
                      Problem Statement PDF (optional)
                    </label>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-xl py-6 px-4 cursor-pointer bg-black/40 hover:bg-black/30 transition-colors">
                      <span className="text-xs text-white/70">
                        Drag &amp; Drop PDF here or Click to Browse
                      </span>
                      <span className="text-[11px] text-white/50">
                        Single PDF, max 10MB
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleProblemFile}
                      />
                    </label>
                    {problemPreviewName && (
                      <p className="text-[11px] text-emerald-200 mt-1">
                        ✓ {problemPreviewName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-lg font-semibold mb-4">Prizes &amp; Rewards</h2>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">First Prize</label>
                      <input
                        type="number"
                        min="0"
                        name="firstPrize"
                        value={form.firstPrize}
                        onChange={handleChange}
                        placeholder="e.g. 50000"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">Second Prize</label>
                      <input
                        type="number"
                        min="0"
                        name="secondPrize"
                        value={form.secondPrize}
                        onChange={handleChange}
                        placeholder="e.g. 30000"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/70">Third Prize</label>
                      <input
                        type="number"
                        min="0"
                        name="thirdPrize"
                        value={form.thirdPrize}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-sm font-semibold shadow-[0_12px_40px_rgba(34,211,238,0.55)] hover:from-cyan-300 hover:to-cyan-500 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
          ) : activeTab === 'live' ? (
            <div className="max-w-6xl mx-auto">
              {loadingEvents ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-white/60">Loading live events...</div>
                </div>
              ) : liveEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="text-white/40 text-lg mb-2">No live events found</div>
                  <div className="text-white/30 text-sm">
                    Create an event to see it here
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveEvents.map((event) => {
                    const categoryLabels = {
                      web_dev: 'Web Dev',
                      ai_ml: 'AI/ML',
                      app_dev: 'App Dev',
                      blockchain: 'Blockchain',
                    };
                    const statusColors = {
                      draft: 'bg-gray-500/20 text-gray-300',
                      registration_open: 'bg-emerald-500/20 text-emerald-300',
                      registration_closed: 'bg-yellow-500/20 text-yellow-300',
                      hackathon_active: 'bg-cyan-500/20 text-cyan-300',
                      completed: 'bg-purple-500/20 text-purple-300',
                    };
                    return (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/admin/events/${event.id}/manage`)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)] hover:border-cyan-400/50 hover:shadow-[0_18px_60px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
                      >
                        {event.banner_url && (
                          <div className="mb-4 rounded-xl overflow-hidden">
                            <img
                              src={event.banner_url}
                              alt={event.title}
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-white line-clamp-2">
                            {event.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                              statusColors[event.status] || statusColors.draft
                            }`}
                          >
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            <span>
                              {new Date(event.start_date).toLocaleDateString()} -{' '}
                              {new Date(event.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1 h-1 rounded-full bg-purple-400" />
                            <span>
                              {event.mode === 'offline' ? '📍' : '🌐'} {event.mode}
                              {event.venue && ` • ${event.venue}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1 h-1 rounded-full bg-pink-400" />
                            <span>
                              {categoryLabels[event.category] || event.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="text-xs text-white/50">
                            {event.committee_name}
                          </div>
                          {(event.first_prize > 0 ||
                            event.second_prize > 0 ||
                            event.third_prize > 0) && (
                            <div className="text-xs text-emerald-300 font-medium">
                              ₹
                              {event.first_prize > 0
                                ? event.first_prize.toLocaleString()
                                : event.second_prize > 0
                                ? event.second_prize.toLocaleString()
                                : event.third_prize.toLocaleString()}
                              +
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <button className="w-full px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/30 transition-colors">
                            Manage Event →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              {loadingEvents ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-white/60">Loading past events...</div>
                </div>
              ) : pastEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="text-white/40 text-lg mb-2">No past events found</div>
                  <div className="text-white/30 text-sm">
                    Events that have ended will appear here
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((event) => {
                    const categoryLabels = {
                      web_dev: 'Web Dev',
                      ai_ml: 'AI/ML',
                      app_dev: 'App Dev',
                      blockchain: 'Blockchain',
                    };
                    const statusColors = {
                      draft: 'bg-gray-500/20 text-gray-300',
                      registration_open: 'bg-emerald-500/20 text-emerald-300',
                      registration_closed: 'bg-yellow-500/20 text-yellow-300',
                      hackathon_active: 'bg-cyan-500/20 text-cyan-300',
                      completed: 'bg-purple-500/20 text-purple-300',
                    };
                    return (
                      <div
                        key={event.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)] hover:border-cyan-400/50 transition-all"
                      >
                        {event.banner_url && (
                          <div className="mb-4 rounded-xl overflow-hidden">
                            <img
                              src={event.banner_url}
                              alt={event.title}
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-white line-clamp-2">
                            {event.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                              statusColors[event.status] || statusColors.draft
                            }`}
                          >
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            <span>
                              {new Date(event.start_date).toLocaleDateString()} -{' '}
                              {new Date(event.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1 h-1 rounded-full bg-purple-400" />
                            <span>
                              {event.mode === 'offline' ? '📍' : '🌐'} {event.mode}
                              {event.venue && ` • ${event.venue}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1 h-1 rounded-full bg-pink-400" />
                            <span>
                              {categoryLabels[event.category] || event.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="text-xs text-white/50">
                            {event.committee_name}
                          </div>
                          {(event.first_prize > 0 ||
                            event.second_prize > 0 ||
                            event.third_prize > 0) && (
                            <div className="text-xs text-emerald-300 font-medium">
                              ₹
                              {event.first_prize > 0
                                ? event.first_prize.toLocaleString()
                                : event.second_prize > 0
                                ? event.second_prize.toLocaleString()
                                : event.third_prize.toLocaleString()}
                              +
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

