import { supabaseAdmin } from "../config/supabase.js";

// ─── Normalize token (trim, strip non-hex, lowercase) ─────────────────────────
function normalizeFoodToken(raw) {
  if (raw == null || typeof raw !== "string") return null;
  let token = String(raw).trim();
  const hexOnly = token.replace(/[^0-9a-fA-F]/g, "");
  if (hexOnly.length > 0) token = hexOnly;
  return token ? token.toLowerCase() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/food-qr/my-meals/:eventId
 * Student gets all their food QRs for an event
 */
export const getMyFoodQRs = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("food_qrs")
      .select("meal_type, qr_image_url, qr_token, is_used, scanned_at")
      .eq("event_id", req.params.eventId)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "No food QRs found. Entry QRs may not be generated yet." });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/food-qr/lookup
 * Admin looks up meal QR by token — returns student/meal without marking used
 */
export const lookupFoodQR = async (req, res, next) => {
  try {
    const rawToken = req.body?.qrToken ?? req.body?.token;
    const qrToken = normalizeFoodToken(rawToken);
    if (!qrToken) {
      return res.status(400).json({ success: false, message: "QR token is required" });
    }

    const selectFields = "id, event_id, team_id, user_id, meal_type, qr_token, is_used, scanned_at, users!food_qrs_user_id_fkey(first_name, last_name, email, college), teams(team_name)";
    let { data: qr, error } = await supabaseAdmin
      .from("food_qrs")
      .select(selectFields)
      .eq("qr_token", qrToken)
      .maybeSingle();

    if ((error || !qr) && /^[0-9a-f]+$/.test(qrToken) && qrToken.length >= 32 && qrToken.length < 64) {
      const { data: rows } = await supabaseAdmin
        .from("food_qrs")
        .select(selectFields)
        .like("qr_token", `${qrToken}%`)
        .limit(2);
      if (rows && rows.length === 1) {
        qr = rows[0];
        error = null;
      }
    }

    if (error || !qr) {
      return res.status(404).json({ success: false, message: "Invalid or already used QR code" });
    }
    if (qr.is_used) {
      return res.status(409).json({
        success: false,
        message: `${qr.meal_type} already claimed`,
        data: {
          student: `${qr.users?.first_name ?? ""} ${qr.users?.last_name ?? ""}`.trim(),
          team: qr.teams?.team_name,
          meal: qr.meal_type,
          scanned_at: qr.scanned_at,
        },
      });
    }

    const u = qr.users;
    const t = qr.teams;
    res.status(200).json({
      success: true,
      data: {
        student: (u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : null) || "—",
        email: u?.email ?? null,
        college: u?.college ?? null,
        team: t?.team_name ?? "—",
        meal: qr.meal_type,
        user_id: qr.user_id,
        event_id: qr.event_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/food-qr/scan
 * Admin scans a food QR at meal counter
 * Body: { qrToken } or { token }
 */
export const scanFoodQR = async (req, res, next) => {
  try {
    const rawToken = req.body?.qrToken ?? req.body?.token;
    const qrToken = normalizeFoodToken(rawToken);
    const adminId = req.user.id;

    if (!qrToken) {
      return res.status(400).json({ success: false, message: "QR token is required" });
    }

    const selectFields = "*, users!food_qrs_user_id_fkey(first_name, last_name, email, college), teams(team_name)";
    let { data: qr, error } = await supabaseAdmin
      .from("food_qrs")
      .select(selectFields)
      .eq("qr_token", qrToken)
      .maybeSingle();

    if ((error || !qr) && /^[0-9a-f]+$/.test(qrToken) && qrToken.length >= 32 && qrToken.length < 64) {
      const { data: rows } = await supabaseAdmin
        .from("food_qrs")
        .select(selectFields)
        .like("qr_token", `${qrToken}%`)
        .limit(2);
      if (rows && rows.length === 1) {
        qr = rows[0];
        error = null;
      }
    }

    if (error) throw error;
    if (!qr) {
      return res.status(404).json({ success: false, message: "Invalid QR code" });
    }

    if (qr.is_used) {
      return res.status(409).json({
        success: false,
        message: `${qr.meal_type} QR already used!`,
        data: {
          student:    `${qr.users.first_name} ${qr.users.last_name}`,
          team:       qr.teams.team_name,
          meal:       qr.meal_type,
          scanned_at: qr.scanned_at,
        },
      });
    }

    const now = new Date().toISOString();
    const tokenToUpdate = qr.qr_token || qrToken;
    await supabaseAdmin
      .from("food_qrs")
      .update({ is_used: true, scanned_at: now, scanned_by: adminId, qr_image_url: null })
      .eq("qr_token", tokenToUpdate);

    // Delete food QR image from storage
    if (qr.qr_image_url) {
      const path = qr.qr_image_url.split("/qr-codes/")[1]?.split("?")[0];
      if (path) await supabaseAdmin.storage.from("qr-codes").remove([decodeURIComponent(path)]);
    }

    res.status(200).json({
      success: true,
      message: `✅ ${qr.meal_type} fulfilled for ${qr.users.first_name}`,
      data: {
        student:    `${qr.users.first_name} ${qr.users.last_name}`,
        email:      qr.users.email,
        college:    qr.users.college,
        team:       qr.teams.team_name,
        meal:       qr.meal_type,
        scanned_at: now,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/food-qr/report/:eventId
 * Admin gets full meal consumption report
 */
export const getFoodReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("meals")
      .eq("id", eventId)
      .single();

    const meals = event?.meals || [];

    const { data, error } = await supabaseAdmin
      .from("food_qrs")
      .select("meal_type, is_used, scanned_at, users!food_qrs_user_id_fkey(first_name, last_name, email), teams(team_name)")
      .eq("event_id", eventId)
      .order("meal_type", { ascending: true });

    if (error) throw error;

    const summary = {};
    for (const meal of meals) {
      const mealQRs = data.filter((q) => q.meal_type === meal);
      summary[meal] = {
        total:    mealQRs.length,
        consumed: mealQRs.filter((q) => q.is_used).length,
        pending:  mealQRs.filter((q) => !q.is_used).length,
      };
    }

    res.status(200).json({ success: true, summary, data });
  } catch (err) {
    next(err);
  }
};