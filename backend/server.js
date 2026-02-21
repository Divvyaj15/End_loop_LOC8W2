import express                    from "express";
import cors                       from "cors";
import dotenv                     from "dotenv";

import authRoutes                 from "./routes/auth.routes.js";
import eventRoutes                from "./routes/event.routes.js";
import teamRoutes                 from "./routes/team.routes.js";
import notificationRoutes         from "./routes/notification.routes.js";
import submissionRoutes           from "./routes/submission.routes.js";
import shortlistRoutes            from "./routes/shortlist.routes.js";
import qrRoutes                   from "./routes/qr.routes.js";
import foodQrRoutes               from "./routes/foodQr.routes.js";
import announcementRoutes         from "./routes/announcement.routes.js";
import judgeRoutes                from "./routes/judge.routes.js";
import hackathonSubmissionRoutes  from "./routes/hackathonSubmission.routes.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "End_Loop API running 🚀" });
});

app.use("/api/auth",                  authRoutes);
app.use("/api/events",                eventRoutes);
app.use("/api/teams",                 teamRoutes);
app.use("/api/notifications",         notificationRoutes);
app.use("/api/submissions",           submissionRoutes);
app.use("/api/shortlist",             shortlistRoutes);
app.use("/api/qr",                    qrRoutes);
app.use("/api/food-qr",               foodQrRoutes);
app.use("/api/announcements",         announcementRoutes);
app.use("/api/judges",                judgeRoutes);
app.use("/api/hackathon-submissions", hackathonSubmissionRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

app.listen(PORT, () => console.log(`✅  Server running → http://localhost:${PORT}`));

export default app;