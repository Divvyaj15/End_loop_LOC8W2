import { Router } from "express";
import {
    generateCertificates,
    getMyCertificate,
    getEventCertificates,
    verifyCertificate,
} from "../controllers/certificate.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/verify/:certificateId", verifyCertificate);

// ─── Student ──────────────────────────────────────────────────────────────────
router.get("/my/:eventId", verifyToken, isStudent, getMyCertificate);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post("/generate/:eventId", verifyToken, isAdmin, generateCertificates);
router.get("/event/:eventId", verifyToken, isAdmin, getEventCertificates);

export default router;