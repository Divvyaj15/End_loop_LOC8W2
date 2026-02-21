import { supabaseAdmin }                    from "../config/supabase.js";
import { generateQRToken, generateQRImage } from "../utils/qrGenerator.js";
import { uploadImage }                      from "../utils/storage.js";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/qr/generate/:eventId
 * Admin generates entry QRs + food QRs for all shortlisted team members
 */
export const generateEntryQRs = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, status, meals")
      .eq("id", eventId)
      .single();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (event.status !== "hackathon_active") {
      return res.status(400).json({ success: false, message: "QRs can only be generated after shortlisting is confirmed" });
    }

    const meals = event.meals || [];

    const { data: shortlisted } = await supabaseAdmin
      .from("shortlisted_teams")
      .select("team_id")
      .eq("event_id", eventId);

    if (!shortlisted || shortlisted.length === 0) {
      return res.status(400).json({ success: false, message: "No shortlisted teams found" });
    }

    let totalEntryGenerated = 0;
    let totalFoodGenerated  = 0;

    for (const { team_id } of shortlisted) {
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
        // ── Entry QR ────────────────────────────────────────────────────────
        const { data: existingEntry } = await supabaseAdmin
          .from("entry_qrs")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", member.user_id)
          .maybeSingle();

        if (!existingEntry) {
          const qr_token     = generateQRToken(member.user_id, eventId);
          const qrBase64     = await generateQRImage(qr_token);
          const qr_image_url = await uploadImage(qrBase64, "qr_code", `${eventId}/${member.user_id}`);

          await supabaseAdmin.from("entry_qrs").insert({
            event_id: eventId, team_id, user_id: member.user_id, qr_token, qr_image_url,
          });

          // Notify member
          await supabaseAdmin.from("notifications").insert({
            user_id: member.user_id,
            title:   "🎟️ Your Entry QR is Ready!",
            message: `Your entry QR for "${event.title}" has been generated. Show this QR at the gate on event day.`,
            type:    "entry_qr",
            data:    { eventId },
          });

          totalEntryGenerated++;
        }

        // ── Food QRs (one per meal) ──────────────────────────────────────────
        for (const meal of meals) {
          const { data: existingFood } = await supabaseAdmin
            .from("food_qrs")
            .select("id")
            .eq("event_id", eventId)
            .eq("user_id", member.user_id)
            .eq("meal_type", meal)
            .maybeSingle();

          if (!existingFood) {
            const food_token     = generateQRToken(`${member.user_id}-${meal}`, eventId);
            const foodQrBase64   = await generateQRImage(food_token);
            const food_image_url = await uploadImage(foodQrBase64, "qr_code", `${eventId}/food/${member.user_id}`);

            await supabaseAdmin.from("food_qrs").insert({
              event_id:    eventId,
              team_id,
              user_id:     member.user_id,
              meal_type:   meal,
              qr_token:    food_token,
              qr_image_url: food_image_url,
            });

            totalFoodGenerated++;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Entry QRs and food QRs generated successfully`,
      data:    { totalEntryGenerated, totalFoodGenerated, mealsConfigured: meals },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/qr/my-qr/:eventId
 * Student gets their own entry QR
 */
export const getMyQR = async (req, res, next) => {
  try {
    const { data: qr, error } = await supabaseAdmin
      .from("entry_qrs")
      .select("qr_token, qr_image_url, is_used, scanned_at, teams(team_name)")
      .eq("event_id", req.params.eventId)
      .eq("user_id", req.user.id)
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
 * Admin scans entry QR at gate
 */
export const scanEntryQR = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    const adminId     = req.user.id;

    const { data: qr, error } = await supabaseAdmin
      .from("entry_qrs")
      .select("*, users!entry_qrs_user_id_fkey(id, first_name, last_name, email, college), teams(id, team_name)")
      .eq("qr_token", qrToken)
      .single();

    if (error || !qr) {
      return res.status(404).json({ success: false, message: "Invalid QR code" });
    }

    if (qr.is_used) {
      return res.status(409).json({
        success:    false,
        message:    "QR already scanned!",
        data: {
          student:    `${qr.users.first_name} ${qr.users.last_name}`,
          team:       qr.teams.team_name,
          scanned_at: qr.scanned_at,
        },
      });
    }

    const now = new Date().toISOString();

    await supabaseAdmin
      .from("entry_qrs")
      .update({ is_used: true, scanned_at: now, scanned_by: adminId, qr_image_url: null })
      .eq("qr_token", qrToken);

    // Delete QR image from storage
    if (qr.qr_image_url) {
      const path = qr.qr_image_url.split("/qr-codes/")[1]?.split("?")[0];
      if (path) await supabaseAdmin.storage.from("qr-codes").remove([decodeURIComponent(path)]);
    }

    // Update team attendance
    const { data: attendance } = await supabaseAdmin
      .from("team_attendance")
      .select("*")
      .eq("event_id", qr.event_id)
      .eq("team_id", qr.team_id)
      .single();

    const newScanned   = (attendance?.members_scanned || 0) + 1;
    const totalMembers = attendance?.total_members || 1;
    const isReported   = newScanned >= totalMembers;

    await supabaseAdmin
      .from("team_attendance")
      .update({ members_scanned: newScanned, is_reported: isReported, reported_at: isReported ? now : null, updated_at: now })
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
 * Admin gets full attendance report
 */
export const getAttendance = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("team_attendance")
      .select(`
        members_scanned, total_members, is_reported, reported_at,
        teams ( id, team_name,
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