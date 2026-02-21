import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { submissionAPI, shortlistAPI } from '../services/api';

const CRITERIA = [
  { key: 'innovation', label: 'Innovation' },
  { key: 'feasibility', label: 'Feasibility' },
  { key: 'technicalDepth', label: 'Technical Depth' },
  { key: 'presentationClarity', label: 'Presentation Clarity' },
  { key: 'socialImpact', label: 'Social Impact' },
];

const DEFAULT_WEIGHTS = {
  innovationWeight: 20,
  feasibilityWeight: 20,
  technicalDepthWeight: 20,
  presentationClarityWeight: 20,
  socialImpactWeight: 20,
};

export default function AdminEvaluatePPT() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const submissionFromState = location.state?.submission;

  const [submission, setSubmission] = useState(submissionFromState);
  const [existingScore, setExistingScore] = useState(null);
  const [loading, setLoading] = useState(!submissionFromState);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scoreForm, setScoreForm] = useState({
    innovation: 0,
    feasibility: 0,
    technicalDepth: 0,
    presentationClarity: 0,
    socialImpact: 0,
    ...DEFAULT_WEIGHTS,
    remarks: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (submissionFromState) {
      loadExistingScore();
      return;
    }
    if (eventId && location.state?.submissionId) {
      fetchSubmission();
    } else {
      setError('No submission data. Go back and click Evaluate PPT.');
    }
  }, [eventId, submissionFromState]);

  const fetchSubmission = async () => {
    setLoading(true);
    try {
      const res = await submissionAPI.getSubmissionsByEvent(eventId);
      if (res.data.success) {
        const sub = (res.data.data || []).find((s) => s.id === location.state.submissionId);
        if (sub) {
          setSubmission(sub);
          await loadExistingScoreForTeam(sub.team_id);
        } else {
          setError('Submission not found');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingScore = async () => {
    if (!submission?.team_id) return;
    try {
      const res = await shortlistAPI.getLeaderboard(eventId);
      if (res.data.success) {
        const scores = res.data.data || [];
        const teamScore = scores.find((s) => s.teams?.id === submission.team_id);
        if (teamScore) {
          setExistingScore(teamScore);
          setScoreForm({
            innovation: teamScore.innovation ?? 0,
            feasibility: teamScore.feasibility ?? 0,
            technicalDepth: teamScore.technical_depth ?? 0,
            presentationClarity: teamScore.presentation_clarity ?? 0,
            socialImpact: teamScore.social_impact ?? 0,
            ...DEFAULT_WEIGHTS,
            remarks: teamScore.remarks ?? '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load existing score:', err);
    }
  };

  const loadExistingScoreForTeam = async (teamId) => {
    try {
      const res = await shortlistAPI.getLeaderboard(eventId);
      if (res.data.success) {
        const scores = res.data.data || [];
        const teamScore = scores.find((s) => s.teams?.id === teamId);
        if (teamScore) {
          setExistingScore(teamScore);
          setScoreForm({
            innovation: teamScore.innovation ?? 0,
            feasibility: teamScore.feasibility ?? 0,
            technicalDepth: teamScore.technical_depth ?? 0,
            presentationClarity: teamScore.presentation_clarity ?? 0,
            socialImpact: teamScore.social_impact ?? 0,
            ...DEFAULT_WEIGHTS,
            remarks: teamScore.remarks ?? '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load existing score:', err);
    }
  };

  const handleScoreChange = (field, value) => {
    const num = Number(value);
    setScoreForm((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : Math.min(10, Math.max(0, num)),
    }));
  };

  const calculateTotal = () => {
    const { innovationWeight, feasibilityWeight, technicalDepthWeight, presentationClarityWeight, socialImpactWeight } = scoreForm;
    const total =
      (scoreForm.innovation * innovationWeight +
        scoreForm.feasibility * feasibilityWeight +
        scoreForm.technicalDepth * technicalDepthWeight +
        scoreForm.presentationClarity * presentationClarityWeight +
        scoreForm.socialImpact * socialImpactWeight) /
      100;
    return Math.round(total * 100) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submission || !eventId) return;

    const { innovationWeight, feasibilityWeight, technicalDepthWeight, presentationClarityWeight, socialImpactWeight } = scoreForm;
    const sum = innovationWeight + feasibilityWeight + technicalDepthWeight + presentationClarityWeight + socialImpactWeight;
    if (sum !== 100) {
      setError(`Weights must sum to 100. Current sum: ${sum}`);
      return;
    }

    setSubmitLoading(true);
    setError('');
    try {
      await shortlistAPI.scorePPT({
        eventId,
        teamId: submission.team_id,
        submissionId: submission.id,
        innovation: scoreForm.innovation,
        feasibility: scoreForm.feasibility,
        technicalDepth: scoreForm.technicalDepth,
        presentationClarity: scoreForm.presentationClarity,
        socialImpact: scoreForm.socialImpact,
        innovationWeight,
        feasibilityWeight,
        technicalDepthWeight,
        presentationClarityWeight,
        socialImpactWeight,
        remarks: scoreForm.remarks || undefined,
      });
      setSuccess('Score saved successfully!');
      setTimeout(() => {
        navigate(`/admin/events/${eventId}/manage`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save score');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getTeamMembers = () => {
    const team = submission?.teams;
    if (!team?.team_members || !Array.isArray(team.team_members)) return [];
    return team.team_members
      .filter((m) => m.status === 'accepted' || m.status === 'leader')
      .map((m) => {
        const u = m.users;
        return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : 'Unknown';
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">{error || 'Submission not found'}</p>
          <button
            onClick={() => navigate(`/admin/events/${eventId}/manage`)}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400"
          >
            Back to Manage Event
          </button>
        </div>
      </div>
    );
  }

  const members = getTeamMembers();
  const totalScore = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/admin/events/${eventId}/manage`)}
            className="text-white/60 hover:text-white text-sm mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Manage Event
          </button>
          <h1 className="text-2xl lg:text-3xl font-semibold text-white/90">
            View Registered Team
          </h1>
        </div>

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

        {/* Team Information */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold mb-4 text-white/90">Team Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Team Name</p>
              <p className="text-white font-medium">{submission.teams?.team_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Team Members</p>
              <div className="space-y-1">
                {members.length > 0 ? (
                  members.map((member, idx) => (
                    <p key={idx} className="text-white/80 text-sm">
                      {idx + 1}. {member}
                    </p>
                  ))
                ) : (
                  <p className="text-white/50 text-sm">No members found</p>
                )}
              </div>
            </div>
            <div className="pt-2">
              <a
                href={submission.ppt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/80 text-white text-sm font-medium hover:bg-cyan-500 transition-colors"
              >
                View PPT
              </a>
            </div>
          </div>
        </div>

        {/* Evaluation Dashboard */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold mb-6 text-white/90">Evaluation Dashboard</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {CRITERIA.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-white/80 mb-2">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={scoreForm[key]}
                  onChange={(e) => handleScoreChange(key, e.target.value)}
                  placeholder="Enter score out of 10"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white text-base focus:border-cyan-400 focus:outline-none placeholder:text-white/40"
                />
              </div>
            ))}
          </div>

          <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
            <p className="text-sm text-white/70 mb-1">Total Score</p>
            <p className="text-2xl font-semibold text-cyan-300">{totalScore.toFixed(2)}</p>
            <p className="text-xs text-white/50 mt-1">
              = Sum of above 5 evaluations (weighted)
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">Remarks (optional)</label>
            <textarea
              value={scoreForm.remarks}
              onChange={(e) => setScoreForm((p) => ({ ...p, remarks: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white text-sm focus:border-cyan-400 focus:outline-none resize-none placeholder:text-white/40"
              placeholder="Add feedback or comments..."
            />
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitLoading}
              className="px-8 py-3 rounded-xl bg-cyan-500 text-white text-base font-semibold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_4px_20px_rgba(34,211,238,0.4)]"
            >
              {submitLoading ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
