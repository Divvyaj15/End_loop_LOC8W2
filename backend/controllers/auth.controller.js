import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../config/supabase.js";
import { sendOTPEmail }  from "../utils/mailer.js";
import { encrypt }       from "../utils/encryption.js";
import { uploadImage }   from "../utils/storage.js";

const generateOTP   = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateToken = (user) => Buffer.from(
  JSON.stringify({ id: user.id, email: user.email, role: user.role, iat: Date.now() })
).toString("base64");

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register-basic
 * STEP 1 — Save basic details + send OTP
 * Body: { firstName, lastName, dob, phone, aadhaarNumber, email, password }
 */
export const registerBasic = async (req, res, next) => {
  try {
    const { firstName, lastName, dob, phone, aadhaarNumber, email, password } = req.body;

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id, otp_verified")
      .eq("email", email)
      .single();

    if (existing && existing.otp_verified) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // If user exists but OTP not verified, delete and re-register (they may be retrying)
    if (existing && !existing.otp_verified) {
      await supabaseAdmin.from("users").delete().eq("id", existing.id);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash,
        first_name:     firstName,
        last_name:      lastName,
        dob,
        phone,
        aadhaar_number: encrypt(aadhaarNumber),
        role:           "student",
      })
      .select()
      .single();

    if (error) throw error;

    // Send OTP
    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabaseAdmin.from("otps").insert({ email, otp, expires_at: expiresAt });
    await sendOTPEmail(email, otp);

    // Return temp token to use in step 2
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Basic details saved! OTP sent to your email.",
      data:    { token, email },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/verify-otp
 * STEP 1.5 — Verify OTP after basic details
 * Body: { email, otp }
 */
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const { data: record, error } = await supabaseAdmin
      .from("otps")
      .select("*")
      .eq("email", email)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !record) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });
    }
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    await supabaseAdmin.from("otps").update({ used: true }).eq("id", record.id);
    await supabaseAdmin
      .from("users")
      .update({ otp_verified: true, updated_at: new Date().toISOString() })
      .eq("email", email);

    res.status(200).json({
      success: true,
      message: "Email verified! Please upload your documents.",
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register-complete
 * STEP 2 — Upload college ID + selfie (after OTP verified)
 * Protected with token from step 1
 * Body: { collegeIdBase64, selfieBase64 }
 */
export const registerComplete = async (req, res, next) => {
  try {
    const { collegeIdBase64, selfieBase64 } = req.body;
    const userId = req.user.id;

    // Ensure OTP was verified before allowing document upload
    if (!req.user.otp_verified) {
      return res.status(403).json({ success: false, message: "Please verify your email OTP first" });
    }

    if (!collegeIdBase64) {
      return res.status(400).json({ success: false, message: "College ID image is required" });
    }
    if (!selfieBase64) {
      return res.status(400).json({ success: false, message: "Live selfie is required" });
    }

    // Upload both images
    const college_id_url = await uploadImage(collegeIdBase64, "college_id", userId);
    const selfie_url     = await uploadImage(selfieBase64,    "selfie",     userId);

    // Save URLs
    await supabaseAdmin
      .from("users")
      .update({ college_id_url, selfie_url, updated_at: new Date().toISOString() })
      .eq("id", userId);

    res.status(200).json({
      success: true,
      message: "Documents uploaded! Proceed to face verification.",
      data:    { college_id_url, selfie_url },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email" });
    }

    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabaseAdmin.from("otps").insert({ email, otp, expires_at: expiresAt });
    await sendOTPEmail(email, otp);

    res.status(200).json({ success: true, message: "OTP resent to your email" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.role === "student") {
      if (!user.otp_verified) {
        return res.status(403).json({
          success: false, message: "Please verify your email via OTP first", requiresOTP: true,
        });
      }
      if (!user.college_id_url || !user.selfie_url) {
        return res.status(403).json({
          success: false, message: "Please complete document upload to continue", requiresDocs: true,
        });
      }
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id:          user.id,
          email:       user.email,
          firstName:   user.first_name,
          lastName:    user.last_name,
          role:        user.role,
          isVerified:  user.is_verified,
          otpVerified: user.otp_verified,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/auth/me — Protected
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};