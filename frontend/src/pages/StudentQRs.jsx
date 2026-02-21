import { useState, useEffect } from 'react';
import { teamsAPI, qrAPI, foodQrAPI } from '../services/api';

function isQrActive(startDate) {
  if (!startDate) return false;
  const start = new Date(startDate);
  const oneDayBefore = new Date(start);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  oneDayBefore.setHours(0, 0, 0, 0);
  return today >= oneDayBefore;
}

function activationDate(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const one = new Date(start);
  one.setDate(one.getDate() - 1);
  return one.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export default function StudentQRs() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [entryQr, setEntryQr] = useState(null);
  const [foodQrs, setFoodQrs] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingQrs, setLoadingQrs] = useState(false);
  const [error, setError] = useState('');
  const [viewingQr, setViewingQr] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError('');
        const res = await teamsAPI.getMyTeams();
        if (res.data.success && Array.isArray(res.data.data)) {
          const list = [];
          res.data.data.forEach((tm) => {
            const ev = tm.teams?.events;
            if (ev?.title && tm.teams?.event_id) {
              list.push({
                id: tm.teams.event_id,
                title: ev.title,
                startDate: ev.start_date,
              });
            }
          });
          setEvents(list);
          if (list.length > 0 && !selectedEventId) setSelectedEventId(list[0].id);
        } else {
          setEvents([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load events');
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const canViewQr = selectedEvent ? isQrActive(selectedEvent.startDate) : false;
  const availableFrom = selectedEvent ? activationDate(selectedEvent.startDate) : null;

  useEffect(() => {
    if (!selectedEventId) {
      setEntryQr(null);
      setFoodQrs([]);
      return;
    }
    const load = async () => {
      setLoadingQrs(true);
      try {
        const [entryRes, foodRes] = await Promise.all([
          qrAPI.getMyQr(selectedEventId),
          foodQrAPI.getMyMeals(selectedEventId),
        ]);
        setEntryQr(entryRes.data.success ? entryRes.data.data : null);
        setFoodQrs(foodRes.data.success && Array.isArray(foodRes.data.data) ? foodRes.data.data : []);
      } catch {
        setEntryQr(null);
        setFoodQrs([]);
      } finally {
        setLoadingQrs(false);
      }
    };
    load();
  }, [selectedEventId]);

  const mealByType = (type) => foodQrs.find((m) => String(m.meal_type).toLowerCase() === type) || null;

  const qrItems = [
    { key: 'gate', label: 'Your Gate Entry QR', qr: entryQr?.qr_image_url ? { url: entryQr.qr_image_url, used: entryQr.is_used } : null },
    { key: 'breakfast', label: 'Your Breakfast QR', qr: mealByType('breakfast')?.qr_image_url ? { url: mealByType('breakfast').qr_image_url, used: mealByType('breakfast').is_used } : null },
    { key: 'lunch', label: 'Your Lunch QR', qr: mealByType('lunch')?.qr_image_url ? { url: mealByType('lunch').qr_image_url, used: mealByType('lunch').is_used } : null },
    { key: 'dinner', label: 'Your Dinner QR', qr: mealByType('dinner')?.qr_image_url ? { url: mealByType('dinner').qr_image_url, used: mealByType('dinner').is_used } : null },
  ];

  if (loadingEvents) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded bg-white/10 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">QRs</h2>
        {events.length > 1 && (
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(e.target.value || null)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60 outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/60 bg-red-500/15 text-red-100 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/20 bg-white/5 p-12 text-center">
          <p className="text-white/60">You’re not part of any event yet. Register for a hackathon to see your QRs here.</p>
        </div>
      ) : (
        <>
          {selectedEvent && (
            <p className="text-white/50 text-sm">
              QRs become available from <span className="text-cyan-400 font-medium">{availableFrom}</span> (one day before the event).
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {qrItems.map((item) => {
              const hasQr = !!item.qr;
              const disabled = !canViewQr || !hasQr || loadingQrs;
              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-cyan-500/40 hover:shadow-[0_0_24px_rgba(0,217,255,0.12)] transition-all"
                >
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </span>
                      <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                    </div>
                    {loadingQrs ? (
                      <div className="flex-1 rounded-lg bg-white/10 h-24 animate-pulse" />
                    ) : disabled && !hasQr ? (
                      <p className="text-white/50 text-sm flex-1">QR not generated yet</p>
                    ) : disabled ? (
                      <p className="text-white/50 text-sm flex-1">
                        Available from {availableFrom}
                      </p>
                    ) : null}
                    <div className="mt-auto pt-4">
                      {disabled ? (
                        <span className="inline-block px-4 py-2.5 rounded-xl bg-white/10 text-white/50 text-sm font-medium cursor-not-allowed">
                          View QR
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewingQr(item.qr?.url)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/90 to-cyan-600 text-white font-medium text-sm hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all"
                        >
                          View QR
                        </button>
                      )}
                      {item.qr?.used && (
                        <p className="text-emerald-400/90 text-xs mt-2">Already used</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal for viewing QR */}
      {viewingQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setViewingQr(null)}
          role="dialog"
          aria-modal="true"
          aria-label="QR code"
        >
          <div
            className="rounded-2xl border border-white/20 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a2e] p-8 shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setViewingQr(null)}
                className="text-white/70 hover:text-white p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-white p-4 flex justify-center">
              <img src={viewingQr} alt="QR code" className="w-56 h-56 object-contain" />
            </div>
            <p className="text-center text-white/70 text-sm mt-4">Show this at the counter</p>
          </div>
        </div>
      )}
    </div>
  );
}
