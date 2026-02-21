import { Router } from "express";
import {
  scorePPT,
  getLeaderboard,
  confirmShortlist,
  getShortlistedTeams,
  checkTeamShortlisted,
} from "../controllers/shortlist.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { isAdmin }     from "../middleware/role.middleware.js";
import { validate }    from "../middleware/validate.middleware.js";

const router = Router();

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post("/score",              verifyToken, isAdmin, validate(["eventId", "teamId", "submissionId"]), scorePPT);
router.get("/leaderboard/:eventId", verifyToken, isAdmin, getLeaderboard);
router.post("/confirm/:eventId",   verifyToken, isAdmin, confirmShortlist);

// ─── Public (after shortlisting) ─────────────────────────────────────────────
router.get("/:eventId",            verifyToken, getShortlistedTeams);
router.get("/check/:eventId/:teamId", verifyToken, checkTeamShortlisted);

export default router;