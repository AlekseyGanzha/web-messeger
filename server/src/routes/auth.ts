import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { config } from "../config/env.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

const usernameSchema = z.string().trim().min(3).max(64);

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6),
});

const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(2).max(64),
});

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toAuthUser(user: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: Date | null;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isOnline: user.isOnline,
    lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
  };
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const { username, password } = parse.data;
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return res.json({ token, user: toAuthUser(user) });
  }),
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const { username, password, displayName } = parse.data;

    const exists = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: { username, passwordHash, displayName },
      });

      const token = jwt.sign({ userId: user.id, username: user.username }, config.jwtSecret, {
        expiresIn: "7d",
      });

      return res.json({ token, user: toAuthUser(user) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ message: "Username already taken" });
      }

      throw error;
    }
  }),
);

export { router as authRouter };
