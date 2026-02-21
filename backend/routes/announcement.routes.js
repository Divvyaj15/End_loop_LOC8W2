import { Router } from "express";
import {
  createAnnouncement,
  getAnnouncementsByEvent,
  deleteAnnouncement,
} from "../controllers/announcement.controller.js";
import { verifyToken }        from "../middleware/auth.middleware.js";
import { isAdmin }            from "../middleware/role.middleware.js";
import { validate }           from "../middleware/validate.middleware.js";

const router = Router();

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post("/",                        verifyToken, isAdmin, validate(["eventId", "title", "message"]), createAnnouncement);
router.delete("/:announcementId",       verifyToken, isAdmin, deleteAnnouncement);

// ─── All authenticated users ──────────────────────────────────────────────────
router.get("/event/:eventId",           verifyToken, getAnnouncementsByEvent);

export default router;