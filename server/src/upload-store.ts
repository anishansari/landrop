import fs from "node:fs/promises";
import path from "node:path";

import type { ChunkedUploadSession, ShareItem, ShareItemDirection } from "@landrop/shared";

import { SessionStore } from "./session-store.js";
import { createId, ensureDir, safeRemove, sanitizeFileName } from "./utils.js";

interface UploadRecord {
  id: string;
  sessionId: string;
  direction: ShareItemDirection;
  senderName: string | null;
  originalFileName: string;
  mimeType: string | null;
  size: number;
  chunkSizeBytes: number;
  chunkCount: number;
  receivedBytes: number;
  receivedChunks: Set<number>;
  receivedChunkSizes: Map<number, number>;
  tempPath: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface CreateUploadInput {
  sessionId: string;
  direction: ShareItemDirection;
  senderName?: string | null;
  originalFileName: string;
  mimeType?: string | null;
  size: number;
}

interface UploadStoreOptions {
  storageDir: string;
  chunkSizeBytes: number;
  maxChunkedUploadSizeBytes: number;
  sessionTtlMs: number;
  store: SessionStore;
}

export class UploadStore {
  private readonly uploads = new Map<string, UploadRecord>();

  private readonly uploadDir: string;

  private readonly chunkSizeBytes: number;

  private readonly maxChunkedUploadSizeBytes: number;

  private readonly sessionTtlMs: number;

  private readonly store: SessionStore;

  constructor(options: UploadStoreOptions) {
    this.uploadDir = path.join(options.storageDir, ".chunk-uploads");
    this.chunkSizeBytes = options.chunkSizeBytes;
    this.maxChunkedUploadSizeBytes = options.maxChunkedUploadSizeBytes;
    this.sessionTtlMs = options.sessionTtlMs;
    this.store = options.store;
  }

  async prepare(): Promise<void> {
    await ensureDir(this.uploadDir);
  }

  async createUpload(input: CreateUploadInput, now = Date.now()): Promise<ChunkedUploadSession> {
    if (!this.store.getSession(input.sessionId)) {
      throw new Error("Session not found");
    }

    if (!Number.isFinite(input.size) || input.size <= 0) {
      throw new Error("File size must be greater than 0 bytes");
    }

    if (input.size > this.maxChunkedUploadSizeBytes) {
      throw new Error(
        `Each file must be ${Math.floor(this.maxChunkedUploadSizeBytes / (1024 * 1024 * 1024))} GB or smaller`
      );
    }

    let id = createId(12);
    while (this.uploads.has(id)) {
      id = createId(12);
    }

    const safeOriginalFileName = sanitizeFileName(input.originalFileName);
    const tempPath = path.join(this.uploadDir, `${id}.part`);
    await fs.writeFile(tempPath, new Uint8Array(0));

    const record: UploadRecord = {
      id,
      sessionId: input.sessionId,
      direction: input.direction,
      senderName: input.senderName?.trim() || null,
      originalFileName: safeOriginalFileName,
      mimeType: input.mimeType?.trim() || null,
      size: input.size,
      chunkSizeBytes: this.chunkSizeBytes,
      chunkCount: Math.ceil(input.size / this.chunkSizeBytes),
      receivedBytes: 0,
      receivedChunks: new Set<number>(),
      receivedChunkSizes: new Map<number, number>(),
      tempPath,
      createdAtMs: now,
      updatedAtMs: now
    };

    this.uploads.set(record.id, record);
    this.store.touchSession(record.sessionId, now);
    return this.serialize(record);
  }

  getUpload(uploadId: string): ChunkedUploadSession | null {
    const record = this.uploads.get(uploadId);
    return record ? this.serialize(record) : null;
  }

  async writeChunk(uploadId: string, chunkIndex: number, payload: Buffer, now = Date.now()): Promise<ChunkedUploadSession> {
    const record = this.requireUpload(uploadId);

    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= record.chunkCount) {
      throw new Error("Chunk index is out of range");
    }

    if (payload.length === 0) {
      throw new Error("Chunk payload is empty");
    }

    const expectedChunkSize = this.getExpectedChunkSize(record, chunkIndex);
    if (payload.length !== expectedChunkSize) {
      throw new Error(`Chunk ${chunkIndex + 1} must be ${expectedChunkSize} bytes`);
    }

    const existingChunkSize = record.receivedChunkSizes.get(chunkIndex);
    if (existingChunkSize !== undefined && existingChunkSize !== payload.length) {
      throw new Error(`Chunk ${chunkIndex + 1} size does not match the original upload`);
    }

    const handle = await fs.open(record.tempPath, "r+");
    try {
      await handle.write(payload, 0, payload.length, chunkIndex * record.chunkSizeBytes);
    } finally {
      await handle.close();
    }

    if (!record.receivedChunks.has(chunkIndex)) {
      record.receivedChunks.add(chunkIndex);
      record.receivedChunkSizes.set(chunkIndex, payload.length);
      record.receivedBytes += payload.length;
    }

    record.updatedAtMs = now;
    this.store.touchSession(record.sessionId, now);
    return this.serialize(record);
  }

  async completeUpload(uploadId: string, now = Date.now()): Promise<ShareItem> {
    const record = this.requireUpload(uploadId);

    if (record.receivedChunks.size !== record.chunkCount || record.receivedBytes !== record.size) {
      throw new Error("Upload is incomplete");
    }

    const [item] = await this.store.addFiles(
      record.sessionId,
      [
        {
          path: record.tempPath,
          originalname: record.originalFileName,
          mimetype: record.mimeType || "application/octet-stream",
          size: record.size
        }
      ],
      record.direction,
      now,
      record.senderName
    );

    this.uploads.delete(uploadId);
    if (!item) {
      throw new Error("Unexpected server error");
    }
    return item;
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const record = this.uploads.get(uploadId);
    if (!record) {
      return;
    }

    this.uploads.delete(uploadId);
    await safeRemove(record.tempPath);
  }

  async cancelUploadsForSession(sessionId: string): Promise<void> {
    const matchingIds = [...this.uploads.values()]
      .filter((record) => record.sessionId === sessionId)
      .map((record) => record.id);

    await Promise.all(matchingIds.map((uploadId) => this.cancelUpload(uploadId)));
  }

  async expireInactiveUploads(now = Date.now()): Promise<string[]> {
    const expiredIds: string[] = [];

    for (const record of this.uploads.values()) {
      if (record.updatedAtMs + this.sessionTtlMs <= now || !this.store.getSession(record.sessionId)) {
        expiredIds.push(record.id);
      }
    }

    await Promise.all(expiredIds.map((uploadId) => this.cancelUpload(uploadId)));
    return expiredIds;
  }

  private requireUpload(uploadId: string): UploadRecord {
    const record = this.uploads.get(uploadId);
    if (!record) {
      throw new Error("Upload not found");
    }

    if (!this.store.getSession(record.sessionId)) {
      throw new Error("Session expired");
    }

    return record;
  }

  private getExpectedChunkSize(record: UploadRecord, chunkIndex: number): number {
    const remaining = record.size - chunkIndex * record.chunkSizeBytes;
    return Math.min(record.chunkSizeBytes, remaining);
  }

  private serialize(record: UploadRecord): ChunkedUploadSession {
    return {
      id: record.id,
      sessionId: record.sessionId,
      direction: record.direction,
      originalFileName: record.originalFileName,
      mimeType: record.mimeType,
      size: record.size,
      chunkSizeBytes: record.chunkSizeBytes,
      chunkCount: record.chunkCount,
      receivedBytes: record.receivedBytes,
      receivedChunkCount: record.receivedChunks.size,
      createdAt: new Date(record.createdAtMs).toISOString(),
      updatedAt: new Date(record.updatedAtMs).toISOString()
    };
  }
}
