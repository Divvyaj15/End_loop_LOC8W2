import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';

const CATEGORY_OPTIONS = [
  { value: 'web_dev', label: 'Web Dev' },
  { value: 'ai_ml', label: 'AI/ML' },
  { value: 'app_dev', label: 'App Dev' },
  { value: 'blockchain', label: 'Blockchain' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'registration_open', label: 'Registration Open' },
  { value: 'registration_closed', label: 'Registration Closed' },
  { value: 'hackathon_active', label: 'Hackathon Active' },
  { value: 'completed', label: 'Completed' },
];

export default function ManageEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    committeeName: '',
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
    status: 'draft',
    rules: [],
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const response = await eventAPI.getEventById(eventId);
      if (response.data.success) {
        const eventData = response.data.data;
        setEvent(eventData);
        setForm({
          title: eventData.title || '',
          description: eventData.description || '',
          category: eventData.category || '',
          committeeName: eventData.committee_name || '',
          mode: eventData.mode || 'offline',
          venue: eventData.venue || '',
          startDate: eventData.start_date || '',
          endDate: eventData.end_date || '',
          registrationDeadline: eventData.registration_deadline || '',
          eventStartTime: eventData.event_start_time || '',
          eventEndTime: eventData.event_end_time || '',
          minTeamSize: eventData.min_team_size || 1,
          maxTeamSize: eventData.max_team_size || 4,
          allowIndividual: eventData.allow_individual ?? true,
          isFree: eventData.is_free ?? true,
          entryFee: eventData.entry_fee || 0,
          firstPrize: eventData.first_prize || '',
          secondPrize: eventData.second_prize || '',
          thirdPrize: eventData.third_prize || '',
          status: eventData.status || 'draft',
          rules: eventData.rules || [],
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);

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
        status: form.status,
      };

      await eventAPI.updateEvent(eventId, payload);
      setSuccess('Event updated successfully!');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    setUpdating(true);
    try {
      await eventAPI.deleteEvent(eventId);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete event');
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-white/60">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 mb-4">Event not found</div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-6 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30"
          >
            Back to Dashboard
          </button>
        </div>
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
            onClick={() => navigate('/admin/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 text-sm"
          >
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="hidden lg:inline">Back to Dashboard</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-20 px-6 lg:px-10 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold">Manage Event</h1>
            <p className="text-xs lg:text-sm text-white/60">{event.title}</p>
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
          <form onSubmit={handleUpdate} className="max-w-6xl mx-auto space-y-6">
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
                    <label className="text-xs text-white/70">Status *</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
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

              {/* Prizes */}
              <div className="space-y-6">
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

                {event.banner_url && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                    <h2 className="text-lg font-semibold mb-4">Event Banner</h2>
                    <div className="rounded-xl overflow-hidden border border-cyan-500/40 bg-black/60">
                      <img
                        src={event.banner_url}
                        alt={event.title}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  </div>
                )}

                {event.problem_statement_url && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
                    <h2 className="text-lg font-semibold mb-4">Problem Statement</h2>
                    <a
                      href={event.problem_statement_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-sm hover:bg-cyan-500/30 transition-colors"
                    >
                      <span>📄</span>
                      <span>View PDF</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={updating || event.status !== 'draft'}
                className="px-6 py-3 rounded-xl bg-red-500/20 border border-red-400/50 text-red-200 text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {event.status !== 'draft' ? 'Cannot Delete (Not Draft)' : 'Delete Event'}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/dashboard')}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/20 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 text-sm font-semibold shadow-[0_12px_40px_rgba(34,211,238,0.55)] hover:from-cyan-300 hover:to-cyan-500 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
