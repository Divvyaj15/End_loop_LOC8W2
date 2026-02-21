import { Router } from "express";
import { register, login, verifyOTP, resendOTP, getMe } from "../controllers/auth.controller.js";
import { uploadUserImage } from "../controllers/upload.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validate }    from "../middleware/validate.middleware.js";

const router = Router();

// Public
router.post("/register",     validate(["firstName", "lastName", "dob", "phone", "aadhaarNumber", "email", "password"]), register);
router.post("/login",        validate(["email", "password"]), login);
router.post("/verify-otp",   validate(["email", "otp"]), verifyOTP);
router.post("/resend-otp",   validate(["email"]), resendOTP);

// Protected
router.get("/me",            verifyToken, getMe);
router.post("/upload-image", verifyToken, validate(["imageBase64", "imageType"]), uploadUserImage);

export default router;