import { supabaseAdmin } from "../config/supabase.js";
import bcrypt            from "bcryptjs";

// ─── Helper: calculate weighted total ────────────────────────────────────────
const calcTotal = (scores, weights) => {
  const total =
    (scores.innovation           * weights.innovation_weight +
     scores.feasibility          * weights.feasibility_weight +
     scores.technical_depth      * weights.technical_depth_weight +
     scores.presentation_clarity * weights.presentation_clarity_weight +
     scores.social_impact        * weights.social_impact_weight) / 100;
  return Math.round(total * 100) / 100;
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/judges/create
 * Admin creates a judge account
 * Body: { firstName, lastName, email, password, eventId }
 */
export const createJudge = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, eventId } = req.body;

    // Check email not already taken
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: judge, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash,
        first_name:   firstName,
        last_name:    lastName,
        role:         "judge",
        otp_verified: true,
        is_verified:  true,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: `Judge account created for ${firstName} ${lastName}`,
      data: {
        id:        judge.id,
        email:     judge.email,
        firstName: judge.first_name,
        lastName:  judge.last_name,
        role:      judge.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/judges/event/:eventId
 * Admin gets all judges for an event
 */
export const getJudgesByEvent = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("judge_assignments")
      .select(`
        judge_id,
        users!judge_assignments_judge_id_fkey ( id, first_name, last_name, email )
      `)
      .eq("event_id", req.params.eventId);

    if (error) throw error;

    // Deduplicate judges
    const judgesMap = new Map();
    for (const row of data || []) {
      if (!judgesMap.has(row.judge_id)) {
        judgesMap.set(row.judge_id, row.users);
      }
    }

    res.status(200).json({ success: true, data: [...judgesMap.values()] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/judges/assign
 * Admin assigns teams to a judge
 * Body: { eventId, judgeId, teamIds: [] }
 */
export const assignTeams = async (req, res, next) => {
  try {
    const { eventId, judgeId, teamIds } = req.body;
    const adminId = req.user.id;

    if (!teamIds || teamIds.length === 0) {
      return res.status(400).json({ success: false, message: "teamIds array is required" });
    }

    // Verify judge exists and is a judge
    const { data: judge } = await supabaseAdmin
      .from("users")
      .select("id, role, first_name, last_name")
      .eq("id", judgeId)
      .single();

    if (!judge || judge.role !== "judge") {
      return res.status(404).json({ success: false, message: "Judge not found" });
    }

    // Verify all teams are shortlisted for this event
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id")
      .eq("event_id", eventId)
      .in("team_id", teamIds);

    if (!shortlisted || shortlisted.length !== teamIds.length) {
      return res.status(400).json({ success: false, message: "Some teams are not shortlisted for this event" });
    }

    // Upsert assignments (allow re-assigning)
    const assignments = teamIds.map((teamId) => ({
      event_id:    eventId,
      judge_id:    judgeId,
      team_id:     teamId,
      assigned_by: adminId,
    }));

    const { error } = await supabaseAdmin
      .from("judge_assignments")
      .upsert(assignments, { onConflict: "event_id,judge_id,team_id" });

    if (error) throw error;

    // Notify judge
    await supabaseAdmin.from("notifications").insert({
      user_id: judgeId,
      title:   "📋 Teams Assigned for Judging",
      message: `You have been assigned ${teamIds.length} team(s) to evaluate. Please login to start scoring.`,
      type:    "judge_assigned",
      data:    { eventId },
    });

    res.status(200).json({
      success: true,
      message: `${teamIds.length} team(s) assigned to ${judge.first_name} ${judge.last_name}`,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * DELETE /api/judges/unassign
 * Admin removes a team from a judge
 * Body: { eventId, judgeId, teamId }
 */
export const unassignTeam = async (req, res, next) => {
  try {
    const { eventId, judgeId, teamId } = req.body;

    await supabaseAdmin
      .from("judge_assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("judge_id", judgeId)
      .eq("team_id", teamId);

    res.status(200).json({ success: true, message: "Team unassigned from judge" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/judges/my-teams/:eventId
 * Judge gets their assigned teams for an event
 */
export const getMyAssignedTeams = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const judgeId     = req.user.id;

    const { data: assignments, error } = await supabaseAdmin
      .from("judge_assignments")
      .select(`
        team_id,
        teams (
          id, team_name,
          team_members ( status, users ( first_name, last_name, email ) )
        )
      `)
      .eq("event_id", eventId)
      .eq("judge_id", judgeId);

    if (error) throw error;

    // Attach existing scores to each team
    const teamIds = assignments.map((a) => a.team_id);

    const { data: scores } = await supabaseAdmin
      .from("judge_scores")
      .select("team_id, total_score, innovation, feasibility, technical_depth, presentation_clarity, social_impact, remarks, is_locked, updated_at")
      .eq("event_id", eventId)
      .eq("judge_id", judgeId)
      .in("team_id", teamIds);

    const scoresMap = {};
    for (const s of scores || []) {
      scoresMap[s.team_id] = s;
    }

    const result = assignments.map((a) => ({
      ...a.teams,
      score:   scoresMap[a.team_id] || null,
      scored:  !!scoresMap[a.team_id],
      locked:  scoresMap[a.team_id]?.is_locked || false,
    }));

    res.status(200).json({
      success:      true,
      total:        result.length,
      scored:       result.filter((t) => t.scored).length,
      pending:      result.filter((t) => !t.scored).length,
      data:         result,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/judges/score
 * Judge scores an assigned team
 * Body: { eventId, teamId, innovation, feasibility, technicalDepth, presentationClarity, socialImpact, ...weights, remarks }
 */
export const scoreTeam = async (req, res, next) => {
  try {
    const {
      eventId, teamId,
      innovation = 0, feasibility = 0, technicalDepth = 0,
      presentationClarity = 0, socialImpact = 0,
      innovationWeight = 20, feasibilityWeight = 20,
      technicalDepthWeight = 20, presentationClarityWeight = 20,
      socialImpactWeight = 20,
      remarks,
    } = req.body;

    const judgeId = req.user.id;

    // Verify judge is assigned to this team
    const { data: assignment } = await supabaseAdmin
      .from("judge_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("judge_id", judgeId)
      .eq("team_id", teamId)
      .single();

    if (!assignment) {
      return res.status(403).json({ success: false, message: "This team is not assigned to you" });
    }

    // Check if score is locked
    const { data: existing } = await supabaseAdmin
      .from("judge_scores")
      .select("is_locked")
      .eq("event_id", eventId)
      .eq("judge_id", judgeId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (existing?.is_locked) {
      return res.status(403).json({ success: false, message: "Score has been locked by admin and cannot be changed" });
    }

    // Validate weights sum to 100
    const weightSum = innovationWeight + feasibilityWeight + technicalDepthWeight +
                      presentationClarityWeight + socialImpactWeight;
    if (weightSum !== 100) {
      return res.status(400).json({ success: false, message: `Weights must sum to 100. Current sum: ${weightSum}` });
    }

    // Validate scores 0-10
    const scoreFields = { innovation, feasibility, technicalDepth, presentationClarity, socialImpact };
    for (const [key, val] of Object.entries(scoreFields)) {
      if (val < 0 || val > 10) {
        return res.status(400).json({ success: false, message: `${key} must be between 0 and 10` });
      }
    }

    const scores  = { innovation, feasibility, technical_depth: technicalDepth, presentation_clarity: presentationClarity, social_impact: socialImpact };
    const weights = { innovation_weight: innovationWeight, feasibility_weight: feasibilityWeight, technical_depth_weight: technicalDepthWeight, presentation_clarity_weight: presentationClarityWeight, social_impact_weight: socialImpactWeight };
    const total_score = calcTotal(scores, weights);

    const { data: score, error } = await supabaseAdmin
      .from("judge_scores")
      .upsert(
        {
          event_id:  eventId,
          judge_id:  judgeId,
          team_id:   teamId,
          ...scores,
          ...weights,
          total_score,
          remarks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,judge_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Score submitted successfully",
      data:    score,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/judges/scores/:eventId
 * Admin gets all judge scores for an event with final averaged leaderboard
 */
export const getEventScores = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const { data: scores, error } = await supabaseAdmin
      .from("judge_scores")
      .select(`
        total_score, innovation, feasibility, technical_depth,
        presentation_clarity, social_impact, remarks, is_locked, updated_at,
        teams ( id, team_name ),
        users!judge_scores_judge_id_fkey ( first_name, last_name )
      `)
      .eq("event_id", eventId)
      .order("total_score", { ascending: false });

    if (error) throw error;

    // Group by team and average scores across judges
    const teamMap = new Map();
    for (const s of scores) {
      const teamId = s.teams.id;
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, { team: s.teams, scores: [], avgTotal: 0 });
      }
      teamMap.get(teamId).scores.push({
        judge:       `${s.users.first_name} ${s.users.last_name}`,
        total_score: s.total_score,
        innovation:  s.innovation,
        feasibility: s.feasibility,
        technical_depth:      s.technical_depth,
        presentation_clarity: s.presentation_clarity,
        social_impact:        s.social_impact,
        remarks:     s.remarks,
        is_locked:   s.is_locked,
      });
    }

    // Calculate average total score per team
    const leaderboard = [...teamMap.values()].map((t) => {
      const avg = t.scores.reduce((sum, s) => sum + Number(s.total_score), 0) / t.scores.length;
      return { team: t.team, judgeScores: t.scores, avgTotal: Math.round(avg * 100) / 100 };
    }).sort((a, b) => b.avgTotal - a.avgTotal)
      .map((t, i) => ({ rank: i + 1, ...t }));

    res.status(200).json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * PATCH /api/judges/lock/:eventId
 * Admin locks all scores for an event (prevents re-scoring)
 */
export const lockScores = async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from("judge_scores")
      .update({ is_locked: true, updated_at: new Date().toISOString() })
      .eq("event_id", req.params.eventId);

    if (error) throw error;

    // Update event status to judging complete
    await supabaseAdmin
      .from("events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", req.params.eventId);

    res.status(200).json({ success: true, message: "All scores locked. Event marked as completed." });
  } catch (err) {
    next(err);
  }
};