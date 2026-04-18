import http from "node:http";
import path from "node:path";

import type {
  ItemAddedPayload,
  PresenceUpdatedPayload,
  SessionClearedPayload,
  SessionCreatedPayload,
  SessionExpiredPayload,
  SessionSnapshotPayload,
  ShareItem,
  ShareSession,
  WsEnvelope
} from "@landrop/shared";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import multer from "multer";
import QRCode from "qrcode";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";

import { type AppConfig, createConfig } from "./config.js";
import { type PresenceInput, SessionStore } from "./session-store.js";
import { UploadStore } from "./upload-store.js";
import { ensureDir, isPreviewable, sanitizeFileName, sanitizeTextInput } from "./utils.js";
import { renderDashboardPage, renderJoinPage, renderPhonePage } from "./views.js";

const SESSION_NOT_FOUND = "Room not found or expired";
const ROOM_PIN_ERROR = "Room PIN required or invalid";

const pinSchema = z
  .string()
  .trim()
  .min(4, "PIN must be at least 4 characters")
  .max(32, "PIN must be 32 characters or less")
  .regex(/^[A-Za-z0-9_-]+$/, "PIN can use letters, numbers, _ and -");

const optionalPinSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, pinSchema.optional());

const sessionCreateSchema = z.object({
  pin: optionalPinSchema
});

const sessionPinUpdateSchema = z.object({
  pin: z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
  }, z.union([pinSchema, z.null()]))
});

const optionalTitleSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(120).optional());

const optionalSenderNameSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(40).optional());

const textSubmissionSchema = z.object({
  mode: z.enum(["text", "note", "url"]),
  content: z
    .string()
    .max(8000)
    .refine((value) => sanitizeTextInput(value).length > 0, "Please enter something before sending"),
  title: optionalTitleSchema,
  senderName: optionalSenderNameSchema
});

const presenceSchema = z.object({
  participantId: z.string().min(3).max(64),
  name: optionalSenderNameSchema,
  role: z.enum(["mac", "phone"]),
  source: z.enum(["dashboard", "phone", "extension"]),
  isHost: z.boolean().optional()
});

const uploadInitSchemaBase = z.object({
  originalFileName: z.string().min(1).max(260),
  mimeType: z.string().max(255).optional(),
  size: z.number().int().positive(),
  senderName: optionalSenderNameSchema
});

export interface LanDropApp {
  app: express.Express;
  config: AppConfig;
  store: SessionStore;
  close: () => void;
  attachRealtime: (server: http.Server) => void;
}

interface CreateAppOptions {
  configOverrides?: Partial<AppConfig>;
  disableCleanupTimer?: boolean;
}

type ResolverMode = "session" | "room";

function getExtensionFriendlyOrigin(origin: string | undefined, allowedHosts: Set<string>): boolean {
  if (!origin) {
    return true;
  }

  if (origin.startsWith("chrome-extension://")) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

function parseSessionId(input: string): string {
  return input.trim();
}

function parseRoomCode(input: string): string {
  return input.trim().toUpperCase();
}

function getRequestSessionId(request: Request): string {
  return parseSessionId(String(request.params.id ?? ""));
}

function getRequestRoomCode(request: Request): string {
  return parseRoomCode(String(request.params.code ?? ""));
}

function getRequestChunkIndex(request: Request): number {
  return Number.parseInt(String(request.params.chunkIndex ?? "-1"), 10);
}

function jsonError(response: Response, statusCode: number, message: string): void {
  response.status(statusCode).json({ error: message });
}

function jsonPinError(response: Response): void {
  response.status(401).json({ error: ROOM_PIN_ERROR, pinRequired: true });
}

function shouldInline(item: ShareItem): boolean {
  return item.type === "image" || item.type === "video" || item.type === "pdf";
}

function ensureActiveSession(store: SessionStore, sessionId: string): ShareSession | null {
  return store.getSession(sessionId);
}

function extractRequestPin(request: Request): string | null {
  const headerPin = request.header("x-room-pin");
  if (typeof headerPin === "string" && headerPin.trim().length > 0) {
    return headerPin.trim();
  }
  if (typeof request.body?.pin === "string" && request.body.pin.trim().length > 0) {
    return request.body.pin.trim();
  }
  if (typeof request.query.pin === "string" && request.query.pin.trim().length > 0) {
    return request.query.pin.trim();
  }
  return null;
}

function enforceRoomPin(
  store: SessionStore,
  sessionId: string,
  request: Request,
  response: Response
): boolean {
  if (!store.isSessionPinEnabled(sessionId)) {
    return true;
  }

  const pin = extractRequestPin(request);
  if (!store.verifySessionPin(sessionId, pin)) {
    jsonPinError(response);
    return false;
  }
  return true;
}

function buildSessionSnapshot(store: SessionStore, sessionId: string): SessionSnapshotPayload {
  return {
    session: store.getSession(sessionId),
    latestIncomingItem: store.getLatestIncomingItem(sessionId),
    latestOutgoingItem: store.getLatestOutgoingItem(sessionId),
    incomingItems: store.getIncomingItems(sessionId),
    outgoingItems: store.getOutgoingItems(sessionId),
    timelineItems: store.getTimelineItems(sessionId)
  };
}

function resolveSessionId(store: SessionStore, request: Request, mode: ResolverMode): string | null {
  if (mode === "session") {
    const sessionId = getRequestSessionId(request);
    return ensureActiveSession(store, sessionId) ? sessionId : null;
  }

  const roomCode = getRequestRoomCode(request);
  const sessionId = store.getSessionIdByRoomCode(roomCode);
  if (!sessionId) {
    return null;
  }

  return ensureActiveSession(store, sessionId) ? sessionId : null;
}

export async function createLanDropApp(options: CreateAppOptions = {}): Promise<LanDropApp> {
  const config = createConfig(options.configOverrides);
  const store = new SessionStore({
    storageDir: config.storageDir,
    receivedFilesDir: config.receivedFilesDir,
    sessionTtlMs: config.sessionTtlMs
  });
  const uploadStore = new UploadStore({
    storageDir: config.storageDir,
    chunkSizeBytes: config.chunkUploadSizeBytes,
    maxChunkedUploadSizeBytes: config.maxChunkedUploadSizeBytes,
    sessionTtlMs: config.sessionTtlMs,
    store
  });

  await store.prepare();
  await uploadStore.prepare();

  const app = express();
  const tempUploadDir = path.join(config.storageDir, ".incoming");
  await ensureDir(tempUploadDir);
  const allowedCorsHosts = new Set(["127.0.0.1", "localhost", ...config.localIps]);

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (getExtensionFriendlyOrigin(origin, allowedCorsHosts)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed"));
      }
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use((request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination(_request, _file, callback) {
        callback(null, tempUploadDir);
      },
      filename(_request, file, callback) {
        const safeName = sanitizeFileName(file.originalname);
        callback(null, `${Date.now()}-${safeName}`);
      }
    }),
    limits: {
      fileSize: config.maxUploadSizeBytes,
      files: 20
    }
  });
  const chunkParser = express.raw({
    type: "application/octet-stream",
    limit: config.chunkUploadSizeBytes
  });
  const uploadInitSchema = uploadInitSchemaBase.extend({
    size: z.number().int().positive().max(config.maxChunkedUploadSizeBytes)
  });

  const handlePresence =
    (mode: ResolverMode) =>
    (request: Request, response: Response, next: NextFunction): void => {
      try {
        const sessionId = resolveSessionId(store, request, mode);
        if (!sessionId) {
          jsonError(response, 404, SESSION_NOT_FOUND);
          return;
        }
        if (mode === "room" && !enforceRoomPin(store, sessionId, request, response)) {
          return;
        }

        const parsed = presenceSchema.safeParse(request.body);
        if (!parsed.success) {
          jsonError(response, 400, parsed.error.issues[0]?.message ?? "Invalid presence payload");
          return;
        }

        const session = store.upsertParticipant(sessionId, parsed.data as PresenceInput);
        response.json(session);
      } catch (error) {
        next(error);
      }
    };

  const handleFileUpload =
    (direction: "incoming" | "outgoing", mode: ResolverMode) =>
    (request: Request, response: Response, next: NextFunction): void => {
      upload.array("files")(request, response, async (error: unknown) => {
        if (error) {
          next(error);
          return;
        }

        try {
          const sessionId = resolveSessionId(store, request, mode);
          if (!sessionId) {
            jsonError(response, 404, SESSION_NOT_FOUND);
            return;
          }
          if (mode === "room" && !enforceRoomPin(store, sessionId, request, response)) {
            return;
          }

          const uploadedFiles = (request.files as Express.Multer.File[] | undefined) ?? [];
          if (uploadedFiles.length === 0) {
            jsonError(response, 400, "Please attach at least one file");
            return;
          }

          const senderName =
            typeof request.body?.senderName === "string" ? request.body.senderName : undefined;
          const items = await store.addFiles(
            sessionId,
            uploadedFiles.map((file) => ({
              path: file.path,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size
            })),
            direction,
            Date.now(),
            senderName
          );

          response.status(201).json(items);
        } catch (innerError) {
          next(innerError);
        }
      });
    };

  const handleTextSubmission =
    (direction: "incoming" | "outgoing", mode: ResolverMode) =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = resolveSessionId(store, request, mode);
        if (!sessionId) {
          jsonError(response, 404, SESSION_NOT_FOUND);
          return;
        }
        if (mode === "room" && !enforceRoomPin(store, sessionId, request, response)) {
          return;
        }

        const parsed = textSubmissionSchema.safeParse(request.body);
        if (!parsed.success) {
          jsonError(response, 400, parsed.error.issues[0]?.message ?? "Invalid payload");
          return;
        }

        if (parsed.data.mode === "url") {
          try {
            // eslint-disable-next-line no-new
            new URL(parsed.data.content);
          } catch {
            jsonError(response, 400, "Please provide a valid URL");
            return;
          }
        }

        const item = await store.addTextItem(
          sessionId,
          parsed.data.mode,
          parsed.data.content,
          parsed.data.title,
          direction,
          Date.now(),
          parsed.data.senderName
        );

        response.status(201).json(item);
      } catch (error) {
        next(error);
      }
    };

  const handleChunkedUploadInit =
    (direction: "incoming" | "outgoing", mode: ResolverMode) =>
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = resolveSessionId(store, request, mode);
        if (!sessionId) {
          jsonError(response, 404, SESSION_NOT_FOUND);
          return;
        }
        if (mode === "room" && !enforceRoomPin(store, sessionId, request, response)) {
          return;
        }

        const parsed = uploadInitSchema.safeParse(request.body);
        if (!parsed.success) {
          jsonError(response, 400, parsed.error.issues[0]?.message ?? "Invalid upload metadata");
          return;
        }

        const uploadSession = await uploadStore.createUpload({
          sessionId,
          direction,
          originalFileName: parsed.data.originalFileName,
          mimeType: parsed.data.mimeType ?? null,
          size: parsed.data.size,
          senderName: parsed.data.senderName ?? null
        });

        response.status(201).json(uploadSession);
      } catch (error) {
        next(error);
      }
    };

  app.get("/", (_request, response) => {
    response.redirect("/receiver");
  });

  app.get("/join", (_request, response) => {
    response.type("html").send(renderJoinPage(config.appName));
  });

  const renderReceiverDashboard = (request: Request, response: Response) => {
    const requestedSessionId =
      typeof request.query.session === "string" ? parseSessionId(request.query.session) : null;
    const requestedRoomCode =
      typeof request.query.room === "string" ? parseRoomCode(request.query.room) : null;
    const resolvedSessionId =
      requestedSessionId && ensureActiveSession(store, requestedSessionId)
        ? requestedSessionId
        : requestedRoomCode
          ? store.getSessionIdByRoomCode(requestedRoomCode)
          : null;
    const sharedHost = typeof request.query.host === "string" ? request.query.host.trim() : null;
    response
      .type("html")
      .send(renderDashboardPage(config.appName, resolvedSessionId, sharedHost));
  };

  app.get("/receiver", renderReceiverDashboard);
  app.get("/dashboard", renderReceiverDashboard);

  app.get("/r/:code", (request, response) => {
    response.type("html").send(renderPhonePage(config.appName, getRequestRoomCode(request)));
  });

  app.get("/s/:id", (request, response) => {
    const session = store.getSession(getRequestSessionId(request));
    if (!session) {
      response.redirect("/join");
      return;
    }

    response.redirect(`/r/${encodeURIComponent(session.roomCode)}`);
  });

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      appName: config.appName,
      version: config.version
    });
  });

  app.get("/api/config", (_request, response) => {
    response.json({
      appName: config.appName,
      version: config.version,
      port: config.port,
      localIps: config.localIps,
      storageDir: config.storageDir,
      receivedFilesDir: config.receivedFilesDir,
      sessionTtlMinutes: config.sessionTtlMinutes,
      maxUploadSizeMb: config.maxUploadSizeMb,
      chunkUploadSizeMb: config.chunkUploadSizeMb,
      maxChunkedUploadSizeGb: config.maxChunkedUploadSizeGb
    });
  });

  app.post("/api/sessions", (request, response) => {
    const parsed = sessionCreateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      jsonError(response, 400, parsed.error.issues[0]?.message ?? "Invalid session payload");
      return;
    }
    const session = store.createSession(Date.now(), parsed.data.pin ?? null);
    response.status(201).json(session);
  });

  app.put("/api/sessions/:id/pin", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const parsed = sessionPinUpdateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      jsonError(response, 400, parsed.error.issues[0]?.message ?? "Invalid PIN payload");
      return;
    }

    const session = store.setSessionPin(sessionId, parsed.data.pin ?? null);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(session);
  });

  app.get("/api/sessions/:id", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(session);
  });

  app.get("/api/sessions/:id/state", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(buildSessionSnapshot(store, sessionId));
  });

  app.get("/api/sessions/:id/qrcode", async (request, response, next) => {
    try {
      const sessionId = getRequestSessionId(request);
      const session = ensureActiveSession(store, sessionId);
      if (!session) {
        jsonError(response, 404, SESSION_NOT_FOUND);
        return;
      }

      const requestedHost =
        typeof request.query.host === "string" ? request.query.host.trim() : "";
      const host =
        requestedHost &&
        (config.localIps.includes(requestedHost) ||
          requestedHost === "127.0.0.1" ||
          requestedHost === "localhost")
          ? requestedHost
          : config.localIps[0] || "127.0.0.1";
      const shareUrl = `http://${host}:${config.port}/r/${session.roomCode}`;
      const svg = await QRCode.toString(shareUrl, {
        type: "svg",
        margin: 1,
        color: {
          dark: "#102033",
          light: "#FFFFFF"
        }
      });

      response.type("image/svg+xml").send(svg);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sessions/:id/presence", handlePresence("session"));

  app.delete("/api/sessions/:id", async (request, response, next) => {
    try {
      const sessionId = getRequestSessionId(request);
      await uploadStore.cancelUploadsForSession(sessionId);
      const session = await store.clearSession(sessionId);
      if (!session) {
        jsonError(response, 404, SESSION_NOT_FOUND);
        return;
      }

      response.json(session);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sessions/:id/latest", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(store.getLatestIncomingItem(sessionId));
  });

  app.get("/api/sessions/:id/items", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(store.getIncomingItems(sessionId));
  });

  app.get("/api/sessions/:id/outgoing/latest", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(store.getLatestOutgoingItem(sessionId));
  });

  app.get("/api/sessions/:id/outgoing/items", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(store.getOutgoingItems(sessionId));
  });

  app.get("/api/sessions/:id/timeline", (request, response) => {
    const sessionId = getRequestSessionId(request);
    const session = ensureActiveSession(store, sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(store.getTimelineItems(sessionId));
  });

  app.post("/api/sessions/:id/text", handleTextSubmission("incoming", "session"));
  app.post("/api/sessions/:id/files", handleFileUpload("incoming", "session"));
  app.post("/api/sessions/:id/uploads/initiate", handleChunkedUploadInit("incoming", "session"));
  app.post("/api/sessions/:id/outgoing/text", handleTextSubmission("outgoing", "session"));
  app.post("/api/sessions/:id/outgoing/files", handleFileUpload("outgoing", "session"));
  app.post(
    "/api/sessions/:id/outgoing/uploads/initiate",
    handleChunkedUploadInit("outgoing", "session")
  );

  app.get("/api/rooms/:code", (request, response) => {
    const roomCode = getRequestRoomCode(request);
    const sessionId = store.getSessionIdByRoomCode(roomCode);
    if (!sessionId) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }
    if (!enforceRoomPin(store, sessionId, request, response)) {
      return;
    }
    const session = store.getSession(sessionId);
    if (!session) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }

    response.json(session);
  });

  app.get("/api/rooms/:code/state", (request, response) => {
    const roomCode = getRequestRoomCode(request);
    const sessionId = store.getSessionIdByRoomCode(roomCode);
    if (!sessionId || !ensureActiveSession(store, sessionId)) {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }
    if (!enforceRoomPin(store, sessionId, request, response)) {
      return;
    }

    response.json(buildSessionSnapshot(store, sessionId));
  });

  app.post("/api/rooms/:code/presence", handlePresence("room"));
  app.post("/api/rooms/:code/text", handleTextSubmission("incoming", "room"));
  app.post("/api/rooms/:code/files", handleFileUpload("incoming", "room"));
  app.post("/api/rooms/:code/uploads/initiate", handleChunkedUploadInit("incoming", "room"));

  app.get("/api/uploads/:uploadId", (request, response) => {
    const uploadSession = uploadStore.getUpload(parseSessionId(String(request.params.uploadId ?? "")));
    if (!uploadSession) {
      jsonError(response, 404, "Upload not found");
      return;
    }

    response.json(uploadSession);
  });

  app.put(
    "/api/uploads/:uploadId/chunks/:chunkIndex",
    chunkParser,
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const chunkIndex = getRequestChunkIndex(request);
        if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
          jsonError(response, 400, "Chunk index is invalid");
          return;
        }

        const payload =
          request.body instanceof Buffer
            ? request.body
            : Buffer.isBuffer(request.body)
              ? request.body
              : null;
        if (!payload) {
          jsonError(response, 400, "Chunk payload is missing");
          return;
        }

        const uploadSession = await uploadStore.writeChunk(
          parseSessionId(String(request.params.uploadId ?? "")),
          chunkIndex,
          payload
        );
        response.json(uploadSession);
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/uploads/:uploadId/complete", async (request, response, next) => {
    try {
      const item = await uploadStore.completeUpload(
        parseSessionId(String(request.params.uploadId ?? ""))
      );
      response.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/uploads/:uploadId", async (request, response, next) => {
    try {
      await uploadStore.cancelUpload(parseSessionId(String(request.params.uploadId ?? "")));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get("/files/:sessionId/:itemId", async (request, response, next) => {
    try {
      const item = store.findItem(
        parseSessionId(String(request.params.sessionId ?? "")),
        parseSessionId(String(request.params.itemId ?? ""))
      );

      if (!item || !item.filePath) {
        jsonError(response, 404, "File not found");
        return;
      }

      const disposition = shouldInline(item) ? "inline" : "attachment";
      response.type(item.mimeType || "application/octet-stream");
      response.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${sanitizeFileName(item.originalFileName || item.id)}"`
      );
      response.sendFile(item.filePath);
    } catch (error) {
      next(error);
    }
  });

  app.get("/preview/:sessionId/:itemId", async (request, response, next) => {
    try {
      const item = store.findItem(
        parseSessionId(String(request.params.sessionId ?? "")),
        parseSessionId(String(request.params.itemId ?? ""))
      );

      if (!item || !item.filePath) {
        jsonError(response, 404, "Preview not found");
        return;
      }

      if (!isPreviewable(item.type)) {
        jsonError(response, 415, "Preview is not available for this file type");
        return;
      }

      response.type(item.mimeType || "application/octet-stream");
      response.setHeader(
        "Content-Disposition",
        `inline; filename="${sanitizeFileName(item.originalFileName || item.id)}"`
      );
      response.sendFile(item.filePath);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `Each file must be ${config.maxUploadSizeMb} MB or smaller`
          : error.message;
      jsonError(response, 400, message);
      return;
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    if (message === "Session not found" || message === "Session expired") {
      jsonError(response, 404, SESSION_NOT_FOUND);
      return;
    }
    if (message === "Upload not found") {
      jsonError(response, 404, message);
      return;
    }
    if (message === "Upload is incomplete") {
      jsonError(response, 409, message);
      return;
    }
    if (message === ROOM_PIN_ERROR) {
      jsonPinError(response);
      return;
    }
    if (
      message.startsWith("Chunk ") ||
      message === "Chunk payload is empty" ||
      message.startsWith("Each file must be ") ||
      message === "File size must be greater than 0 bytes"
    ) {
      jsonError(response, 400, message);
      return;
    }

    jsonError(response, 500, message);
  });

  let cleanupTimer: NodeJS.Timeout | null = null;
  if (!options.disableCleanupTimer) {
    cleanupTimer = setInterval(() => {
      void store.expireInactiveSessions();
      void uploadStore.expireInactiveUploads();
    }, config.cleanupIntervalMs);
    cleanupTimer.unref();
  }

  const websocketClients = new Map<string, Set<WebSocket>>();

  function broadcast<T>(sessionId: string, event: WsEnvelope<T>): void {
    const clients = websocketClients.get(sessionId);
    if (!clients || clients.size === 0) {
      return;
    }

    const payload = JSON.stringify(event);
    for (const socket of clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  }

  store.on("sessionCreated", (session) => {
    const payload: SessionCreatedPayload = { session };
    broadcast(session.id, {
      event: "session_created",
      sessionId: session.id,
      payload
    });
  });

  store.on("itemAdded", (item, session) => {
    const payload: ItemAddedPayload = {
      item,
      latestIncomingItem: store.getLatestIncomingItem(session.id),
      latestOutgoingItem: store.getLatestOutgoingItem(session.id),
      incomingItems: store.getIncomingItems(session.id),
      outgoingItems: store.getOutgoingItems(session.id),
      timelineItems: store.getTimelineItems(session.id)
    };
    broadcast(session.id, {
      event: "item_added",
      sessionId: session.id,
      payload
    });
  });

  store.on("sessionCleared", (session) => {
    void uploadStore.cancelUploadsForSession(session.id);
    const payload: SessionClearedPayload = { session };
    broadcast(session.id, {
      event: "session_cleared",
      sessionId: session.id,
      payload
    });
  });

  store.on("sessionExpired", (sessionId) => {
    void uploadStore.cancelUploadsForSession(sessionId);
    const payload: SessionExpiredPayload = { sessionId };
    broadcast(sessionId, {
      event: "session_expired",
      sessionId,
      payload
    });
  });

  store.on("presenceUpdated", (session) => {
    const payload: PresenceUpdatedPayload = { session };
    broadcast(session.id, {
      event: "presence_updated",
      sessionId: session.id,
      payload
    });
  });

  function attachRealtime(server: http.Server): void {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit("connection", websocket, request);
      });
    });

    wss.on("connection", (socket, request) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      const sessionId = parseSessionId(url.searchParams.get("sessionId") ?? "");
      if (!sessionId) {
        socket.close(1008, "sessionId required");
        return;
      }

      const bucket = websocketClients.get(sessionId) ?? new Set<WebSocket>();
      bucket.add(socket);
      websocketClients.set(sessionId, bucket);

      const snapshotPayload = buildSessionSnapshot(store, sessionId);
      const event: WsEnvelope<SessionSnapshotPayload> = {
        event: "session_snapshot",
        sessionId,
        payload: snapshotPayload
      };
      socket.send(JSON.stringify(event));

      socket.on("message", (message) => {
        if (message.toString() === "ping") {
          const pongEvent: WsEnvelope<{ ok: true }> = {
            event: "pong",
            sessionId,
            payload: { ok: true }
          };
          socket.send(JSON.stringify(pongEvent));
        }
      });

      socket.on("close", () => {
        const currentBucket = websocketClients.get(sessionId);
        if (!currentBucket) {
          return;
        }

        currentBucket.delete(socket);
        if (currentBucket.size === 0) {
          websocketClients.delete(sessionId);
        }
      });
    });
  }

  return {
    app,
    config,
    store,
    close() {
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
      }
    },
    attachRealtime
  };
}
