import { Router } from "express";
import {
  generateEntryQRs,
  getMyQR,
  scanEntryQR,
  getAttendance,
} from "../controllers/qr.controller.js";
import { verifyToken }        from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";
import { validate }           from "../middleware/validate.middleware.js";

const router = Router();

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post("/generate/:eventId",  verifyToken, isAdmin, generateEntryQRs);
router.post("/scan",               verifyToken, isAdmin, validate(["qrToken"]), scanEntryQR);
router.get("/attendance/:eventId", verifyToken, isAdmin, getAttendance);

// ─── Student ──────────────────────────────────────────────────────────────────
router.get("/my-qr/:eventId",      verifyToken, isStudent, getMyQR);

export default router;