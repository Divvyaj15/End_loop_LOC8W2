import { Router } from "express";
import {
  submitPPT,
  getSubmissionsByEvent,
  getTeamSubmission,
  getProblemStatement,
  submitFinalPPT,
  submitFinalGitHub,
  submitFinalVideo,
  getFinalSubmission,
} from "../controllers/submission.controller.js";
import { verifyToken }   from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";
import { validate }      from "../middleware/validate.middleware.js";

const router = Router();

// ─── Student ──────────────────────────────────────────────────────────────────
router.post("/",                                    verifyToken, isStudent, validate(["eventId", "teamId", "pptBase64"]), submitPPT);
router.get("/team/:teamId",                         verifyToken, getTeamSubmission);
router.get("/event/:eventId/problem-statement",     verifyToken, getProblemStatement);

// ─── Final Submissions (Shortlisted Teams) ─────────────────────────────────────
router.post("/final-ppt",                           verifyToken, isStudent, validate(["eventId", "teamId", "pptBase64"]), submitFinalPPT);
router.post("/final-github",                        verifyToken, isStudent, validate(["eventId", "teamId", "githubBase64"]), submitFinalGitHub);
router.post("/final-video",                         verifyToken, isStudent, validate(["eventId", "teamId", "videoBase64"]), submitFinalVideo);
router.get("/final/:teamId",                        verifyToken, getFinalSubmission);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get("/event/:eventId",                       verifyToken, isAdmin, getSubmissionsByEvent);

export default router;