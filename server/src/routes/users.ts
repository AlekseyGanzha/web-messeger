import { Router } from "express";
import { authenticate, type AuthRequest } from "../middlewares/auth.js";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/http.js";
import { z } from "zod";

const router = Router();

const updateProfileSchema = z.object({
  username: z.string().trim().min(3).max(32).optional(),
  displayName: z.string().trim().min(2).max(64).optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
});

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      ...user,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    });
  }),
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.userId },
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" as const } },
                { displayName: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
      take: 20,
      orderBy: { username: "asc" },
    });

    return res.json(
      users.map((user) => ({
        ...user,
        lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
      })),
    );
  }),
);

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const parse = updateProfileSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      return res.status(400).json({ message: parse.error.issues[0]?.message ?? "Invalid payload" });
    }

    const { username, displayName, avatarUrl } = parse.data;

    if (username) {
      const taken = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (taken && taken.id !== req.userId) {
        return res.status(409).json({ message: "Логин уже занят" });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(username !== undefined ? { username } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    return res.json({
      ...user,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    });
  }),
);

export { router as usersRouter };
