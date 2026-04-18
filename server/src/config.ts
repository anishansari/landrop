import os from "node:os";
import path from "node:path";

import dotenv from "dotenv";

import type { ServerConfig } from "@landrop/shared";

dotenv.config();

const APP_NAME = "LanDrop Clip";
const APP_VERSION = "1.0.0";
const DEFAULT_PORT = 8787;
const DEFAULT_TTL_MINUTES = 15;
const DEFAULT_MAX_UPLOAD_MB = 50;
const DEFAULT_CHUNK_UPLOAD_MB = 8;
const DEFAULT_MAX_CHUNKED_UPLOAD_GB = 20;
const DEFAULT_STORAGE_DIR = path.join(os.tmpdir(), "landrop-clip");
const DEFAULT_RECEIVED_FILES_DIR = path.join(os.homedir(), "Downloads", "LanDrop Clip Inbox");

export interface AppConfig extends ServerConfig {
  host: string;
  sessionTtlMs: number;
  maxUploadSizeBytes: number;
  chunkUploadSizeBytes: number;
  maxChunkedUploadSizeBytes: number;
  cleanupIntervalMs: number;
  openDashboardOnStart: boolean;
}

function parsePositiveInt(input: string | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }

  const value = Number.parseInt(input, 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseBoolean(input: string | undefined, fallback: boolean): boolean {
  if (!input) {
    return fallback;
  }

  const normalized = input.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function isPreferredPrivateIp(ip: string): number {
  if (ip.startsWith("192.168.")) {
    return 0;
  }

  if (ip.startsWith("10.")) {
    return 1;
  }

  const secondOctet = Number.parseInt(ip.split(".")[1] ?? "-1", 10);

  if (ip.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31) {
    return 2;
  }

  return 3;
}

export function detectLocalIps(): string[] {
  const interfaces = os.networkInterfaces();
  const candidates = new Set<string>();

  for (const entries of Object.values(interfaces)) {
    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal || !entry.address) {
        continue;
      }

      candidates.add(entry.address);
    }
  }

  return Array.from(candidates).sort((left, right) => {
    const rankDelta = isPreferredPrivateIp(left) - isPreferredPrivateIp(right);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return left.localeCompare(right);
  });
}

export function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const port = overrides.port ?? parsePositiveInt(process.env.PORT, DEFAULT_PORT);
  const sessionTtlMinutes =
    overrides.sessionTtlMinutes ??
    parsePositiveInt(process.env.SESSION_TTL_MINUTES, DEFAULT_TTL_MINUTES);
  const maxUploadSizeMb =
    overrides.maxUploadSizeMb ??
    parsePositiveInt(process.env.MAX_UPLOAD_SIZE_MB, DEFAULT_MAX_UPLOAD_MB);
  const chunkUploadSizeMb =
    overrides.chunkUploadSizeMb ??
    parsePositiveInt(process.env.CHUNK_UPLOAD_SIZE_MB, DEFAULT_CHUNK_UPLOAD_MB);
  const maxChunkedUploadSizeGb =
    overrides.maxChunkedUploadSizeGb ??
    parsePositiveInt(process.env.MAX_CHUNKED_UPLOAD_SIZE_GB, DEFAULT_MAX_CHUNKED_UPLOAD_GB);
  const storageDir =
    overrides.storageDir ??
    path.resolve(process.env.STORAGE_DIR || DEFAULT_STORAGE_DIR);
  const receivedFilesDir =
    overrides.receivedFilesDir ??
    path.resolve(process.env.RECEIVED_FILES_DIR || DEFAULT_RECEIVED_FILES_DIR);

  return {
    appName: APP_NAME,
    version: APP_VERSION,
    host: overrides.host ?? "0.0.0.0",
    port,
    localIps: overrides.localIps ?? detectLocalIps(),
    storageDir,
    receivedFilesDir,
    sessionTtlMinutes,
    sessionTtlMs: overrides.sessionTtlMs ?? sessionTtlMinutes * 60_000,
    maxUploadSizeMb,
    maxUploadSizeBytes: overrides.maxUploadSizeBytes ?? maxUploadSizeMb * 1024 * 1024,
    chunkUploadSizeMb,
    chunkUploadSizeBytes: overrides.chunkUploadSizeBytes ?? chunkUploadSizeMb * 1024 * 1024,
    maxChunkedUploadSizeGb,
    maxChunkedUploadSizeBytes:
      overrides.maxChunkedUploadSizeBytes ?? maxChunkedUploadSizeGb * 1024 * 1024 * 1024,
    cleanupIntervalMs: overrides.cleanupIntervalMs ?? 30_000,
    openDashboardOnStart:
      overrides.openDashboardOnStart ?? parseBoolean(process.env.OPEN_DASHBOARD_ON_START, false)
  };
}
