import { supabaseAdmin } from "../config/supabase.js";

/**
 * GET /api/notifications
 * Get all notifications for logged-in user
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const unreadCount = data.filter((n) => !n.is_read).length;

    res.status(200).json({ success: true, data, unreadCount });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", req.params.notificationId)
      .eq("user_id", req.user.id);

    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.user.id)
      .eq("is_read", false);

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};