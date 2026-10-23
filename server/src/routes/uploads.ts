import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/http.js";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UnsupportedFileTypeError,
  ensureUploadsDir,
  extForMime,
} from "../services/upload.service.js";

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureUploadsDir()),
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extForMime(file.mimetype) ?? ".bin"}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new UnsupportedFileTypeError());
      return;
    }
    cb(null, true);
  },
});

router.post(
  "/",
  authenticate,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Файл не передан" });

    return res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      mime: req.file.mimetype,
      size: req.file.size,
    });
  }),
);

export { router as uploadsRouter };
