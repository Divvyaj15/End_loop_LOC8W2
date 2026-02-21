import { supabaseAdmin } from "../config/supabase.js";

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
 * POST /api/food-qr/scan
 * Admin scans a food QR at meal counter
 * Body: { qrToken }
 */
export const scanFoodQR = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    const adminId     = req.user.id;

    console.log("[FOOD QR SCAN] Token received:", qrToken);
    console.log("[FOOD QR SCAN] Token length:", qrToken?.length);

    // First check if token exists at all
    const { data: allQrs } = await supabaseAdmin
      .from("food_qrs")
      .select("qr_token")
      .limit(3);
    console.log("[FOOD QR SCAN] Sample tokens in DB:", allQrs?.map(q => q.qr_token?.substring(0, 20)));

    const { data: qr, error } = await supabaseAdmin
      .from("food_qrs")
      .select("*, users!food_qrs_user_id_fkey(first_name, last_name, email, college), teams(team_name)")
      .eq("qr_token", qrToken)
      .maybeSingle();

    console.log("[FOOD QR SCAN] DB result:", qr ? "FOUND" : "NOT FOUND");
    console.log("[FOOD QR SCAN] DB error:", error?.message);

    if (error) throw error;

    if (!qr) {
      return res.status(404).json({ success: false, message: "Invalid QR code" });
    }

    // Prevent duplicate scan
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

    await supabaseAdmin
      .from("food_qrs")
      .update({ is_used: true, scanned_at: now, scanned_by: adminId, qr_image_url: null })
      .eq("qr_token", qrToken);

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