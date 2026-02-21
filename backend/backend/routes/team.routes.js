import { Router } from "express";
import {
  createTeam,
  acceptInvite,
  declineOrLeave,
  getMyTeams,
  getTeamById,
  deleteTeam,
  getTeamsByEvent,
} from "../controllers/team.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { isAdmin, isStudent } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// ─── Student ──────────────────────────────────────────────────────────────────
router.post("/",                    verifyToken, isStudent, validate(["eventId", "teamName"]), createTeam);
router.get("/my-teams",             verifyToken, isStudent, getMyTeams);
router.post("/:teamId/accept",      verifyToken, isStudent, acceptInvite);
router.post("/:teamId/decline",     verifyToken, isStudent, declineOrLeave);
router.delete("/:teamId",           verifyToken, isStudent, deleteTeam);

// ─── Shared (student + admin) ─────────────────────────────────────────────────
router.get("/:teamId",              verifyToken, getTeamById);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get("/event/:eventId",       verifyToken, isAdmin, getTeamsByEvent);

export default router;