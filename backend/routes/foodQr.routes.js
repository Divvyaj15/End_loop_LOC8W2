import { Router } from "express";
import { getMyFoodQRs, lookupFoodQR, scanFoodQR, getFoodReport } from "../controllers/foodQr.controller.js";
import { verifyToken }        from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";

const router = Router();

// ─── Student ──────────────────────────────────────────────────────────────────
router.get("/my-meals/:eventId",   verifyToken, isStudent, getMyFoodQRs);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post("/lookup",             verifyToken, isAdmin, lookupFoodQR);
router.post("/scan",               verifyToken, isAdmin, scanFoodQR);
router.get("/report/:eventId",     verifyToken, isAdmin, getFoodReport);

export default router;