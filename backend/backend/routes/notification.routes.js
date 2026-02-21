import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/",                          verifyToken, getNotifications);
router.patch("/mark-all-read",           verifyToken, markAllAsRead);
router.patch("/:notificationId/read",    verifyToken, markAsRead);

export default router;