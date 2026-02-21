import { supabaseAdmin }                      from "../config/supabase.js";
import { sendShortlistEmail, sendGrandFinaleEmail } from "../utils/mailer.js";

// ─── Helper: calculate weighted total score ───────────────────────────────────
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
 * POST /api/shortlist/score
 * Admin scores a team's PPT
 * Body: {
 *   eventId, teamId, submissionId,
 *   innovation, feasibility, technicalDepth, presentationClarity, socialImpact,
 *   innovationWeight, feasibilityWeight, technicalDepthWeight, presentationClarityWeight, socialImpactWeight,
 *   remarks
 * }
 */
export const scorePPT = async (req, res, next) => {
  try {
    const {
      eventId, teamId, submissionId,
      innovation = 0, feasibility = 0, technicalDepth = 0,
      presentationClarity = 0, socialImpact = 0,
      innovationWeight = 20, feasibilityWeight = 20,
      technicalDepthWeight = 20, presentationClarityWeight = 20,
      socialImpactWeight = 20,
      remarks,
    } = req.body;

    const adminId = req.user.id;

    // Validate weights sum to 100
    const weightSum = innovationWeight + feasibilityWeight + technicalDepthWeight +
                      presentationClarityWeight + socialImpactWeight;
    if (weightSum !== 100) {
      return res.status(400).json({ success: false, message: `Weights must sum to 100. Current sum: ${weightSum}` });
    }

    // Validate scores are between 0-10
    const scoreFields = { innovation, feasibility, technicalDepth, presentationClarity, socialImpact };
    for (const [key, val] of Object.entries(scoreFields)) {
      if (val < 0 || val > 10) {
        return res.status(400).json({ success: false, message: `${key} score must be between 0 and 10` });
      }
    }

    // Check event is in shortlisting phase
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, status, teams_to_shortlist")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (event.status !== "shortlisting") {
      return res.status(400).json({ success: false, message: `Scoring not allowed in current phase: ${event.status}` });
    }

    const scores  = { innovation, feasibility, technical_depth: technicalDepth, presentation_clarity: presentationClarity, social_impact: socialImpact };
    const weights = { innovation_weight: innovationWeight, feasibility_weight: feasibilityWeight, technical_depth_weight: technicalDepthWeight, presentation_clarity_weight: presentationClarityWeight, social_impact_weight: socialImpactWeight };
    const total_score = calcTotal(scores, weights);

    // Upsert score (admin can re-score)
    const { data: score, error } = await supabaseAdmin
      .from("ppt_scores")
      .upsert(
        {
          event_id:      eventId,
          team_id:       teamId,
          submission_id: submissionId,
          scored_by:     adminId,
          ...scores,
          ...weights,
          total_score,
          remarks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "PPT scored successfully",
      data:    { ...score, total_score },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/shortlist/leaderboard/:eventId
 * Auto leaderboard — all scored teams ranked by total score
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { data: scores, error } = await supabaseAdmin
      .from("ppt_scores")
      .select(`
        total_score, innovation, feasibility, technical_depth,
        presentation_clarity, social_impact, remarks, scored_at,
        teams ( id, team_name, leader_id,
          team_members ( status, users ( first_name, last_name, email ) )
        )
      `)
      .eq("event_id", req.params.eventId)
      .order("total_score", { ascending: false });

    if (error) throw error;

    // Add rank
    const leaderboard = scores.map((s, index) => ({ rank: index + 1, ...s }));

    // Get how many to shortlist
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("teams_to_shortlist")
      .eq("id", req.params.eventId)
      .single();

    res.status(200).json({
      success:          true,
      teams_to_shortlist: event?.teams_to_shortlist || 0,
      total_scored:     leaderboard.length,
      data:             leaderboard,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/shortlist/confirm/:eventId
 * Admin confirms shortlist — top N teams auto-selected, all notified
 */
export const confirmShortlist = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, status, teams_to_shortlist")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (event.status !== "shortlisting") {
      return res.status(400).json({ success: false, message: "Event must be in shortlisting phase" });
    }

    const n = event.teams_to_shortlist || 5;

    // Get top N scored teams
    const { data: topTeams, error } = await supabaseAdmin
      .from("ppt_scores")
      .select("team_id, total_score")
      .eq("event_id", eventId)
      .order("total_score", { ascending: false })
      .limit(n);

    if (error) throw error;
    if (!topTeams || topTeams.length === 0) {
      return res.status(400).json({ success: false, message: "No scored teams found. Please score teams first." });
    }

    // Clear previous shortlist for this event
    await supabaseAdmin.from("shortlisted_teams").delete().eq("event_id", eventId);

    // Insert shortlisted teams with rank
    const shortlistInsert = topTeams.map((t, i) => ({
      event_id: eventId,
      team_id:  t.team_id,
      rank:     i + 1,
    }));

    await supabaseAdmin.from("shortlisted_teams").insert(shortlistInsert);

    // Update event status to hackathon_active
    await supabaseAdmin
      .from("events")
      .update({ status: "hackathon_active", updated_at: new Date().toISOString() })
      .eq("id", eventId);

    // Notify ALL teams — shortlisted and rejected
    const { data: allScored } = await supabaseAdmin
      .from("ppt_scores")
      .select("team_id")
      .eq("event_id", eventId);

    const shortlistedIds = new Set(topTeams.map((t) => t.team_id));

    for (const scored of allScored) {
      const isShortlisted = shortlistedIds.has(scored.team_id);

      // Get all members of this team
      const { data: members } = await supabaseAdmin
        .from("team_members")
        .select("user_id")
        .eq("team_id", scored.team_id);

      // Get member details for email
      const { data: memberDetails } = await supabaseAdmin
        .from("team_members")
        .select("user_id, users(first_name, email)")
        .eq("team_id", scored.team_id);

      // Get team name
      const { data: teamData } = await supabaseAdmin
        .from("teams")
        .select("team_name")
        .eq("id", scored.team_id)
        .single();

      for (const member of memberDetails || []) {
        // In-app notification
        await supabaseAdmin.from("notifications").insert({
          user_id: member.user_id,
          title:   isShortlisted ? "🎉 Congratulations! You're Shortlisted!" : "📋 Shortlisting Results",
          message: isShortlisted
            ? `Your team has been shortlisted for "${event.title}"! Check your dashboard for your entry QR code.`
            : `Thank you for participating in "${event.title}". Unfortunately your team was not shortlisted this time.`,
          type: isShortlisted ? "shortlisted" : "not_shortlisted",
          data: { eventId, teamId: scored.team_id },
        });

        // Send email only to shortlisted teams
        if (isShortlisted && member.users?.email) {
          try {
            await sendShortlistEmail(member.users.email, {
              name:      member.users.first_name,
              teamName:  teamData?.team_name || "Your Team",
              eventName: event.title,
            });
          } catch (emailErr) {
            console.error(`[EMAIL] Shortlist email failed for ${member.users.email}:`, emailErr.message);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `${topTeams.length} teams shortlisted successfully! All participants have been notified.`,
      data:    shortlistInsert,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/shortlist/:eventId
 * Get shortlisted teams for an event
 */
export const getShortlistedTeams = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("shortlisted_teams")
      .select(`
        rank, shortlisted_at,
        teams (
          id, team_name,
          team_members ( status, users ( first_name, last_name, email ) )
        )
      `)
      .eq("event_id", req.params.eventId)
      .order("rank", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/shortlist/confirm-grand-finale/:eventId
 * Move current shortlisted teams to Grand Finale (replace existing grand finale list)
 */
export const confirmGrandFinale = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const now = new Date().toISOString();

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const { data: shortlisted, error: listErr } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id, rank")
      .eq("event_id", eventId)
      .order("rank", { ascending: true });

    if (listErr) throw listErr;
    if (!shortlisted || shortlisted.length === 0) {
      return res.status(400).json({ success: false, message: "No shortlisted teams. Shortlist teams first." });
    }

    await supabaseAdmin.from("grand_finale_teams").delete().eq("event_id", eventId);

    const insertRows = shortlisted.map((row, i) => ({
      event_id: eventId,
      team_id:  row.team_id,
      rank:     i + 1,
    }));
    const { error: insertErr } = await supabaseAdmin.from("grand_finale_teams").insert(insertRows);
    if (insertErr) throw insertErr;

    // Close active submission phases for this event and move to judging.
    await supabaseAdmin
      .from("events")
      .update({ status: "judging", updated_at: now })
      .eq("id", eventId);

    // Lock existing hackathon submissions to prevent further edits.
    await supabaseAdmin
      .from("hackathon_submissions")
      .update({ is_locked: true, updated_at: now })
      .eq("event_id", eventId);

    // Notify + email all moved teams (accepted members + leader).
    for (const row of shortlisted) {
      const { data: team } = await supabaseAdmin
        .from("teams")
        .select("id, team_name")
        .eq("id", row.team_id)
        .single();

      const { data: members } = await supabaseAdmin
        .from("team_members")
        .select("user_id, status, users(first_name, email)")
        .eq("team_id", row.team_id)
        .in("status", ["leader", "accepted"]);

      for (const member of members || []) {
        await supabaseAdmin.from("notifications").insert({
          user_id: member.user_id,
          title:   "🏆 Grand Finale Qualified!",
          message: `Your team "${team?.team_name || "Your Team"}" has moved to the Grand Finale for "${event.title}".`,
          type:    "grand_finale",
          data:    { eventId, teamId: row.team_id },
        });

        if (member.users?.email) {
          try {
            await sendGrandFinaleEmail(member.users.email, {
              name: member.users.first_name,
              teamName: team?.team_name || "Your Team",
              eventName: event.title,
            });
          } catch (emailErr) {
            console.error(`[EMAIL] Grand Finale email failed for ${member.users.email}:`, emailErr.message);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `${shortlisted.length} team(s) moved to Grand Finale. Participants notified and event moved to judging phase.`,
      data:    { count: shortlisted.length },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/shortlist/grand-finale/:eventId
 * Get Grand Finale teams for an event
 */
export const getGrandFinaleTeams = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("grand_finale_teams")
      .select(`
        rank, added_at,
        teams (
          id, team_name,
          team_members ( status, users ( first_name, last_name, email ) )
        )
      `)
      .eq("event_id", req.params.eventId)
      .order("rank", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};