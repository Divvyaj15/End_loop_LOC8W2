import { supabaseAdmin } from "../config/supabase.js";
import { uploadImage }   from "../utils/storage.js";

// ─── Helper: get user IDs based on audience ───────────────────────────────────
const getAudienceUserIds = async (eventId, audience, teamId = null) => {
  const userIds = new Set();

  if (audience === "all") {
    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id, team_members(user_id)")
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    for (const team of teams || []) {
      for (const member of team.team_members || []) {
        userIds.add(member.user_id);
      }
    }
  } else if (audience === "shortlisted") {
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id, teams(team_members(user_id))")
      .eq("event_id", eventId);

    for (const s of shortlisted || []) {
      for (const member of s.teams?.team_members || []) {
        userIds.add(member.user_id);
      }
    }
  } else if (audience === "team" && teamId) {
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .in("status", ["leader", "accepted"]);

    for (const member of members || []) {
      userIds.add(member.user_id);
    }
  }

  return [...userIds];
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/announcements
 * Admin creates announcement
 * Body: { eventId, title, message, audience, teamId?, link?, attachmentBase64?, attachmentType? }
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    const {
      eventId, title, message,
      audience = "all",
      teamId,
      link,
      attachmentBase64,
      attachmentType,
    } = req.body;

    const adminId = req.user.id;

    // Validate audience
    if (!["all", "shortlisted", "team"].includes(audience)) {
      return res.status(400).json({ success: false, message: "audience must be 'all', 'shortlisted' or 'team'" });
    }
    if (audience === "team" && !teamId) {
      return res.status(400).json({ success: false, message: "teamId is required when audience is 'team'" });
    }

    // Upload attachment if provided
    let attachment_url  = null;
    let attachment_type = null;
    if (attachmentBase64 && attachmentType) {
      const fileType  = attachmentType === "pdf" ? "problem_statement" : "event_banner";
      attachment_url  = await uploadImage(attachmentBase64, fileType, `announcements/${eventId}`);
      attachment_type = attachmentType;
    }

    // Save announcement
    const { data: announcement, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        event_id:        eventId,
        created_by:      adminId,
        title,
        message,
        link:            link || null,
        attachment_url,
        attachment_type,
        audience,
        team_id:         audience === "team" ? teamId : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Get target users
    const userIds = await getAudienceUserIds(eventId, audience, teamId);

    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Announcement saved but no users found for this audience yet.",
        data:    announcement,
      });
    }

    // Send notifications
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      title:   `📢 ${title}`,
      message,
      type:    "announcement",
      data:    { eventId, announcementId: announcement.id, link, attachment_url },
    }));

    await supabaseAdmin.from("notifications").insert(notifications);

    res.status(201).json({
      success:       true,
      message:       `Announcement sent to ${userIds.length} participant(s)`,
      data:          announcement,
      notifiedCount: userIds.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/announcements/event/:eventId
 * Get all announcements for an event
 */
export const getAnnouncementsByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const user        = req.user;

    let query = supabaseAdmin
      .from("announcements")
      .select("*, users(first_name, last_name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (user.role === "student") {
      // Check if student is shortlisted
      const { data: membership } = await supabaseAdmin
        .from("team_members")
        .select("team_id, teams!inner(event_id)")
        .eq("user_id", user.id)
        .eq("teams.event_id", eventId)
        .maybeSingle();

      const teamId = membership?.team_id;

      const { data: shortlisted } = await supabaseAdmin
        .from("shortlisted_teams")
        .select("team_id")
        .eq("event_id", eventId)
        .eq("team_id", teamId)
        .maybeSingle();

      if (shortlisted) {
        // Shortlisted: see all + team-specific
        query = query.or(`audience.eq.all,audience.eq.shortlisted,and(audience.eq.team,team_id.eq.${teamId})`);
      } else {
        // Not shortlisted: see only 'all' announcements
        query = query.eq("audience", "all");
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * DELETE /api/announcements/:announcementId
 * Admin deletes announcement
 */
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const { data: existing } = await supabaseAdmin
      .from("announcements")
      .select("id, created_by")
      .eq("id", announcementId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only delete your own announcements" });
    }

    await supabaseAdmin.from("announcements").delete().eq("id", announcementId);

    res.status(200).json({ success: true, message: "Announcement deleted" });
  } catch (err) {
    next(err);
  }
};