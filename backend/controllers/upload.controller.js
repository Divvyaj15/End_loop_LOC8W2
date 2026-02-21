import { supabaseAdmin } from "../config/supabase.js";
import { uploadImage }   from "../utils/storage.js";

/**
 * POST /api/auth/upload-image
 * Uploads college ID or selfie to Supabase Storage
 * Saves URL back to users table
 *
 * Protected: verifyToken
 * Body: { imageBase64, imageType: "college_id" | "selfie" }
 */
export const uploadUserImage = async (req, res, next) => {
  try {
    const { imageBase64, imageType } = req.body;
    const userId = req.user.id;

    if (!["college_id", "selfie"].includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: 'imageType must be "college_id" or "selfie"',
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "imageBase64 is required" });
    }

    // Upload to Supabase Storage → get URL
    const url = await uploadImage(imageBase64, imageType, userId);

    // Map imageType to DB column
    const columnMap = {
      college_id: "college_id_url",
      selfie:     "selfie_url",
    };

    // Save URL to users table
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        [columnMap[imageType]]: url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: `${imageType} uploaded successfully`,
      data:    { url },
    });
  } catch (err) {
    next(err);
  }
};