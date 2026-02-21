import { supabaseAdmin } from "../config/supabase.js";
import { uploadImage }   from "../utils/storage.js";

// ─── Helper: get user IDs based on audience ───────────────────────────────────
const getAudienceUserIds = async (eventId, audience) => {
  const userIds = new Set();

  if (audience === "all") {
    // All confirmed teams for this event
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
    // Only shortlisted team members
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id, teams(team_members(user_id))")
      .eq("event_id", eventId);

    for (const s of shortlisted || []) {
      for (const member of s.teams?.team_members || []) {
        userIds.add(member.user_id);
      }
    }
  }

  return [...userIds];
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/announcements
 * Admin creates an announcement for an event
 * Body: { eventId, title, message, audience, link, attachmentBase64, attachmentType }
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    const {
      eventId, title, message,
      audience = "all",
      link,
      attachmentBase64,
      attachmentType,   // 'image' | 'pdf'
    } = req.body;

    const adminId = req.user.id;

    // Validate audience
    if (!["all", "shortlisted"].includes(audience)) {
      return res.status(400).json({ success: false, message: "audience must be 'all' or 'shortlisted'" });
    }

    // Upload attachment if provided
    let attachment_url  = null;
    let attachment_type = null;
    if (attachmentBase64 && attachmentType) {
      const fileType      = attachmentType === "pdf" ? "problem_statement" : "event_banner";
      attachment_url      = await uploadImage(attachmentBase64, fileType, `announcements/${eventId}`);
      attachment_type     = attachmentType;
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
      })
      .select()
      .single();

    if (error) throw error;

    // Get target user IDs
    const userIds = await getAudienceUserIds(eventId, audience);

    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Announcement saved but no users found for this audience yet.",
        data:    announcement,
      });
    }

    // Send notification to all target users
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      title:   `📢 ${title}`,
      message,
      type:    "announcement",
      data:    { eventId, announcementId: announcement.id, link, attachment_url },
    }));

    await supabaseAdmin.from("notifications").insert(notifications);

    res.status(201).json({
      success:    true,
      message:    `Announcement sent to ${userIds.length} participants`,
      data:       announcement,
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
 * Students see only announcements relevant to them
 * Admin sees all
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

    // Students only see announcements meant for them
    if (user.role === "student") {
      // Check if student is shortlisted
      const { data: shortlisted } = await supabaseAdmin
        .from("shortlisted_teams")
        .select("team_id, teams!inner(team_members!inner(user_id))")
        .eq("event_id", eventId)
        .eq("teams.team_members.user_id", user.id)
        .maybeSingle();

      if (shortlisted) {
        // Shortlisted students see all announcements
        query = query.in("audience", ["all", "shortlisted"]);
      } else {
        // Non-shortlisted students see only 'all' announcements
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
 * Admin deletes an announcement
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