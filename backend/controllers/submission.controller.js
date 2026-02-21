import { supabaseAdmin }  from "../config/supabase.js";
import { uploadImage }    from "../utils/storage.js";
import { syncEventStatus } from "../utils/statusSync.js";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/submissions
 * Team leader uploads PPT for their team
 * Body: { eventId, teamId, pptBase64 }
 */
export const submitPPT = async (req, res, next) => {
  try {
    const { eventId, teamId, pptBase64 } = req.body;
    const userId = req.user.id;

    // 1. Fetch and sync event status
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const syncedEvent = await syncEventStatus(event);

    if (syncedEvent.status !== "ppt_submission") {
      return res.status(400).json({
        success: false,
        message: syncedEvent.status === "registration_open"
          ? "PPT submission has not started yet. Registration is still open."
          : syncedEvent.status === "shortlisting"
          ? "PPT submission deadline has passed."
          : `PPT submission is not allowed in current event phase: ${syncedEvent.status}`,
      });
    }

    // 2. Verify user is the team leader
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("id, leader_id, status, team_name")
      .eq("id", teamId)
      .eq("event_id", eventId)
      .single();

    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found for this event" });
    }
    if (team.leader_id !== userId) {
      return res.status(403).json({ success: false, message: "Only the team leader can submit the PPT" });
    }
    if (team.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Team must be confirmed before submitting" });
    }

    // 3. Upload PPT to Supabase Storage
    const ppt_url = await uploadImage(pptBase64, "problem_statement", `submissions/${teamId}`);

    // 4. Upsert submission (insert or replace if re-uploading)
    const { data: submission, error } = await supabaseAdmin
      .from("submissions")
      .upsert(
        {
          event_id:     eventId,
          team_id:      teamId,
          uploaded_by:  userId,
          ppt_url,
          submitted_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "event_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "PPT submitted successfully!",
      data:    submission,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/submissions/event/:eventId
 * Admin gets all PPT submissions for an event
 */
export const getSubmissionsByEvent = async (req, res, next) => {
  try {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", req.params.eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Sync status before returning
    await syncEventStatus(event);

    const { data: submissions, error } = await supabaseAdmin
      .from("submissions")
      .select(`
        *,
        teams ( id, team_name, leader_id,
          team_members ( status, users ( id, first_name, last_name, email ) )
        ),
        users ( id, first_name, last_name, email )
      `)
      .eq("event_id", req.params.eventId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      count:   submissions.length,
      data:    submissions,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/submissions/team/:teamId
 * Get a team's own submission
 */
export const getTeamSubmission = async (req, res, next) => {
  try {
    const { data: submission, error } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("team_id", req.params.teamId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ success: false, message: "No submission found for this team" });
    }

    res.status(200).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/submissions/event/:eventId/problem-statement
 * Student gets problem statement URL (only visible during ppt_submission phase)
 */
export const getProblemStatement = async (req, res, next) => {
  try {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, status, problem_statement_url, ppt_submission_deadline")
      .eq("id", req.params.eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const syncedEvent = await syncEventStatus(event);

    if (!["ppt_submission", "shortlisting", "hackathon_active", "judging", "completed"].includes(syncedEvent.status)) {
      return res.status(403).json({
        success: false,
        message: "Problem statement is not available yet. It will be released when PPT submission starts.",
      });
    }

    if (!syncedEvent.problem_statement_url) {
      return res.status(404).json({ success: false, message: "Problem statement has not been uploaded yet" });
    }

    res.status(200).json({
      success: true,
      data: {
        problem_statement_url:  syncedEvent.problem_statement_url,
        ppt_submission_deadline: syncedEvent.ppt_submission_deadline,
      },
    });
  } catch (err) {
    next(err);
  }
};