import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamAPI } from '../services/api';

export default function StudentInbox({ align = 'right' } = {}) {
  const navigate = useNavigate();
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const dropdownRef = useRef(null);

  const loadInvites = async () => {
    try {
      const res = await teamAPI.getMyTeams();
      if (res.data?.success) {
        const invites = (res.data.data || []).filter((t) => t.status === 'pending');
        setPendingInvites(invites);
      }
    } catch {
      setPendingInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccept = async (e, teamId) => {
    e.stopPropagation();
    setActionLoading(teamId);
    try {
      await teamAPI.acceptInvite(teamId);
      await loadInvites();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (e, teamId) => {
    e.stopPropagation();
    setActionLoading(teamId);
    try {
      await teamAPI.declineInvite(teamId);
      await loadInvites();
    } finally {
      setActionLoading(null);
    }
  };

  const count = pendingInvites.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        aria-label={count > 0 ? `${count} team invitation(s)` : 'Inbox'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-black text-[10px] font-bold">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute top-full mt-2 w-80 max-h-[360px] overflow-hidden rounded-xl border border-white/10 bg-[#0f172a] shadow-xl z-50 flex flex-col ${align === 'left' ? 'left-0' : 'right-0'}`}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Team Invites</h3>
            {count > 0 && (
              <span className="text-xs text-amber-400 font-medium">{count} pending</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : count === 0 ? (
              <div className="p-6 text-center text-white/50 text-sm">
                No pending invitations
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {pendingInvites.map((inv) => {
                  const teamId = inv.teams?.id;
                  const teamName = inv.teams?.team_name || 'Team';
                  const eventName = inv.teams?.events?.title || 'Event';
                  const isBusy = actionLoading === teamId;
                  return (
                    <div
                      key={teamId}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
                    >
                      <p className="text-sm font-medium text-white truncate">{teamName}</p>
                      <p className="text-xs text-white/50 mt-0.5 truncate">{eventName}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={(e) => handleAccept(e, teamId)}
                          disabled={isBusy}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-400/40 disabled:opacity-50"
                        >
                          {isBusy ? '…' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDecline(e, teamId)}
                          disabled={isBusy}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-xs font-medium border border-white/20 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {count > 0 && (
            <div className="p-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/student/teams'); }}
                className="w-full py-2 rounded-lg text-sm font-medium text-cyan-400 hover:bg-cyan-500/10 border border-cyan-400/30 transition-colors"
              >
                View all in Teams →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
