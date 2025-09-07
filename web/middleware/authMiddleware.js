import { verifyToken } from "../utils/jwt.js";

export const requireAuth = (req, res, next) => {
  const headers = req.headers.authorization || "";
  const token = headers.startsWith("Bearer ") ? headers.split(" ")[1] : "";
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAdmin = (req, res, next) => {
  const roles = req.users.roles || [];
  if (!roles.includes("admin"))
    return res.status(403).json({ error: "Forbidden" });
  return next();
};
