import express from "express";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import cors from "cors";
import multer from "multer";
import { Server } from "socket.io";
import { config } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { chatsRouter } from "./routes/chats.js";
import { messagesRouter } from "./routes/messages.js";
import { uploadsRouter } from "./routes/uploads.js";
import { markAllOffline } from "./socket/presence.js";
import { setupSocket } from "./socket/index.js";
import { UnsupportedFileTypeError, ensureUploadsDir } from "./services/upload.service.js";
import { apiLimiter, authLimiter } from "./middlewares/rate-limit.js";

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  "/uploads",
  express.static(ensureUploadsDir(), {
    maxAge: "7d",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/users", apiLimiter, usersRouter);
app.use("/api/chats", apiLimiter, chatsRouter);
app.use("/api/messages", apiLimiter, messagesRouter);
app.use("/api/uploads", apiLimiter, uploadsRouter);

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/out");
const clientIndex = path.join(clientDir, "index.html");

if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDir));

  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/socket.io") ||
      req.path.startsWith("/uploads") ||
      req.path === "/health"
    ) {
      return next();
    }

    return res.sendFile(clientIndex);
  });
}

const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
});

app.set("io", io);

setupSocket(io);

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof UnsupportedFileTypeError) {
      res.status(415).json({ message: "Поддерживаются только изображения (jpg, png, gif, webp)" });
      return;
    }

    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        message: tooLarge ? "Файл слишком большой (максимум 5 МБ)" : "Не удалось загрузить файл",
      });
      return;
    }

    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  },
);

async function start() {
  await markAllOffline();
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

async function shutdown() {
  await markAllOffline();
  io.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void start();
