import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { lookup as lookupMimeType } from "mime-types";

import type { ShareItemType, TextSubmissionMode } from "@landrop/shared";

export function createId(length = 10): string {
  const value = crypto.randomBytes(Math.ceil(length * 0.75)).toString("base64url");
  return value.slice(0, length);
}

export function createRoomCode(length = 5): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  let code = "";

  for (let index = 0; index < length; index += 1) {
    const byte = bytes[index] ?? 0;
    code += alphabet[byte % alphabet.length];
  }

  return code;
}

export async function ensureDir(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true });
}

export async function safeRemove(filePath: string): Promise<void> {
  await fs.rm(filePath, { recursive: true, force: true });
}

export function sanitizeTextInput(value: string, maxLength = 8000): string {
  return value
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeTitle(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const sanitized = sanitizeTextInput(value, 120);
  return sanitized.length > 0 ? sanitized : null;
}

export function sanitizeParticipantName(value: string | null | undefined, fallback: string): string {
  const sanitized = sanitizeTextInput(value || "", 40);
  return sanitized.length > 0 ? sanitized : fallback;
}

export function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName || "upload");
  const normalized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return normalized.length > 0 ? normalized : "upload";
}

export function classifyItemType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined
): ShareItemType {
  const resolvedMime = mimeType || (fileName ? lookupMimeType(fileName) || null : null);

  if (!resolvedMime) {
    return "file";
  }

  if (resolvedMime.startsWith("image/")) {
    return "image";
  }

  if (resolvedMime.startsWith("video/")) {
    return "video";
  }

  if (resolvedMime === "application/pdf") {
    return "pdf";
  }

  return "file";
}

export function isPreviewable(type: ShareItemType): boolean {
  return type === "image" || type === "video" || type === "pdf";
}

export function buildTextItemTitle(
  mode: TextSubmissionMode,
  content: string,
  explicitTitle: string | null
): string {
  if (explicitTitle) {
    return explicitTitle;
  }

  if (mode === "url") {
    try {
      const parsed = new URL(content);
      return parsed.hostname;
    } catch {
      return "Shared link";
    }
  }

  const firstLine = content.split("\n")[0]?.trim() || "";
  const base = firstLine.length > 0 ? firstLine : mode === "note" ? "Shared note" : "Shared text";

  return base.slice(0, 80);
}

export function formatBytes(size: number | null | undefined): string {
  if (!size || size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const rounded = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[index]}`;
}

export function toDownloadUrl(sessionId: string, itemId: string): string {
  return `/files/${encodeURIComponent(sessionId)}/${encodeURIComponent(itemId)}`;
}

export function toPreviewUrl(sessionId: string, itemId: string): string {
  return `/preview/${encodeURIComponent(sessionId)}/${encodeURIComponent(itemId)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
