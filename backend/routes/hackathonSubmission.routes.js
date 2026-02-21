import { Router } from "express";
import {
  submitHackathonProject,
  getTeamHackathonSubmission,
  getSubmissionsForJudge,
  getAllHackathonSubmissions,
  lockHackathonSubmissions,
} from "../controllers/hackathonSubmission.controller.js";
import { verifyToken }        from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";
import { validate }           from "../middleware/validate.middleware.js";

const isJudge = (req, res, next) => {
  if (req.user.role !== "judge") {
    return res.status(403).json({ success: false, message: "Access denied. Judges only." });
  }
  next();
};

const router = Router();

// ─── Student (leader) ─────────────────────────────────────────────────────────
router.post("/",                         verifyToken, isStudent, validate(["eventId", "teamId", "pptBase64", "githubLink"]), submitHackathonProject);
router.get("/team/:teamId",              verifyToken, getTeamHackathonSubmission);

// ─── Judge ────────────────────────────────────────────────────────────────────
router.get("/judge/:eventId",            verifyToken, isJudge, getSubmissionsForJudge);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get("/event/:eventId",            verifyToken, isAdmin, getAllHackathonSubmissions);
router.patch("/lock/:eventId",           verifyToken, isAdmin, lockHackathonSubmissions);

export default router;