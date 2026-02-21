import { Router } from "express";
import {
  createJudge,
  getAllJudges,
  getJudgesByEvent,
  assignTeams,
  unassignTeam,
  getMyEvents,
  getMyAssignedTeams,
  scoreTeam,
  getEventScores,
  lockScores,
} from "../controllers/judge.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { isAdmin }     from "../middleware/role.middleware.js";
import { validate }    from "../middleware/validate.middleware.js";

// ─── Judge role middleware ─────────────────────────────────────────────────────
const isJudge = (req, res, next) => {
  if (req.user.role !== "judge") {
    return res.status(403).json({ success: false, message: "Access denied. Judges only." });
  }
  next();
};

const router = Router();

// ─── Admin only ───────────────────────────────────────────────────────────────
router.get("/",                     verifyToken, isAdmin, getAllJudges);
router.post("/create",              verifyToken, isAdmin, validate(["firstName", "lastName", "email", "password"]), createJudge);
router.get("/event/:eventId",       verifyToken, isAdmin, getJudgesByEvent);
router.post("/assign",              verifyToken, isAdmin, validate(["eventId", "judgeId", "teamIds"]), assignTeams);
router.delete("/unassign",          verifyToken, isAdmin, unassignTeam);
router.get("/scores/:eventId",      verifyToken, isAdmin, getEventScores);
router.patch("/lock/:eventId",      verifyToken, isAdmin, lockScores);

// ─── Judge only ───────────────────────────────────────────────────────────────
router.get("/my-events",            verifyToken, isJudge, getMyEvents);
router.get("/my-teams/:eventId",    verifyToken, isJudge, getMyAssignedTeams);
router.post("/score",               verifyToken, isJudge, validate(["eventId", "teamId"]), scoreTeam);

export default router;