import { supabaseAdmin } from "../config/supabase.js";

const BUCKET_MAP = {
  college_id: "college-ids",
  selfie: "selfies",
  event_banner: "event-banners",
  problem_statement: "problem-statements",
  ppt_submission: "ppt-submissions",
  qr_code: "qr-codes",
  certificate: "certificates",
};

// These buckets use public URLs (bucket must be public in Supabase)
const PUBLIC_BUCKETS = ["certificates", "qr-codes"];

const PDF_TYPES = ["problem_statement", "ppt_submission"];

export const uploadImage = async (base64String, fileType, ownerId) => {
  const bucket = BUCKET_MAP[fileType];
  if (!bucket) throw new Error(`Invalid fileType: ${fileType}`);

  const isPDF = PDF_TYPES.includes(fileType);

  // Strip base64 header if present
  const base64Data = base64String.includes(",")
    ? base64String.split(",")[1]
    : base64String;

  // Determine MIME type and extension
  let mimeType, ext;
  if (isPDF) {
    mimeType = "application/pdf";
    ext = "pdf";
  } else if (base64String.startsWith("data:image/png")) {
    mimeType = "image/png";
    ext = "png";
  } else {
    mimeType = "image/jpeg";
    ext = "jpg";
  }

  const buffer = Buffer.from(base64Data, "base64");
  const filePath = `${ownerId}/${fileType}_${Date.now()}.${ext}`;

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

export const getPublicUrl = (bucket, filePath) => {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};