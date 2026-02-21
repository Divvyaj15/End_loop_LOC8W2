import { Router } from "express";
import {
  registerBasic,
  registerComplete,
  verifyOTP,
  resendOTP,
  login,
  getMe,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validate }    from "../middleware/validate.middleware.js";

const router = Router();

// ─── Registration flow ────────────────────────────────────────────────────────
router.post("/register-basic",     validate(["firstName", "lastName", "dob", "phone", "aadhaarNumber", "email", "password"]), registerBasic);
router.post("/verify-otp",         validate(["email", "otp"]), verifyOTP);
router.post("/register-complete",  verifyToken, validate(["collegeIdBase64", "selfieBase64"]), registerComplete);
router.post("/resend-otp",         validate(["email"]), resendOTP);

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/login",              validate(["email", "password"]), login);
router.get("/me",                  verifyToken, getMe);

export default router;