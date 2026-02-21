export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required: ${roles.join(" or ")}`,
    });
  }
  next();
};

export const isAdmin        = requireRole("admin");
export const isJudge        = requireRole("judge");
export const isStudent      = requireRole("student");
export const isAdminOrJudge = requireRole("admin", "judge");