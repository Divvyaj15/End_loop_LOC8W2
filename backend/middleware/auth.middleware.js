import { supabaseAdmin } from "../config/supabase.js";

/**
 * Verifies our custom base64 token from Authorization: Bearer <token>
 * Attaches full user profile from DB to req.user
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Decode our base64 token
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    } catch {
      return res.status(401).json({ success: false, message: "Invalid token format" });
    }

    if (!decoded.id || !decoded.email) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // Fetch fresh user profile from DB
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("[verifyToken]", err.message);
    return res.status(401).json({ success: false, message: "Authentication failed" });
  }
};