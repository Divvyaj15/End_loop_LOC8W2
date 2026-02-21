import { supabaseAdmin } from "../config/supabase.js";

/**
 * Returns date-only (midnight UTC) for comparison.
 */
function toDateOnly(d) {
  const x = new Date(d);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
}

/**
 * Computes the event status that should apply based on current date and event timelines.
 * Does not change "draft" (admin-only) or "completed" (set when admin locks judge scores).
 *
 * Timeline order: registration_deadline → ppt_submission_deadline (optional) → start_date → end_date
 * - Before registration_deadline     → registration_open
 * - After reg, before PPT deadline  → ppt_submission
 * - After PPT deadline, before start→ shortlisting
 * - From start_date to end_date     → hackathon_active
 * - After end_date                  → judging
 */
function getStatusFromDates(event) {
  const now = new Date();
  const today = toDateOnly(now);
  const regDeadline = toDateOnly(event.registration_deadline);
  const pptDeadline = event.ppt_submission_deadline
    ? toDateOnly(event.ppt_submission_deadline)
    : null;
  const startDate = toDateOnly(event.start_date);
  const endDate = toDateOnly(event.end_date);

  if (today < regDeadline) return "registration_open";
  if (pptDeadline && today < pptDeadline) return "ppt_submission";
  if (today < startDate) return "shortlisting";
  if (today <= endDate) return "hackathon_active";
  return "judging";
}

/**
 * Syncs event status in the DB based on current date and event timelines.
 * Called whenever an event is fetched so status is always up to date.
 *
 * - "draft" and "completed" are never overwritten by date logic.
 * - New events are created with registration_open and then stay in sync via dates.
 */
export const syncEventStatus = async (event) => {
  if (!event || !event.id) return event;

  // Never auto-change draft (admin choice) or completed (set when admin locks judge scores)
  if (event.status === "draft" || event.status === "completed") {
    return event;
  }

  const newStatus = getStatusFromDates(event);

  if (newStatus === event.status) {
    // Notify when transitioning to ppt_submission (one-time would need a sent flag; we keep simple)
    return event;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("events")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", event.id)
    .select()
    .single();

  if (error) return event;

  // Notify teams when PPT submission phase starts
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
};
