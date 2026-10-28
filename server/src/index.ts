import express from "express";
import http from "node:http";
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

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: config.corsOrigin,
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

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/uploads", uploadsRouter);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
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

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    await markAllOffline();
  } catch (error) {
    console.error("Failed to mark users offline:", error);
  } finally {
    io.close();
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void start();
