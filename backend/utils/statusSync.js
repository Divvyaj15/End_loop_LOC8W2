import { supabaseAdmin } from "../config/supabase.js";

/**
 * Checks and auto-updates event status based on current date
 * Called whenever an event is fetched
 *
 * Status flow:
 * draft → registration_open → ppt_submission → shortlisting → completed
 */
export const syncEventStatus = async (event) => {
  const now      = new Date();
  const regDeadline = new Date(event.registration_deadline);
  const pptDeadline = event.ppt_submission_deadline
    ? new Date(event.ppt_submission_deadline)
    : null;

  let newStatus = event.status;

  // Skip manual statuses
  if (["draft", "hackathon_active", "judging", "completed", "disqualified"].includes(event.status)) {
    return event;
  }

  if (pptDeadline && now > pptDeadline && event.status === "ppt_submission") {
    newStatus = "shortlisting";
  } else if (now > regDeadline && event.status === "registration_open") {
    newStatus = "ppt_submission";
  }

  if (newStatus !== event.status) {
    const { data: updated } = await supabaseAdmin
      .from("events")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", event.id)
      .select()
      .single();

    // Notify all teams in this event when PPT submission starts
    if (newStatus === "ppt_submission") {
      const { data: teams } = await supabaseAdmin
        .from("teams")
        .select("id, team_members(user_id)")
        .eq("event_id", event.id)
        .eq("status", "confirmed");

      for (const team of teams || []) {
        for (const member of team.team_members || []) {
          await supabaseAdmin.from("notifications").insert({
            user_id: member.user_id,
            title:   "📋 PPT Submission Open!",
            message: `PPT submission has started for "${event.title}". Upload your presentation before the deadline.`,
            type:    "ppt_open",
            data:    { eventId: event.id },
          });
        }
      }
    }

    return updated || event;
  }

  return event;
};