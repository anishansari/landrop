export type ShareItemType = "text" | "url" | "note" | "image" | "video" | "pdf" | "file";

export type ShareSessionStatus = "active" | "expired";

export type ShareItemDirection = "incoming" | "outgoing";

export type ShareDeviceRole = "mac" | "phone";

export type SharePresenceSource = "dashboard" | "phone" | "extension";

export interface ShareParticipant {
  id: string;
  sessionId: string;
  name: string;
  role: ShareDeviceRole;
  source: SharePresenceSource;
  joinedAt: string;
  lastSeenAt: string;
  isHost: boolean;
}

export interface ShareItem {
  id: string;
  sessionId: string;
  type: ShareItemType;
  direction: ShareItemDirection;
  sender: ShareDeviceRole;
  recipient: ShareDeviceRole;
  senderName: string;
  title: string | null;
  textContent: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  filePath: string | null;
  downloadUrl: string | null;
  previewUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface ShareSession {
  id: string;
  roomCode: string;
  pinEnabled: boolean;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: ShareSessionStatus;
  items: ShareItem[];
  incomingCount: number;
  outgoingCount: number;
  participantCount: number;
  participants: ShareParticipant[];
}

export interface ServerConfig {
  appName: string;
  version: string;
  port: number;
  localIps: string[];
  storageDir: string;
  receivedFilesDir: string;
  sessionTtlMinutes: number;
  maxUploadSizeMb: number;
  chunkUploadSizeMb: number;
  maxChunkedUploadSizeGb: number;
}

export type WsEventType =
  | "session_created"
  | "session_snapshot"
  | "item_added"
  | "session_cleared"
  | "session_expired"
  | "presence_updated"
  | "pong";

export interface WsEnvelope<T = unknown> {
  event: WsEventType;
  sessionId: string | null;
  payload: T;
}

export interface SessionSnapshotPayload {
  session: ShareSession | null;
  latestIncomingItem: ShareItem | null;
  latestOutgoingItem: ShareItem | null;
  incomingItems: ShareItem[];
  outgoingItems: ShareItem[];
  timelineItems: ShareItem[];
}

export interface SessionCreatedPayload {
  session: ShareSession;
}

export interface ItemAddedPayload {
  item: ShareItem;
  latestIncomingItem: ShareItem | null;
  latestOutgoingItem: ShareItem | null;
  incomingItems: ShareItem[];
  outgoingItems: ShareItem[];
  timelineItems: ShareItem[];
}

export interface SessionClearedPayload {
  session: ShareSession;
}

export interface SessionExpiredPayload {
  sessionId: string;
}

export interface PresenceUpdatedPayload {
  session: ShareSession;
}

export type TextSubmissionMode = "text" | "note" | "url";

export interface ChunkedUploadSession {
  id: string;
  sessionId: string;
  direction: ShareItemDirection;
  originalFileName: string;
  mimeType: string | null;
  size: number;
  chunkSizeBytes: number;
  chunkCount: number;
  receivedBytes: number;
  receivedChunkCount: number;
  createdAt: string;
  updatedAt: string;
}
