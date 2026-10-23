import { config } from "../config/env.js";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string; username: string };
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
