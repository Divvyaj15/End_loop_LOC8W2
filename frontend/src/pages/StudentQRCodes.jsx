import { useState, useEffect } from 'react';
import { teamAPI, qrAPI, foodQrAPI } from '../services/api';
import StudentSidebar from '../components/StudentSidebar';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntilEvent(startDate) {
  if (!startDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((start - today) / (1000 * 60 * 60 * 24));
}

function isQRVisible(startDate) {
  const days = daysUntilEvent(startDate);
  if (days === null) return false;
  return days <= 1;
}

// ── QR Popup Modal ────────────────────────────────────────────────────────────
function QRModal({ title, subtitle, qrImageUrl, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0f1e] border border-cyan-400/30 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_60px_rgba(34,211,238,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-lg">{title}</h3>
            {subtitle && <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.3)]">
            <img src={qrImageUrl} alt={title} className="w-64 h-64 object-contain" />
          </div>
        </div>
        <p className="text-center text-white/40 text-xs mt-4">Tap outside to close</p>
      </div>
    </div>
  );
}

// ── QR Card ───────────────────────────────────────────────────────────────────
function QRCard({ title, subtitle, qrImageUrl, isUsed, scannedAt, locked, lockReason }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        locked
          ? 'border-white/10 bg-white/[0.03] opacity-70'
          : isUsed
          ? 'border-white/10 bg-white/[0.03]'
          : 'border-cyan-400/30 bg-gradient-to-br from-cyan-950/40 to-black/60 shadow-[0_0_30px_rgba(34,211,238,0.08)]'
      }`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-white font-semibold">{title}</p>
              {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
            </div>
            {isUsed ? (
              <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/50 border border-white/10">
                Used
              </span>
            ) : locked ? null : (
              <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                Active
              </span>
            )}
          </div>

          {locked ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm text-center max-w-[200px]">{lockReason}</p>
            </div>
          ) : isUsed ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white/40 text-sm">Scanned{scannedAt ? ` on ${formatDate(scannedAt)}` : ''}</p>
            </div>
          ) : qrImageUrl ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="group relative p-3 bg-white rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:shadow-[0_0_50px_rgba(34,211,238,0.35)] transition-shadow cursor-pointer"
                title="Click to enlarge"
              >
                <img src={qrImageUrl} alt={title} className="w-44 h-44 object-contain" />
                {/* Enlarge hint overlay */}
                <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl px-2 py-1 flex items-center gap-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    <span className="text-white text-xs font-medium">Enlarge</span>
                  </div>
                </div>
              </button>
              <p className="text-white/40 text-xs">Tap QR to enlarge for scanning</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <p className="text-white/40 text-sm">Loading QR…</p>
            </div>
          )}
        </div>
      </div>

      {showModal && qrImageUrl && (
        <QRModal
          title={title}
          subtitle={subtitle}
          qrImageUrl={qrImageUrl}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentQRCodes() {
  const [myTeams, setMyTeams] = useState([]);
  const [qrData, setQrData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const res = await teamAPI.getMyTeams();
        const teams = res.data.success ? (res.data.data || []) : [];
        const confirmed = teams.filter((t) => t.teams?.status === 'confirmed');
        setMyTeams(confirmed);

        const fetches = confirmed.map(async (t) => {
          const eventId   = t.teams?.event_id;
          const startDate = t.teams?.events?.start_date;
          if (!eventId) return;

          if (!isQRVisible(startDate)) {
            setQrData((prev) => ({ ...prev, [eventId]: { locked: true, startDate } }));
            return;
          }

          try {
            const [entryRes, mealsRes] = await Promise.allSettled([
              qrAPI.getMyQr(eventId),
              foodQrAPI.getMyMeals(eventId),
            ]);
            const entry = entryRes.status === 'fulfilled' && entryRes.value.data?.success
              ? entryRes.value.data.data : null;
            const meals = mealsRes.status === 'fulfilled' && mealsRes.value.data?.success
              ? (mealsRes.value.data.data || []) : [];
            setQrData((prev) => ({ ...prev, [eventId]: { locked: false, entry, meals, startDate } }));
          } catch {
            setQrData((prev) => ({ ...prev, [eventId]: { locked: false, entry: null, meals: [], startDate } }));
          }
        });

        await Promise.all(fetches);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load QR codes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex">
      <StudentSidebar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* Header */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">My QR Codes</h1>
            <p className="text-white/50 text-sm mt-0.5">Entry &amp; meal QRs — visible 1 day before the event</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/50 bg-red-500/15 text-red-100 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Security notice */}
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-cyan-200/80 text-sm">
              For security, QR codes are only revealed <span className="font-semibold text-cyan-300">1 day before</span> the event starts. Do not share your QR with others.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : myTeams.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-white/50">No QR codes yet.</p>
              <p className="text-white/30 text-sm mt-1">QRs are generated after your team is shortlisted and confirmed.</p>
            </div>
          ) : (
            myTeams.map((t) => {
              const team    = t.teams;
              const eventId = team?.event_id;
              const data    = qrData[eventId];
              const days    = daysUntilEvent(team?.events?.start_date);

              return (
                <section key={eventId} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{team?.events?.title || 'Event'}</h2>
                      <p className="text-sm text-white/50 mt-0.5">
                        Team: <span className="text-white/80">{team?.team_name}</span>
                        {' · '}
                        {formatDate(team?.events?.start_date)} – {formatDate(team?.events?.end_date)}
                      </p>
                    </div>
                    {days !== null && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        days <= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : days === 1
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                          : 'bg-white/10 text-white/50 border-white/10'
                      }`}>
                        {days <= 0 ? 'Event is live' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QRCard
                      title="Entry QR"
                      subtitle="Show at the gate on event day"
                      qrImageUrl={data?.entry?.qr_image_url}
                      isUsed={data?.entry?.is_used}
                      scannedAt={data?.entry?.scanned_at}
                      locked={!data || data.locked}
                      lockReason={
                        data?.locked
                          ? `Available 1 day before event (${formatDate(team?.events?.start_date)})`
                          : !data?.entry
                          ? 'QR not generated yet. You may not be shortlisted.'
                          : undefined
                      }
                    />
                    {data && !data.locked && (data.meals || []).map((meal) => (
                      <QRCard
                        key={meal.id || meal.meal_type}
                        title={`${meal.meal_type ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1) : 'Meal'} QR`}
                        subtitle="Show at the food counter"
                        qrImageUrl={meal.qr_image_url}
                        isUsed={meal.is_used}
                        scannedAt={meal.scanned_at}
                        locked={false}
                      />
                    ))}
                    {(!data || data.locked) && (
                      <>
                        <QRCard title="Breakfast QR" subtitle="Show at the food counter" locked lockReason="Available 1 day before event" />
                        <QRCard title="Lunch QR"     subtitle="Show at the food counter" locked lockReason="Available 1 day before event" />
                      </>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
