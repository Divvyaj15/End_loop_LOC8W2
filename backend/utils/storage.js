import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_MAP = {
  college_id: "college-ids",
  selfie: "selfies",
  event_banner: "event-banners",
  problem_statement: "problem-statements",
  ppt_submission: "ppt-submissions",         // Round 1 PPT
  hackathon_submission: "hackathon-submissions",   // Hackathon day final PPT
  qr_code: "qr-codes",
  certificate: "certificates",
};

// These buckets use public URLs (bucket must be public in Supabase)
const PUBLIC_BUCKETS = ["certificates", "qr-codes", "ppt-submissions", "hackathon-submissions"];

// Detect MIME type and extension from base64 string
const detectFileType = (base64String) => {
  if (base64String.startsWith("data:application/pdf") || base64String.includes(";base64,JVBER")) {
    return { mimeType: "application/pdf", ext: "pdf" };
  }
  if (
    base64String.startsWith("data:application/vnd.openxmlformats-officedocument.presentationml") ||
    base64String.startsWith("data:application/vnd.ms-powerpoint")
  ) {
    return {
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ext: "pptx",
    };
  }
  if (base64String.startsWith("data:image/png")) {
    return { mimeType: "image/png", ext: "png" };
  }
  if (base64String.startsWith("data:image/jpeg") || base64String.startsWith("data:image/jpg")) {
    return { mimeType: "image/jpeg", ext: "jpg" };
  }
  // Default fallback — try to detect from raw base64
  return { mimeType: "application/octet-stream", ext: "bin" };
};

export const uploadImage = async (base64String, fileType, ownerId) => {
  const bucket = BUCKET_MAP[fileType];
  if (!bucket) throw new Error(`Invalid fileType: ${fileType}`);

  // Strip base64 header if present
  const base64Data = base64String.includes(",")
    ? base64String.split(",")[1]
    : base64String;

  // Detect file type automatically
  const { mimeType, ext } = detectFileType(base64String);

  const buffer = Buffer.from(base64Data, "base64");
  const filePath = `${ownerId}/${fileType}_${Date.now()}.${ext}`;

  console.log(`[STORAGE] Uploading to ${bucket} | type: ${mimeType} | size: ${buffer.length} bytes`);

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: mimeType, upsert: true });

  if (error) throw error;

  // Public URL for public buckets
  if (PUBLIC_BUCKETS.includes(bucket)) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // Signed URL valid for 10 years for private buckets
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

  if (signedError) throw signedError;

  return signedData.signedUrl;
};

// Aliases
export const uploadPDF = (base64String, ownerId) =>
  uploadImage(base64String, "problem_statement", ownerId);

export const uploadPPT = (base64String, ownerId) =>
  uploadImage(base64String, "ppt_submission", ownerId);

export const uploadHackathonPPT = (base64String, ownerId) =>
  uploadImage(base64String, "hackathon_submission", ownerId);

export const getPublicUrl = (bucket, filePath) => {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};