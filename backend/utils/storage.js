import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_MAP = {
  college_id:       "college-ids",
  selfie:           "selfies",
  event_banner:     "event-banners",
  problem_statement:"problem-statements",
};

/**
 * Uploads a base64 image to Supabase Storage
 * @param {string} base64String - base64 encoded file
 * @param {string} fileType     - "college_id" | "selfie" | "event_banner" | "problem_statement"
 * @param {string} ownerId      - user/event id used in file path
 * @returns {Promise<string>}   - signed URL
 */
export const uploadImage = async (base64String, fileType, ownerId) => {
  const bucket = BUCKET_MAP[fileType];
  if (!bucket) throw new Error(`Invalid fileType: ${fileType}`);

  const isPDF = fileType === "problem_statement";

  // Strip base64 header if present
  const base64Data = base64String.includes(",")
    ? base64String.split(",")[1]
    : base64String;

  const mimeType = isPDF
    ? "application/pdf"
    : base64String.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const ext      = isPDF ? "pdf" : mimeType === "image/png" ? "png" : "jpg";
  const buffer   = Buffer.from(base64Data, "base64");
  const filePath = `${ownerId}/${fileType}_${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: mimeType, upsert: true });

  if (error) throw error;

  // Signed URL valid for 10 years
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

  if (signedError) throw signedError;

  return signedData.signedUrl;
};

// Alias for PDF uploads
export const uploadPDF = (base64String, ownerId) =>
  uploadImage(base64String, "problem_statement", ownerId);