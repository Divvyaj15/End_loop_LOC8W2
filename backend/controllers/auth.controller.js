import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../config/supabase.js";
import { sendOTPEmail } from "../utils/mailer.js";
import { encrypt } from "../utils/encryption.js";

const generateOTP   = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateToken = (user) => Buffer.from(
  JSON.stringify({ id: user.id, email: user.email, role: user.role, iat: Date.now() })
).toString("base64");

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register
 * Body: { firstName, lastName, dob, phone, aadhaarNumber, email, password }
 * Returns token immediately so student can upload images right after
 */
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, dob, phone, aadhaarNumber, email, password } = req.body;

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
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

    // Generate token so student can immediately upload images
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registered successfully! OTP sent to your email.",
      data: {
        token,
        user: {
          id:        user.id,
          email:     user.email,
          role:      user.role,
          firstName: user.first_name,
          lastName:  user.last_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/verify-otp
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

    // Mark OTP used
    await supabaseAdmin.from("otps").update({ used: true }).eq("id", record.id);

    // Update user otp_verified
    const { data: user } = await supabaseAdmin
      .from("users")
      .update({ otp_verified: true, updated_at: new Date().toISOString() })
      .eq("email", email)
      .select()
      .single();

    res.status(200).json({
      success:    true,
      message:    "Email verified successfully!",
      isVerified: user.face_verified,
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
 * Role auto-detected from DB
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

    // Students must complete all required steps before login
    if (user.role === "student") {
      if (!user.otp_verified) {
        return res.status(403).json({
          success:     false,
          message:     "Please verify your email via OTP before logging in",
          requiresOTP: true,
        });
      }
      if (!user.college_id_url) {
        return res.status(403).json({
          success:       false,
          message:       "Please upload your college ID card before logging in",
          requiresImage: "college_id",
        });
      }
      if (!user.selfie_url) {
        return res.status(403).json({
          success:       false,
          message:       "Please upload your selfie before logging in",
          requiresImage: "selfie",
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
 * GET /api/auth/me
 * Protected
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};