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
 * STEP 1 — Save to pending_registrations + send OTP
 * Does NOT create user in users table yet
 */
export const registerBasic = async (req, res, next) => {
  try {
    const { firstName, lastName, dob, phone, aadhaarNumber, email, password } = req.body;

    // Check if already fully registered in users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered. Please login." });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Upsert into pending_registrations (allow retry)
    const { data: pending, error } = await supabaseAdmin
      .from("pending_registrations")
      .upsert(
        {
          email,
          password_hash,
          first_name:     firstName,
          last_name:      lastName,
          dob,
          phone,
          aadhaar_number: encrypt(aadhaarNumber),
          otp_verified:   false,
          expires_at:     new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error) throw error;

    // Send OTP
    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete old OTPs for this email first
    await supabaseAdmin.from("otps").delete().eq("email", email);
    await supabaseAdmin.from("otps").insert({ email, otp, expires_at: expiresAt });
    await sendOTPEmail(email, otp);

    // Temp token using pending registration id
    const tempToken = Buffer.from(
      JSON.stringify({ pendingId: pending.id, email, step: "otp_pending", iat: Date.now() })
    ).toString("base64");

    res.status(201).json({
      success: true,
      message: "Basic details saved! OTP sent to your email.",
      data:    { tempToken, email },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/verify-otp
 * STEP 1.5 — Verify OTP, mark pending registration as verified
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

    // Mark pending registration as OTP verified
    const { data: pending } = await supabaseAdmin
      .from("pending_registrations")
      .update({ otp_verified: true })
      .eq("email", email)
      .select()
      .single();

    if (!pending) {
      return res.status(400).json({ success: false, message: "Registration session not found. Please start again." });
    }

    // Temp token to proceed to document upload
    const tempToken = Buffer.from(
      JSON.stringify({ pendingId: pending.id, email, step: "docs_pending", iat: Date.now() })
    ).toString("base64");

    res.status(200).json({
      success:  true,
      message:  "Email verified! Please upload your documents.",
      data:     { tempToken, email },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register-complete
 * STEP 2 — Upload images → create actual user in users table
 * Body: { tempToken, collegeIdBase64, selfieBase64 }
 */
export const registerComplete = async (req, res, next) => {
  try {
    const { tempToken, collegeIdBase64, selfieBase64 } = req.body;

    if (!tempToken) {
      return res.status(400).json({ success: false, message: "tempToken is required" });
    }
    if (!collegeIdBase64) {
      return res.status(400).json({ success: false, message: "College ID image is required" });
    }
    if (!selfieBase64) {
      return res.status(400).json({ success: false, message: "Live selfie is required" });
    }

    // Decode temp token
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(tempToken, "base64").toString("utf8"));
    } catch {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    const { pendingId, email } = decoded;

    // Fetch pending registration
    const { data: pending } = await supabaseAdmin
      .from("pending_registrations")
      .select("*")
      .eq("id", pendingId)
      .eq("email", email)
      .single();

    if (!pending) {
      return res.status(400).json({ success: false, message: "Registration session not found. Please start again." });
    }
    if (!pending.otp_verified) {
      return res.status(400).json({ success: false, message: "Please verify your email OTP first." });
    }
    if (new Date() > new Date(pending.expires_at)) {
      await supabaseAdmin.from("pending_registrations").delete().eq("id", pendingId);
      return res.status(400).json({ success: false, message: "Registration session expired. Please start again." });
    }

    // Check email not already registered (race condition guard)
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered. Please login." });
    }

    // Create actual user in users table
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        email:          pending.email,
        password_hash:  pending.password_hash,
        first_name:     pending.first_name,
        last_name:      pending.last_name,
        dob:            pending.dob,
        phone:          pending.phone,
        aadhaar_number: pending.aadhaar_number,
        role:           "student",
        otp_verified:   true,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Upload images
    let college_id_url, selfie_url;
    try {
      college_id_url = await uploadImage(collegeIdBase64, "college_id", user.id);
      selfie_url     = await uploadImage(selfieBase64,    "selfie",     user.id);
    } catch (uploadErr) {
      // Rollback user if upload fails
      await supabaseAdmin.from("users").delete().eq("id", user.id);
      return res.status(500).json({ success: false, message: "Image upload failed. Please try again." });
    }

    // Save image URLs
    await supabaseAdmin
      .from("users")
      .update({ college_id_url, selfie_url })
      .eq("id", user.id);

    // Clean up pending registration
    await supabaseAdmin.from("pending_registrations").delete().eq("id", pendingId);

    // Return login token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration complete! You can now login.",
      data: {
        token,
        user: {
          id:        user.id,
          email:     user.email,
          firstName: user.first_name,
          lastName:  user.last_name,
          role:      user.role,
        },
      },
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

    // Check in pending registrations
    const { data: pending } = await supabaseAdmin
      .from("pending_registrations")
      .select("id")
      .eq("email", email)
      .single();

    if (!pending) {
      return res.status(404).json({ success: false, message: "No pending registration found for this email." });
    }

    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabaseAdmin.from("otps").delete().eq("email", email);
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
      // Check if they have a pending registration
      const { data: pending } = await supabaseAdmin
        .from("pending_registrations")
        .select("otp_verified")
        .eq("email", email)
        .single();

      if (pending) {
        return res.status(403).json({
          success: false,
          message: pending.otp_verified
            ? "Please complete registration by uploading your documents."
            : "Please verify your email OTP to continue registration.",
          registrationPending: true,
          requiresDocs: pending.otp_verified,
          requiresOTP:  !pending.otp_verified,
        });
      }

      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
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