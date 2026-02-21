import express            from "express";
import cors               from "cors";
import dotenv             from "dotenv";

import authRoutes         from "./routes/auth.routes.js";
import eventRoutes        from "./routes/event.routes.js";
import teamRoutes         from "./routes/team.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import submissionRoutes   from "./routes/submission.routes.js";
import shortlistRoutes    from "./routes/shortlist.routes.js";
import qrRoutes           from "./routes/qr.routes.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "End_Loop API running 🚀" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/events",        eventRoutes);
app.use("/api/teams",         teamRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/submissions",   submissionRoutes);
app.use("/api/shortlist",     shortlistRoutes);
app.use("/api/qr",            qrRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`✅  Server running → http://localhost:${PORT}`));

export default app;