import { supabaseAdmin }              from "../config/supabase.js";
import { EVENT_STATUS }               from "../models/event.model.js";
import { uploadImage, uploadPDF }     from "../utils/storage.js";
import { syncEventStatus }            from "../utils/statusSync.js";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/events
 * Admin creates a new event
 */
export const createEvent = async (req, res, next) => {
  try {
    const {
      title, description, category, committeeName,
      startDate, endDate, registrationDeadline,
      pptSubmissionDeadline,
      eventStartTime, eventEndTime,
      minTeamSize, maxTeamSize, allowIndividual,
      mode, venue,
      firstPrize, secondPrize, thirdPrize,
      entryFee, isFree,
      rules,
      bannerBase64,
      meals,
      teamsToShortlist,
    } = req.body;

    const adminId = req.user.id;

    // category: single from schema; if array sent (multi-domain), use first
    const categoryValue = Array.isArray(category) ? category[0] : category;

    // Upload banner image if provided
    let banner_url = null;
    if (bannerBase64) {
      banner_url = await uploadImage(bannerBase64, "event_banner", adminId);
    }

    const needsVenue = mode === "offline" || mode === "hybrid";
    // DB column mode is TEXT[]; always send an array
    const modeSingle = mode === "hybrid" ? "offline" : (mode || "offline");
    const modeArray = mode === "hybrid" ? ["offline", "online"] : [modeSingle];

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        description,
        category:                  categoryValue,
        committee_name:            committeeName,
        created_by:                adminId,
        start_date:                startDate,
        end_date:                  endDate,
        registration_deadline:     registrationDeadline,
        event_start_time:          eventStartTime,
        event_end_time:            eventEndTime,
        min_team_size:            minTeamSize || 1,
        max_team_size:            maxTeamSize || 4,
        allow_individual:         allowIndividual ?? true,
        mode:                      modeArray,
        venue:                     needsVenue ? venue : null,
        first_prize:               firstPrize  || 0,
        second_prize:              secondPrize || 0,
        third_prize:               thirdPrize  || 0,
        entry_fee:                 entryFee    || 0,
        is_free:                   isFree      ?? true,
        rules:                     rules       || [],
        banner_url,
        status:                    EVENT_STATUS.REGISTRATION_OPEN,
        ppt_submission_deadline:   pptSubmissionDeadline || null,
        meals:                     Array.isArray(meals) ? meals : (meals ? [meals] : []),
        teams_to_shortlist:        teamsToShortlist != null ? Number(teamsToShortlist) : 5,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data:    event,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/events
 * Public — all non-draft events
 * Query params: ?category=web_dev&mode=offline&status=registration_open
 */
export const getAllEvents = async (req, res, next) => {
  try {
    const { category, mode, status } = req.query;

    let query = supabaseAdmin
      .from("events")
      .select("id, title, description, category, committee_name, start_date, end_date, registration_deadline, mode, venue, entry_fee, is_free, first_prize, second_prize, third_prize, min_team_size, max_team_size, allow_individual, banner_url, status, created_at")
      .neq("status", EVENT_STATUS.DRAFT)
      .order("start_date", { ascending: true });

    if (category) query = query.eq("category", category);
    if (mode)     query = query.contains("mode", [mode]);

    const { data: events, error } = await query;
    if (error) throw error;

    const synced = await Promise.all((events || []).map((e) => syncEventStatus(e)));
    const filtered = status
      ? synced.filter((e) => e.status === status)
      : synced;
    res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/events/admin
 * Admin — all events created by this admin
 */
export const getAdminEvents = async (req, res, next) => {
  try {
    const { data: events, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("created_by", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const synced = await Promise.all((events || []).map((e) => syncEventStatus(e)));
    res.status(200).json({ success: true, data: synced });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/events/:eventId
 * Public — single event details
 */
export const getEventById = async (req, res, next) => {
  try {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", req.params.eventId)
      .single();

    if (error || !event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const synced = await syncEventStatus(event);
    res.status(200).json({ success: true, data: synced });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * PATCH /api/events/:eventId
 * Admin updates event details or status
 */
export const updateEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Ensure event belongs to this admin
    const { data: existing } = await supabaseAdmin
      .from("events")
      .select("id, created_by")
      .eq("id", eventId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only update your own events" });
    }

    const allowed = [
      "title", "description", "category", "committee_name",
      "start_date", "end_date", "registration_deadline",
      "event_start_time", "event_end_time",
      "min_team_size", "max_team_size", "allow_individual",
      "mode", "venue", "first_prize", "second_prize", "third_prize",
      "entry_fee", "is_free", "rules", "status",
      "meals", "ppt_submission_deadline", "teams_to_shortlist",
    ];

    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach((key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      if (req.body[camelKey] !== undefined) updates[key] = req.body[camelKey];
      if (req.body[key]      !== undefined) updates[key] = req.body[key];
    });
    // mode column is TEXT[]; ensure we never send a string
    if (typeof updates.mode === "string") {
      updates.mode = [updates.mode];
    } else if (Array.isArray(updates.mode) && updates.mode.some((m) => typeof m !== "string")) {
      updates.mode = updates.mode.map((m) => (m === "hybrid" ? "offline" : String(m)));
    }

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, message: "Event updated", data: event });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/events/:eventId/problem-statement
 * Admin uploads problem statement PDF (separate step after event creation)
 * Body: { pdfBase64 }
 */
export const uploadProblemStatement = async (req, res, next) => {
  try {
    const { eventId }   = req.params;
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, message: "pdfBase64 is required" });
    }

    // Ensure event belongs to this admin
    const { data: existing } = await supabaseAdmin
      .from("events")
      .select("id, created_by")
      .eq("id", eventId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only update your own events" });
    }

    // Upload PDF to Supabase Storage
    const url = await uploadPDF(pdfBase64, eventId);

    await supabaseAdmin
      .from("events")
      .update({ problem_statement_url: url, updated_at: new Date().toISOString() })
      .eq("id", eventId);

    res.status(200).json({
      success: true,
      message: "Problem statement uploaded successfully",
      data:    { problem_statement_url: url },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * DELETE /api/events/:eventId
 * Admin deletes an event (only if in draft status)
 */
export const deleteEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const { data: existing } = await supabaseAdmin
      .from("events")
      .select("id, created_by, status")
      .eq("id", eventId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (existing.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only delete your own events" });
    }
    if (existing.status !== EVENT_STATUS.DRAFT) {
      return res.status(400).json({ success: false, message: "Only draft events can be deleted" });
    }

    await supabaseAdmin.from("events").delete().eq("id", eventId);

    res.status(200).json({ success: true, message: "Event deleted" });
  } catch (err) {
    next(err);
  }
};