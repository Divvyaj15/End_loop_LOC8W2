import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email    = "admin@hackathon.com";
const password = "Admin@1234";

// Generate fresh hash
const password_hash = await bcrypt.hash(password, 10);
console.log("Generated hash:", password_hash);

// Delete existing admin if any
await supabaseAdmin.from("users").delete().eq("email", email);

// Insert fresh admin
const { data, error } = await supabaseAdmin.from("users").insert({
  email,
  password_hash,
  first_name:   "Super",
  last_name:    "Admin",
  role:         "admin",
  is_verified:  true,
  otp_verified: true,
  face_verified: true,
}).select().single();

if (error) {
  console.error("❌ Error:", error.message);
} else {
  console.log("✅ Admin seeded successfully!");
  console.log("   Email:   ", email);
  console.log("   Password:", password);
  console.log("   Role:    ", data.role);
}