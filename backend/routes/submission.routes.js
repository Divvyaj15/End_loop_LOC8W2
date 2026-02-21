import { Router } from "express";
import {
  submitPPT,
  getSubmissionsByEvent,
  getTeamSubmission,
  getProblemStatement,
} from "../controllers/submission.controller.js";
import { verifyToken }   from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";
import { validate }      from "../middleware/validate.middleware.js";

const router = Router();

// ─── Student ──────────────────────────────────────────────────────────────────
router.post("/",                                    verifyToken, isStudent, validate(["eventId", "teamId", "pptBase64"]), submitPPT);
router.get("/team/:teamId",                         verifyToken, getTeamSubmission);
router.get("/event/:eventId/problem-statement",     verifyToken, getProblemStatement);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get("/event/:eventId",                       verifyToken, isAdmin, getSubmissionsByEvent);

export default router;