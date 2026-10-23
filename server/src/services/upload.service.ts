import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export class UnsupportedFileTypeError extends Error {
  constructor() {
    super("UNSUPPORTED_FILE_TYPE");
  }
}

export function ensureUploadsDir(): string {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export function extForMime(mime: string): string | null {
  return ALLOWED_MIME_TYPES[mime] ?? null;
}

export function isUploadedImageUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp)$/.test(
      url,
    )
  );
}
