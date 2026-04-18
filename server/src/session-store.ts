import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import type {
  ShareDeviceRole,
  ShareItem,
  ShareItemDirection,
  ShareParticipant,
  SharePresenceSource,
  ShareSession,
  ShareSessionStatus,
  TextSubmissionMode
} from "@landrop/shared";

import {
  buildTextItemTitle,
  classifyItemType,
  createId,
  createRoomCode,
  ensureDir,
  isPreviewable,
  safeRemove,
  sanitizeFileName,
  sanitizeParticipantName,
  sanitizeTextInput,
  sanitizeTitle,
  toDownloadUrl,
  toPreviewUrl
} from "./utils.js";

interface ParticipantRecord {
  id: string;
  name: string;
  role: ShareDeviceRole;
  source: SharePresenceSource;
  joinedAtMs: number;
  lastSeenAtMs: number;
  isHost: boolean;
}

interface SessionRecord {
  id: string;
  roomCode: string;
  pinHash: string | null;
  createdAtMs: number;
  lastActivityAtMs: number;
  expiresAtMs: number;
  status: ShareSessionStatus;
  items: ShareItem[];
  participants: Map<string, ParticipantRecord>;
  directoryPath: string;
}

export interface UploadedFileInput {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface PresenceInput {
  participantId: string;
  name?: string | null;
  role: ShareDeviceRole;
  source: SharePresenceSource;
  isHost?: boolean;
}

interface SessionStoreOptions {
  storageDir: string;
  receivedFilesDir: string;
  sessionTtlMs: number;
}

export interface SessionStoreEvents {
  sessionCreated: (session: ShareSession) => void;
  itemAdded: (item: ShareItem, session: ShareSession) => void;
  sessionCleared: (session: ShareSession) => void;
  sessionExpired: (sessionId: string) => void;
  presenceUpdated: (session: ShareSession) => void;
}

const PARTICIPANT_TTL_MS = 45_000;

function partiesForDirection(direction: ShareItemDirection): {
  sender: ShareDeviceRole;
  recipient: ShareDeviceRole;
} {
  return direction === "incoming"
    ? { sender: "phone", recipient: "mac" }
    : { sender: "mac", recipient: "phone" };
}

function fallbackSenderName(direction: ShareItemDirection): string {
  return direction === "incoming" ? "Phone" : "Mac";
}

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export class SessionStore extends EventEmitter {
  private readonly sessions = new Map<string, SessionRecord>();

  private readonly roomCodeIndex = new Map<string, string>();

  private readonly storageDir: string;

  private readonly receivedFilesDir: string;

  private readonly sessionTtlMs: number;

  constructor(options: SessionStoreOptions) {
    super();
    this.storageDir = options.storageDir;
    this.receivedFilesDir = options.receivedFilesDir;
    this.sessionTtlMs = options.sessionTtlMs;
  }

  async prepare(): Promise<void> {
    await ensureDir(this.storageDir);
    await ensureDir(this.receivedFilesDir);
  }

  createSession(now = Date.now(), pin: string | null = null): ShareSession {
    let id = createId(10);
    while (this.sessions.has(id)) {
      id = createId(10);
    }

    let roomCode = createRoomCode(5);
    while (this.roomCodeIndex.has(roomCode)) {
      roomCode = createRoomCode(5);
    }

    const directoryPath = path.join(this.storageDir, id);
    const record: SessionRecord = {
      id,
      roomCode,
      pinHash: pin ? hashPin(pin) : null,
      createdAtMs: now,
      lastActivityAtMs: now,
      expiresAtMs: now + this.sessionTtlMs,
      status: "active",
      items: [],
      participants: new Map(),
      directoryPath
    };

    this.sessions.set(id, record);
    this.roomCodeIndex.set(roomCode, id);
    const session = this.serializeSession(record, now);
    this.emit("sessionCreated", session);
    return session;
  }

  setSessionPin(sessionId: string, pin: string | null, now = Date.now()): ShareSession | null {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return null;
    }

    record.pinHash = pin ? hashPin(pin) : null;
    this.touch(record, now);
    const session = this.serializeSession(record, now);
    this.emit("presenceUpdated", session);
    return session;
  }

  verifySessionPin(sessionId: string, pin: string | null | undefined): boolean {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return false;
    }
    if (!record.pinHash) {
      return true;
    }
    if (!pin) {
      return false;
    }
    return hashPin(pin) === record.pinHash;
  }

  isSessionPinEnabled(sessionId: string): boolean {
    const record = this.getActiveRecord(sessionId);
    return Boolean(record?.pinHash);
  }

  getSession(sessionId: string): ShareSession | null {
    const record = this.getActiveRecord(sessionId);
    return record ? this.serializeSession(record) : null;
  }

  getSessionByRoomCode(roomCode: string): ShareSession | null {
    const record = this.getActiveRecordByRoomCode(roomCode);
    return record ? this.serializeSession(record) : null;
  }

  getSessionIdByRoomCode(roomCode: string): string | null {
    const normalized = roomCode.trim().toUpperCase();
    return this.roomCodeIndex.get(normalized) ?? null;
  }

  getLatestItem(sessionId: string): ShareItem | null {
    return this.getLatestIncomingItem(sessionId);
  }

  getLatestIncomingItem(sessionId: string): ShareItem | null {
    return this.getLatestByDirection(sessionId, "incoming");
  }

  getLatestOutgoingItem(sessionId: string): ShareItem | null {
    return this.getLatestByDirection(sessionId, "outgoing");
  }

  getItems(sessionId: string): ShareItem[] {
    return this.getIncomingItems(sessionId);
  }

  getIncomingItems(sessionId: string): ShareItem[] {
    return this.getItemsByDirection(sessionId, "incoming");
  }

  getOutgoingItems(sessionId: string): ShareItem[] {
    return this.getItemsByDirection(sessionId, "outgoing");
  }

  getTimelineItems(sessionId: string): ShareItem[] {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return [];
    }

    return [...record.items].reverse().map((item) => structuredClone(item));
  }

  async clearSession(sessionId: string, now = Date.now()): Promise<ShareSession | null> {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return null;
    }

    await safeRemove(record.directoryPath);
    record.items = [];
    this.touch(record, now);
    const session = this.serializeSession(record, now);
    this.emit("sessionCleared", session);
    return session;
  }

  touchSession(sessionId: string, now = Date.now()): ShareSession | null {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return null;
    }

    this.touch(record, now);
    return this.serializeSession(record, now);
  }

  upsertParticipant(sessionId: string, input: PresenceInput, now = Date.now()): ShareSession {
    const record = this.requireActiveRecord(sessionId);
    const existing = record.participants.get(input.participantId);
    const fallbackName =
      input.role === "mac"
        ? input.source === "dashboard"
          ? "Mac dashboard"
          : input.source === "extension"
            ? "Mac extension"
            : "Mac"
        : "Phone";

    const participant: ParticipantRecord = existing
      ? {
          ...existing,
          name: sanitizeParticipantName(input.name, existing.name || fallbackName),
          role: input.role,
          source: input.source,
          lastSeenAtMs: now,
          isHost: input.isHost ?? existing.isHost
        }
      : {
          id: input.participantId,
          name: sanitizeParticipantName(input.name, fallbackName),
          role: input.role,
          source: input.source,
          joinedAtMs: now,
          lastSeenAtMs: now,
          isHost: input.isHost ?? false
        };

    record.participants.set(participant.id, participant);
    this.touch(record, now);
    const session = this.serializeSession(record, now);
    this.emit("presenceUpdated", session);
    return session;
  }

  async addTextItem(
    sessionId: string,
    mode: TextSubmissionMode,
    content: string,
    title?: string | null,
    direction: ShareItemDirection = "incoming",
    now = Date.now(),
    senderName?: string | null
  ): Promise<ShareItem> {
    const record = this.requireActiveRecord(sessionId);
    const cleanedContent = sanitizeTextInput(content, mode === "url" ? 2048 : 8000);
    const cleanedTitle = sanitizeTitle(title);
    const { sender, recipient } = partiesForDirection(direction);

    const item: ShareItem = {
      id: createId(12),
      sessionId,
      type: mode,
      direction,
      sender,
      recipient,
      senderName: sanitizeParticipantName(senderName, fallbackSenderName(direction)),
      title: buildTextItemTitle(mode, cleanedContent, cleanedTitle),
      textContent: cleanedContent,
      originalFileName: null,
      mimeType: "text/plain",
      size: Buffer.byteLength(cleanedContent, "utf8"),
      createdAt: new Date(now).toISOString(),
      filePath: null,
      downloadUrl: null,
      previewUrl: null,
      metadata: {}
    };

    record.items.push(item);
    this.touch(record, now);
    const session = this.serializeSession(record, now);
    this.emit("itemAdded", structuredClone(item), session);
    return structuredClone(item);
  }

  async addFiles(
    sessionId: string,
    files: UploadedFileInput[],
    direction: ShareItemDirection = "incoming",
    now = Date.now(),
    senderName?: string | null
  ): Promise<ShareItem[]> {
    const record = this.requireActiveRecord(sessionId);
    const targetDirectory =
      direction === "incoming"
        ? path.join(this.receivedFilesDir, sessionId)
        : record.directoryPath;
    await ensureDir(targetDirectory);
    const { sender, recipient } = partiesForDirection(direction);

    const createdItems: ShareItem[] = [];

    for (const uploadedFile of files) {
      const itemId = createId(12);
      const safeOriginalFileName = sanitizeFileName(uploadedFile.originalname);
      const extension = path.extname(safeOriginalFileName);
      const targetFileName =
        direction === "incoming"
          ? `${itemId}-${safeOriginalFileName}`
          : extension
            ? `${itemId}${extension.toLowerCase()}`
            : itemId;
      const targetPath = path.join(targetDirectory, targetFileName);

      await fs.rename(uploadedFile.path, targetPath);

      const type = classifyItemType(uploadedFile.mimetype, safeOriginalFileName);
      const item: ShareItem = {
        id: itemId,
        sessionId,
        type,
        direction,
        sender,
        recipient,
        senderName: sanitizeParticipantName(senderName, fallbackSenderName(direction)),
        title: safeOriginalFileName,
        textContent: null,
        originalFileName: safeOriginalFileName,
        mimeType: uploadedFile.mimetype || null,
        size: uploadedFile.size,
        createdAt: new Date(now).toISOString(),
        filePath: targetPath,
        downloadUrl: toDownloadUrl(sessionId, itemId),
        previewUrl: isPreviewable(type) ? toPreviewUrl(sessionId, itemId) : null,
        metadata: {
          storedFileName: targetFileName,
          savedPath: targetPath,
          savedDirectory: targetDirectory,
          persistent: direction === "incoming"
        }
      };

      record.items.push(item);
      createdItems.push(structuredClone(item));
    }

    this.touch(record, now);
    const session = this.serializeSession(record, now);

    for (const item of createdItems) {
      this.emit("itemAdded", structuredClone(item), session);
    }

    return createdItems;
  }

  findItem(sessionId: string, itemId: string): ShareItem | null {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return null;
    }

    const item = record.items.find((candidate) => candidate.id === itemId);
    return item ? structuredClone(item) : null;
  }

  async expireInactiveSessions(now = Date.now()): Promise<string[]> {
    const expiredIds: string[] = [];

    for (const record of this.sessions.values()) {
      this.cleanupStaleParticipants(record, now);
      if (record.expiresAtMs <= now) {
        expiredIds.push(record.id);
        await this.expireOne(record);
      }
    }

    return expiredIds;
  }

  override on<K extends keyof SessionStoreEvents>(eventName: K, listener: SessionStoreEvents[K]): this {
    return super.on(eventName, listener);
  }

  override emit<K extends keyof SessionStoreEvents>(
    eventName: K,
    ...args: Parameters<SessionStoreEvents[K]>
  ): boolean {
    return super.emit(eventName, ...args);
  }

  private getLatestByDirection(sessionId: string, direction: ShareItemDirection): ShareItem | null {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return null;
    }

    const item = [...record.items].reverse().find((candidate) => candidate.direction === direction);
    return item ? structuredClone(item) : null;
  }

  private getItemsByDirection(sessionId: string, direction: ShareItemDirection): ShareItem[] {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      return [];
    }

    return [...record.items]
      .reverse()
      .filter((item) => item.direction === direction)
      .map((item) => structuredClone(item));
  }

  private getActiveRecordByRoomCode(roomCode: string): SessionRecord | null {
    const sessionId = this.roomCodeIndex.get(roomCode.trim().toUpperCase());
    if (!sessionId) {
      return null;
    }

    return this.getActiveRecord(sessionId);
  }

  private getActiveRecord(sessionId: string): SessionRecord | null {
    const record = this.sessions.get(sessionId);
    if (!record) {
      return null;
    }

    this.cleanupStaleParticipants(record);
    if (record.expiresAtMs <= Date.now()) {
      void this.expireOne(record);
      return null;
    }

    return record;
  }

  private requireActiveRecord(sessionId: string): SessionRecord {
    const record = this.getActiveRecord(sessionId);
    if (!record) {
      throw new Error("Session not found");
    }

    return record;
  }

  private cleanupStaleParticipants(record: SessionRecord, now = Date.now()): void {
    for (const [participantId, participant] of record.participants.entries()) {
      if (participant.lastSeenAtMs + PARTICIPANT_TTL_MS <= now) {
        record.participants.delete(participantId);
      }
    }
  }

  private touch(record: SessionRecord, now = Date.now()): void {
    record.lastActivityAtMs = now;
    record.expiresAtMs = now + this.sessionTtlMs;
  }

  private serializeSession(record: SessionRecord, now = Date.now()): ShareSession {
    this.cleanupStaleParticipants(record, now);
    const incomingCount = record.items.filter((item) => item.direction === "incoming").length;
    const outgoingCount = record.items.filter((item) => item.direction === "outgoing").length;
    const participants = [...record.participants.values()]
      .sort((left, right) => left.joinedAtMs - right.joinedAtMs)
      .map<ShareParticipant>((participant) => ({
        id: participant.id,
        sessionId: record.id,
        name: participant.name,
        role: participant.role,
        source: participant.source,
        joinedAt: new Date(participant.joinedAtMs).toISOString(),
        lastSeenAt: new Date(participant.lastSeenAtMs).toISOString(),
        isHost: participant.isHost
      }));

    return {
      id: record.id,
      roomCode: record.roomCode,
      pinEnabled: Boolean(record.pinHash),
      createdAt: new Date(record.createdAtMs).toISOString(),
      lastActivityAt: new Date(record.lastActivityAtMs).toISOString(),
      expiresAt: new Date(record.expiresAtMs).toISOString(),
      status: record.status,
      items: [...record.items].reverse().map((item) => structuredClone(item)),
      incomingCount,
      outgoingCount,
      participantCount: participants.length,
      participants
    };
  }

  private async expireOne(record: SessionRecord): Promise<void> {
    this.sessions.delete(record.id);
    this.roomCodeIndex.delete(record.roomCode);
    await safeRemove(record.directoryPath);
    this.emit("sessionExpired", record.id);
  }
}
