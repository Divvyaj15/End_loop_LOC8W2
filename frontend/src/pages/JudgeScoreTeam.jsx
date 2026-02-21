import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { judgeAPI, hackathonSubmissionAPI, pptSubmissionAPI } from '../services/api';

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

export default function JudgeScoreTeam() {
  const { eventId, teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
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
    fetchTeamData();
  }, [eventId, teamId]);

  const fetchTeamData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await judgeAPI.getMyAssignedTeams(eventId);
      if (res.data.success) {
        const teams = res.data.data || [];
        const foundTeam = teams.find((t) => t.id === teamId);
        if (!foundTeam) {
          setError('Team not found or not assigned to you');
          return;
        }
        setTeam(foundTeam);

        // Load existing score if available
        if (foundTeam.score) {
          const s = foundTeam.score;
          setScoreForm({
            innovation: s.innovation ?? 0,
            feasibility: s.feasibility ?? 0,
            technicalDepth: s.technical_depth ?? 0,
            presentationClarity: s.presentation_clarity ?? 0,
            socialImpact: s.social_impact ?? 0,
            ...DEFAULT_WEIGHTS,
            remarks: s.remarks ?? '',
          });
        }

        // Check if locked
        if (foundTeam.locked) {
          setError('Scoring has been locked. You cannot re-score this team.');
        }

        // Fetch submission links for judges.
        // Priority: hackathon submissions (ppt + github + demo video), fallback to PPT-only submission.
        try {
          let teamSubmission = null;

          const hackathonRes = await hackathonSubmissionAPI.getSubmissionsForJudge(eventId).catch(() => null);
          if (hackathonRes?.data?.success) {
            const hackathonSubs = hackathonRes.data.data || [];
            teamSubmission = hackathonSubs.find((s) => s.team_id === teamId || s.teams?.id === teamId) || null;
          }

          if (!teamSubmission) {
            const pptRes = await pptSubmissionAPI.getTeamSubmission(teamId).catch(() => null);
            if (pptRes?.data?.success && pptRes?.data?.data) {
              teamSubmission = pptRes.data.data;
            }
          }

          setSubmission(teamSubmission);
        } catch (err) {
          console.error('Failed to fetch submission:', err);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (field, value) => {
    if (team?.locked) return;
    const num = Number(value);
    setScoreForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : Math.min(10, Math.max(0, num)) }));
  };

  const calculateTotal = () => {
    const { innovationWeight, feasibilityWeight, technicalDepthWeight, presentationClarityWeight, socialImpactWeight } = scoreForm;
    const total =
      (scoreForm.innovation * innovationWeight +
       scoreForm.feasibility * feasibilityWeight +
       scoreForm.technicalDepth * technicalDepthWeight +
       scoreForm.presentationClarity * presentationClarityWeight +
       scoreForm.socialImpact * socialImpactWeight) / 100;
    return Math.round(total * 100) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!team || !eventId || team.locked) return;

    const { innovationWeight, feasibilityWeight, technicalDepthWeight, presentationClarityWeight, socialImpactWeight } = scoreForm;
    const sum = innovationWeight + feasibilityWeight + technicalDepthWeight + presentationClarityWeight + socialImpactWeight;
    if (sum !== 100) {
      setError(`Weights must sum to 100. Current sum: ${sum}`);
      return;
    }

    setSubmitLoading(true);
    setError('');
    try {
      await judgeAPI.scoreTeam({
        eventId,
        teamId,
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
      setSuccess('Score submitted successfully!');
      setTimeout(() => {
        navigate(`/judge/dashboard`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit score');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getTeamMembers = () => {
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

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#05030c] to-[#060b1b] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Team not found</p>
          <button
            onClick={() => navigate('/judge/dashboard')}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-400"
          >
            Back to Dashboard
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
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/judge/dashboard')}
            className="text-white/60 hover:text-white text-sm mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl lg:text-3xl font-semibold text-white/90">{team.team_name}</h1>
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
              <p className="text-white font-medium">{team.team_name}</p>
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
            <div className="flex flex-wrap gap-2 pt-2">
              {submission?.ppt_url && (
                <a
                  href={submission.ppt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  View PPT
                </a>
              )}
              {submission?.github_link ? (
                <a
                  href={submission.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  View GitHub
                </a>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-medium cursor-not-allowed"
                  title="GitHub link not available"
                >
                  View GitHub
                </button>
              )}
              {submission?.demo_video_link ? (
                <a
                  href={submission.demo_video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  View Uploaded Video
                </a>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-medium cursor-not-allowed"
                  title="Video not available"
                >
                  View Uploaded Video
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scoring Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold mb-6 text-white/90">Enter Marks:</h2>
          
          {team.locked && (
            <div className="mb-4 bg-amber-500/15 border border-amber-400/60 text-amber-100 text-sm px-4 py-3 rounded-xl">
              ⚠️ Scoring has been locked. You cannot modify scores.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {CRITERIA.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={scoreForm[key]}
                  onChange={(e) => handleScoreChange(key, e.target.value)}
                  disabled={team.locked}
                  placeholder="Enter score out of 10"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white text-base focus:border-purple-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>

          {/* Total Score */}
          <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-400/30">
            <p className="text-sm text-white/70 mb-1">Total Score</p>
            <p className="text-2xl font-semibold text-purple-300">
              {totalScore.toFixed(2)}
            </p>
            <p className="text-xs text-white/50 mt-1">
              = Sum of above 5 evaluations (weighted)
            </p>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Remarks (optional)
            </label>
            <textarea
              value={scoreForm.remarks}
              onChange={(e) => setScoreForm((p) => ({ ...p, remarks: e.target.value }))}
              disabled={team.locked}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white text-sm focus:border-purple-400 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Add any feedback or comments..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={team.locked || submitLoading}
              className="px-8 py-3 rounded-xl bg-purple-500 text-white text-base font-semibold hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_4px_20px_rgba(168,85,247,0.4)]"
            >
              {submitLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
