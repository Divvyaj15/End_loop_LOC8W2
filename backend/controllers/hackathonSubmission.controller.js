import { supabaseAdmin } from "../config/supabase.js";
import { uploadPPT }     from "../utils/storage.js";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/hackathon-submissions
 * Team leader submits hackathon day project
 * Body: { eventId, teamId, pptBase64, githubLink, demoVideoLink?, description? }
 */
export const submitHackathonProject = async (req, res, next) => {
  try {
    const {
      eventId, teamId,
      pptBase64, githubLink,
      demoVideoLink, description,
    } = req.body;

    const userId = req.user.id;

    // 1. Check event is in hackathon_active phase
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, status")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (event.status !== "hackathon_active") {
      return res.status(400).json({
        success: false,
        message: `Hackathon submissions not open. Current phase: ${event.status}`,
      });
    }

    // 2. Verify user is team leader
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("id, leader_id, team_name")
      .eq("id", teamId)
      .eq("event_id", eventId)
      .single();

    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }
    if (team.leader_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the team leader can submit the project" });
    }

    // 3. Check if submission is locked
    const { data: existing } = await supabaseAdmin
      .from("hackathon_submissions")
      .select("is_locked")
      .eq("event_id", eventId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (existing?.is_locked) {
      return res.status(403).json({ success: false, message: "Submission has been locked by admin" });
    }

    // 4. Validate required fields
    if (!pptBase64) {
      return res.status(400).json({ success: false, message: "PPT file is required" });
    }
    if (!githubLink) {
      return res.status(400).json({ success: false, message: "GitHub link is required" });
    }

    // 5. Upload PPT
    const ppt_url = await uploadPPT(pptBase64, `hackathon/${eventId}/${teamId}`);

    // 6. Upsert submission
    const { data: submission, error } = await supabaseAdmin
      .from("hackathon_submissions")
      .upsert(
        {
          event_id:        eventId,
          team_id:         teamId,
          submitted_by:    userId,
          ppt_url,
          github_link:     githubLink,
          demo_video_link: demoVideoLink || null,
          description:     description   || null,
          submitted_at:    new Date().toISOString(),
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "event_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: existing ? "Submission updated successfully!" : "Project submitted successfully!",
      data:    submission,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/hackathon-submissions/team/:teamId
 * Team gets their own hackathon submission
 */
export const getTeamHackathonSubmission = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathon_submissions")
      .select("*")
      .eq("team_id", req.params.teamId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: "No submission found yet" });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/hackathon-submissions/judge/:eventId
 * Judge gets all submissions for their assigned teams
 */
export const getSubmissionsForJudge = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const judgeId     = req.user.id;

    // Get judge's assigned teams
    const { data: assignments } = await supabaseAdmin
      .from("judge_assignments")
      .select("team_id")
      .eq("event_id", eventId)
      .eq("judge_id", judgeId);

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const teamIds = assignments.map((a) => a.team_id);

    const { data, error } = await supabaseAdmin
      .from("hackathon_submissions")
      .select(`
        *,
        teams ( id, team_name,
          team_members ( status, users ( first_name, last_name, email ) )
        )
      `)
      .eq("event_id", eventId)
      .in("team_id", teamIds);

    if (error) throw error;

    // Attach judge score if exists
    const { data: scores } = await supabaseAdmin
      .from("judge_scores")
      .select("team_id, total_score, is_locked")
      .eq("event_id", eventId)
      .eq("judge_id", judgeId)
      .in("team_id", teamIds);

    const scoresMap = {};
    for (const s of scores || []) scoresMap[s.team_id] = s;

    const result = (data || []).map((sub) => ({
      ...sub,
      score:  scoresMap[sub.team_id] || null,
      scored: !!scoresMap[sub.team_id],
    }));

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/hackathon-submissions/event/:eventId
 * Admin gets ALL hackathon submissions for event
 */
export const getAllHackathonSubmissions = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("hackathon_submissions")
      .select(`
        *,
        teams ( id, team_name,
          team_members ( status, users ( first_name, last_name, email ) )
        ),
        users!hackathon_submissions_submitted_by_fkey ( first_name, last_name )
      `)
      .eq("event_id", req.params.eventId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * PATCH /api/hackathon-submissions/lock/:eventId
 * Admin locks all hackathon submissions (no more re-submissions)
 */
export const lockHackathonSubmissions = async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from("hackathon_submissions")
      .update({ is_locked: true, updated_at: new Date().toISOString() })
      .eq("event_id", req.params.eventId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "All hackathon submissions locked." });
  } catch (err) {
    next(err);
  }
};