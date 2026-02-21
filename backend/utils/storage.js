import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_MAP = {
  college_id: "college-ids",
  selfie:     "selfies",
};

/**
 * Uploads a base64 image to Supabase Storage
 * @param {string} base64String - base64 encoded image
 * @param {string} imageType    - "college_id" | "selfie"
 * @param {string} userId       - user's id (used as filename)
 * @returns {Promise<string>}   - public URL of uploaded image
 */
export const uploadImage = async (base64String, imageType, userId) => {
  const bucket = BUCKET_MAP[imageType];
  if (!bucket) throw new Error(`Invalid imageType: ${imageType}`);

  // Strip base64 header if present (e.g. "data:image/jpeg;base64,...")
  const base64Data = base64String.includes(",")
    ? base64String.split(",")[1]
    : base64String;

  // Detect mime type from header or default to jpeg
  const mimeType = base64String.startsWith("data:image/png") ? "image/png" : "image/jpeg";
  const ext      = mimeType === "image/png" ? "png" : "jpg";

  const buffer   = Buffer.from(base64Data, "base64");
  const filePath = `${userId}/${imageType}_${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType:  mimeType,
      upsert:       true,  // overwrite if re-uploading
    });

  if (error) throw error;

  // Get signed URL (valid for 10 years since these are private buckets)
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

  if (signedError) throw signedError;

  return signedData.signedUrl;
};