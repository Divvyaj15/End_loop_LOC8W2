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

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/submissions/final-ppt
 * Team leader uploads final PPT for shortlisted team
 * Body: { eventId, teamId, pptBase64 }
 */
export const submitFinalPPT = async (req, res, next) => {
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

    if (syncedEvent.status !== "hackathon_active") {
      return res.status(400).json({
        success: false,
        message: "Final submissions are only allowed for shortlisted teams during the hackathon active phase.",
      });
    }

    // 2. Verify team is shortlisted
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id")
      .eq("event_id", eventId)
      .eq("team_id", teamId)
      .single();

    if (!shortlisted) {
      return res.status(403).json({ success: false, message: "Only shortlisted teams can submit final presentations" });
    }

    // 3. Verify user is the team leader
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
      return res.status(403).json({ success: false, message: "Only the team leader can submit the final PPT" });
    }
    if (team.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Team must be confirmed before submitting" });
    }

    // 4. Upload final PPT to Supabase Storage
    const final_ppt_url = await uploadImage(pptBase64, "problem_statement", `final-submissions/${teamId}/ppt`);

    // 5. Upsert final submission
    const { data: submission, error } = await supabaseAdmin
      .from("final_submissions")
      .upsert(
        {
          event_id:     eventId,
          team_id:      teamId,
          uploaded_by:  userId,
          final_ppt_url,
          final_ppt_submitted_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "event_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Final PPT submitted successfully!",
      data:    submission,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/submissions/final-github
 * Team leader uploads GitHub link for shortlisted team
 * Body: { eventId, teamId, githubBase64 }
 */
export const submitFinalGitHub = async (req, res, next) => {
  try {
    const { eventId, teamId, githubBase64 } = req.body;
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

    if (syncedEvent.status !== "hackathon_active") {
      return res.status(400).json({
        success: false,
        message: "Final submissions are only allowed for shortlisted teams during the hackathon active phase.",
      });
    }

    // 2. Verify team is shortlisted
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id")
      .eq("event_id", eventId)
      .eq("team_id", teamId)
      .single();

    if (!shortlisted) {
      return res.status(403).json({ success: false, message: "Only shortlisted teams can submit GitHub links" });
    }

    // 3. Verify user is the team leader
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
      return res.status(403).json({ success: false, message: "Only the team leader can submit the GitHub link" });
    }
    if (team.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Team must be confirmed before submitting" });
    }

    // 4. Extract GitHub URL from base64 content
    let github_url;
    try {
      const decoded = Buffer.from(githubBase64.split(',')[1], 'base64').toString('utf-8');
      github_url = decoded.trim();
      
      // Validate GitHub URL
      if (!github_url.includes('github.com')) {
        return res.status(400).json({ success: false, message: "Please provide a valid GitHub repository URL" });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid GitHub link file format" });
    }

    // 5. Upload GitHub file to Supabase Storage (for record keeping)
    const github_file_url = await uploadImage(githubBase64, "problem_statement", `final-submissions/${teamId}/github`);

    // 6. Upsert final submission
    const { data: submission, error } = await supabaseAdmin
      .from("final_submissions")
      .upsert(
        {
          event_id:     eventId,
          team_id:      teamId,
          uploaded_by:  userId,
          github_url,
          github_file_url,
          github_submitted_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "event_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "GitHub link submitted successfully!",
      data:    submission,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/submissions/final-video
 * Team leader uploads demo video for shortlisted team
 * Body: { eventId, teamId, videoBase64 }
 */
export const submitFinalVideo = async (req, res, next) => {
  try {
    const { eventId, teamId, videoBase64 } = req.body;
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

    if (syncedEvent.status !== "hackathon_active") {
      return res.status(400).json({
        success: false,
        message: "Final submissions are only allowed for shortlisted teams during the hackathon active phase.",
      });
    }

    // 2. Verify team is shortlisted
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id")
      .eq("event_id", eventId)
      .eq("team_id", teamId)
      .single();

    if (!shortlisted) {
      return res.status(403).json({ success: false, message: "Only shortlisted teams can submit demo videos" });
    }

    // 3. Verify user is the team leader
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
      return res.status(403).json({ success: false, message: "Only the team leader can submit the demo video" });
    }
    if (team.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Team must be confirmed before submitting" });
    }

    // 4. Upload demo video to Supabase Storage
    const demo_video_url = await uploadImage(videoBase64, "problem_statement", `final-submissions/${teamId}/video`);

    // 5. Upsert final submission
    const { data: submission, error } = await supabaseAdmin
      .from("final_submissions")
      .upsert(
        {
          event_id:     eventId,
          team_id:      teamId,
          uploaded_by:  userId,
          demo_video_url,
          demo_video_submitted_at: new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        },
        { onConflict: "event_id,team_id" }
      )
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Demo video submitted successfully!",
      data:    submission,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/submissions/final/:teamId
 * Get a team's final submission
 */
export const getFinalSubmission = async (req, res, next) => {
  try {
    const { data: submission, error } = await supabaseAdmin
      .from("final_submissions")
      .select("*")
      .eq("team_id", req.params.teamId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ success: false, message: "No final submission found for this team" });
    }

    res.status(200).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};