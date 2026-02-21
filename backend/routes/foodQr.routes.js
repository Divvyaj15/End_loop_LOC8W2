import { Router } from "express";
import { getMyFoodQRs, scanFoodQR, getFoodReport } from "../controllers/foodQr.controller.js";
import { verifyToken }        from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";
import { validate }           from "../middleware/validate.middleware.js";

const router = Router();

// ─── Student ──────────────────────────────────────────────────────────────────
router.get("/my-meals/:eventId",   verifyToken, isStudent, getMyFoodQRs);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post("/scan",               verifyToken, isAdmin, validate(["qrToken"]), scanFoodQR);
router.get("/report/:eventId",     verifyToken, isAdmin, getFoodReport);

export default router;