import { supabaseAdmin }              from "../config/supabase.js";
import { generateQRToken, generateQRImage } from "../utils/qrGenerator.js";
import { uploadImage }                from "../utils/storage.js";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/qr/generate/:eventId
 * Admin generates entry QRs for all shortlisted team members
 */
export const generateEntryQRs = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Check event exists and is in hackathon_active phase
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, status")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (event.status !== "hackathon_active") {
      return res.status(400).json({ success: false, message: "QRs can only be generated after shortlisting is confirmed" });
    }

    // Get all shortlisted teams
    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id")
      .eq("event_id", eventId);

    if (!shortlisted || shortlisted.length === 0) {
      return res.status(400).json({ success: false, message: "No shortlisted teams found" });
    }

    let totalGenerated = 0;

    for (const { team_id } of shortlisted) {
      // Get all confirmed members of this team
      const { data: members } = await supabaseAdmin
        .from("team_members")
        .select("user_id, users(first_name, last_name, email)")
        .eq("team_id", team_id)
        .in("status", ["leader", "accepted"]);

      const totalMembers = members.length;

      // Upsert team attendance record
      await supabaseAdmin
        .from("team_attendance")
        .upsert(
          { event_id: eventId, team_id, total_members: totalMembers, members_scanned: 0, is_reported: false },
          { onConflict: "event_id,team_id" }
        );

      for (const member of members) {
        // Check if QR already exists for this member
        const { data: existing } = await supabaseAdmin
          .from("entry_qrs")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", member.user_id)
          .single();

        if (existing) continue; // Skip if already generated

        // Generate unique token + QR image
        const qr_token    = generateQRToken(member.user_id, eventId);
        const qrBase64    = await generateQRImage(qr_token);

        // Upload QR image to Supabase Storage
        const qr_image_url = await uploadImage(qrBase64, "qr_code", `${eventId}/${member.user_id}`);

        // Save to DB
        await supabaseAdmin.from("entry_qrs").insert({
          event_id:    eventId,
          team_id,
          user_id:     member.user_id,
          qr_token,
          qr_image_url,
        });

        // Send notification to member with QR
        await supabaseAdmin.from("notifications").insert({
          user_id: member.user_id,
          title:   "🎟️ Your Entry QR is Ready!",
          message: `Your entry QR for "${event.title}" has been generated. Show this QR at the gate on event day.`,
          type:    "entry_qr",
          data:    { eventId, qr_token },
        });

        totalGenerated++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Entry QRs generated for ${totalGenerated} participants`,
      data:    { totalGenerated },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/qr/my-qr/:eventId
 * Student gets their own entry QR for an event
 */
export const getMyQR = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId      = req.user.id;

    const { data: qr, error } = await supabaseAdmin
      .from("entry_qrs")
      .select(`
        qr_token, qr_image_url, is_used, scanned_at,
        teams ( team_name )
      `)
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (error || !qr) {
      return res.status(404).json({ success: false, message: "Entry QR not found. You may not be shortlisted yet." });
    }

    res.status(200).json({ success: true, data: qr });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/qr/scan
 * Admin scans a member's QR at gate
 * Body: { qrToken }
 */
export const scanEntryQR = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    const adminId     = req.user.id;

    if (!qrToken || typeof qrToken !== "string" || qrToken.trim() === "") {
      return res.status(400).json({ success: false, message: "QR token is required" });
    }

    const trimmedToken = qrToken.trim();

    // First, find QR record without joins to avoid join-related errors
    const { data: qrBase, error: qrError } = await supabaseAdmin
      .from("entry_qrs")
      .select("*")
      .eq("qr_token", trimmedToken)
      .maybeSingle();

    if (qrError) {
      console.error("[scanEntryQR] Database error fetching QR:", qrError);
      return res.status(500).json({ 
        success: false, 
        message: "Database error occurred",
        details: qrError.message 
      });
    }

    if (!qrBase) {
      return res.status(404).json({ success: false, message: "Invalid QR code" });
    }

    // Now fetch related user and team data separately
    const [userResult, teamResult] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email, college")
        .eq("id", qrBase.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("teams")
        .select("id, team_name")
        .eq("id", qrBase.team_id)
        .maybeSingle()
    ]);

    // Combine the data
    const qr = {
      ...qrBase,
      users: userResult.data || null,
      teams: teamResult.data || null
    };

    // Check if critical relationships are missing
    if (!qr.users) {
      console.error("[scanEntryQR] User not found for user_id:", qrBase.user_id);
      return res.status(500).json({ 
        success: false, 
        message: "User data not found for this QR code" 
      });
    }

    if (!qr.teams) {
      console.error("[scanEntryQR] Team not found for team_id:", qrBase.team_id);
      return res.status(500).json({ 
        success: false, 
        message: "Team data not found for this QR code" 
      });
    }

    // Prevent duplicate scan
    if (qr.is_used) {
      return res.status(409).json({
        success:    false,
        message:    "QR already scanned!",
        scanned_at: qr.scanned_at,
        data: {
          student:   `${qr.users.first_name} ${qr.users.last_name}`,
          team:      qr.teams.team_name,
          scanned_at: qr.scanned_at,
        },
      });
    }

    const now = new Date().toISOString();

    // Mark QR as used
    await supabaseAdmin
      .from("entry_qrs")
      .update({ is_used: true, scanned_at: now, scanned_by: adminId })
      .eq("qr_token", trimmedToken);

    // Update team attendance
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from("team_attendance")
      .select("*")
      .eq("event_id", qr.event_id)
      .eq("team_id", qr.team_id)
      .maybeSingle();

    if (attendanceError) {
      console.error("[scanEntryQR] Error fetching team attendance:", attendanceError);
      // Continue anyway - we'll use defaults
    }

    const newScanned    = (attendance?.members_scanned || 0) + 1;
    const totalMembers  = attendance?.total_members || 1;
    const isReported    = newScanned >= totalMembers;

    await supabaseAdmin
      .from("team_attendance")
      .update({
        members_scanned: newScanned,
        is_reported:     isReported,
        reported_at:     isReported ? now : null,
        updated_at:      now,
      })
      .eq("event_id", qr.event_id)
      .eq("team_id",  qr.team_id);

    res.status(200).json({
      success: true,
      message: isReported
        ? `✅ Full team "${qr.teams.team_name}" has reported!`
        : `✅ Member checked in (${newScanned}/${totalMembers})`,
      data: {
        student:         `${qr.users.first_name} ${qr.users.last_name}`,
        email:           qr.users.email,
        college:         qr.users.college,
        team:            qr.teams.team_name,
        scanned_at:      now,
        members_scanned: newScanned,
        total_members:   totalMembers,
        team_reported:   isReported,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/qr/attendance/:eventId
 * Admin gets full attendance report for an event
 */
export const getAttendance = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("team_attendance")
      .select(`
        members_scanned, total_members, is_reported, reported_at,
        teams (
          id, team_name,
          team_members ( status, users ( first_name, last_name, email ) )
        )
      `)
      .eq("event_id", req.params.eventId)
      .order("is_reported", { ascending: false });

    if (error) throw error;

    const totalTeams    = data.length;
    const reportedTeams = data.filter((t) => t.is_reported).length;

    res.status(200).json({
      success: true,
      summary: { totalTeams, reportedTeams, pendingTeams: totalTeams - reportedTeams },
      data,
    });
  } catch (err) {
    next(err);
  }
};