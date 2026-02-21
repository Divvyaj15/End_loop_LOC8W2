import { Router } from "express";
import {
  createEvent,
  getAllEvents,
  getAdminEvents,
  getEventById,
  updateEvent,
  uploadProblemStatement,
  deleteEvent,
} from "../controllers/event.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { isAdmin }     from "../middleware/role.middleware.js";
import { validate }    from "../middleware/validate.middleware.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/",          getAllEvents);
router.get("/:eventId",  getEventById);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.get("/admin/all", verifyToken, isAdmin, getAdminEvents);

router.post(
  "/",
  verifyToken,
  isAdmin,
  validate(["title", "description", "category", "committeeName", "startDate", "endDate", "registrationDeadline", "eventStartTime", "eventEndTime"]),
  createEvent
);

router.patch("/:eventId",                    verifyToken, isAdmin, updateEvent);
router.delete("/:eventId",                   verifyToken, isAdmin, deleteEvent);
router.post("/:eventId/problem-statement",   verifyToken, isAdmin, validate(["pdfBase64"]), uploadProblemStatement);

export default router;