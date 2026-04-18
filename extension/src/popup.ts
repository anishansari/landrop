import QRCode from "qrcode";

import type {
  ChunkedUploadSession,
  ServerConfig,
  SessionSnapshotPayload,
  ShareItem,
  ShareSession,
  WsEnvelope
} from "@landrop/shared";

type RealtimeMode = "idle" | "websocket" | "polling" | "offline";

interface PopupState {
  config: ServerConfig | null;
  serverBase: string | null;
  sessionId: string | null;
  session: ShareSession | null;
  timelineItems: ShareItem[];
  selectedFiles: File[];
  preferredIp: string | null;
  realtimeMode: RealtimeMode;
}

const SESSION_KEY = "landrop.currentSessionId";
const SERVER_CANDIDATES = ["http://127.0.0.1:8787", "http://localhost:8787"];
const DEFAULT_HELPER_HEALTH_URL = `${SERVER_CANDIDATES[0]}/api/health`;

const state: PopupState = {
  config: null,
  serverBase: null,
  sessionId: null,
  session: null,
  timelineItems: [],
  selectedFiles: [],
  preferredIp: null,
  realtimeMode: "idle"
};

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let pollingTimer: number | null = null;
let countdownTimer: number | null = null;

const elements = {
  statusText: document.getElementById("status-text") as HTMLParagraphElement,
  helperWarning: document.getElementById("helper-warning") as HTMLElement,
  helperUrl: document.getElementById("helper-url") as HTMLElement,
  localIp: document.getElementById("local-ip") as HTMLElement,
  roomCode: document.getElementById("room-code") as HTMLElement,
  peopleCount: document.getElementById("people-count") as HTMLElement,
  countdown: document.getElementById("countdown") as HTMLElement,
  shareUrl: document.getElementById("share-url") as HTMLElement,
  qrCode: document.getElementById("qr-code") as HTMLCanvasElement,
  realtimeState: document.getElementById("realtime-state") as HTMLElement,
  networkWarning: document.getElementById("network-warning") as HTMLElement,
  participantList: document.getElementById("participant-list") as HTMLElement,
  createSession: document.getElementById("create-session") as HTMLButtonElement,
  refresh: document.getElementById("refresh") as HTMLButtonElement,
  retryHelper: document.getElementById("retry-helper") as HTMLButtonElement,
  copyHelperUrl: document.getElementById("copy-helper-url") as HTMLButtonElement,
  copyUrl: document.getElementById("copy-url") as HTMLButtonElement,
  copyRoomCode: document.getElementById("copy-room-code") as HTMLButtonElement,
  openDashboard: document.getElementById("open-dashboard") as HTMLButtonElement,
  openJoinPage: document.getElementById("open-join-page") as HTMLButtonElement,
  clearSession: document.getElementById("clear-session") as HTMLButtonElement,
  composerInput: document.getElementById("composer-input") as HTMLTextAreaElement,
  composerHint: document.getElementById("composer-hint") as HTMLElement,
  fileInput: document.getElementById("file-input") as HTMLInputElement,
  selectedFiles: document.getElementById("selected-files") as HTMLUListElement,
  sendContent: document.getElementById("send-content") as HTMLButtonElement,
  attachFiles: document.getElementById("attach-files") as HTMLButtonElement,
  useCurrentTab: document.getElementById("use-current-tab") as HTMLButtonElement,
  activityList: document.getElementById("activity-list") as HTMLUListElement,
  activityEmpty: document.getElementById("activity-empty") as HTMLTemplateElement
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function preferIp(localIps: string[]): string | null {
  return localIps[0] ?? null;
}

function getShareUrl(): string | null {
  if (!state.preferredIp || !state.session || !state.config) {
    return null;
  }

  return `http://${state.preferredIp}:${state.config.port}/r/${state.session.roomCode}`;
}

function getDashboardUrl(): string | null {
  if (!state.serverBase || !state.sessionId) {
    return null;
  }

  const url = new URL("/dashboard", state.serverBase);
  url.searchParams.set("session", state.sessionId);
  if (state.preferredIp) {
    url.searchParams.set("host", state.preferredIp);
  }
  return url.toString();
}

function getJoinPageUrl(): string | null {
  if (!state.serverBase) {
    return null;
  }

  return new URL("/join", state.serverBase).toString();
}

function getHelperHealthUrl(): string {
  if (!state.serverBase) {
    return DEFAULT_HELPER_HEALTH_URL;
  }

  return `${state.serverBase}/api/health`;
}

function looksLikeUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function inferTextMode(value: string): "url" | "note" | "text" {
  const trimmed = value.trim();
  if (looksLikeUrl(trimmed)) {
    return "url";
  }
  if (trimmed.includes("\n") || trimmed.length > 160) {
    return "note";
  }
  return "text";
}

function formatTime(input: string): string {
  return new Date(input).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatCountdown(expiresAt: string | null): string {
  if (!expiresAt) {
    return "-";
  }

  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatSize(size: number | null): string {
  if (!size) {
    return "";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function absoluteUrl(relativeUrl: string | null): string | null {
  if (!relativeUrl || !state.serverBase) {
    return null;
  }
  return new URL(relativeUrl, state.serverBase).toString();
}

function getSavedPath(item: ShareItem): string | null {
  const candidate = item.metadata.savedPath;
  return typeof candidate === "string" ? candidate : null;
}

function getComposerSummary(): string {
  const text = elements.composerInput.value.trim();
  const fileCount = state.selectedFiles.length;

  if (!text && fileCount === 0) {
    return "Nothing queued yet.";
  }

  if (text && fileCount > 0) {
    return `Ready to share ${inferTextMode(text)} plus ${fileCount} file${fileCount === 1 ? "" : "s"}.`;
  }

  if (text) {
    return `Ready to share ${inferTextMode(text)}.`;
  }

  return `Ready to share ${fileCount} file${fileCount === 1 ? "" : "s"}.`;
}

function applySnapshot(payload: SessionSnapshotPayload): void {
  state.session = payload.session;
  state.timelineItems = payload.timelineItems;
}

function clearSessionState(): void {
  state.session = null;
  state.timelineItems = [];
}

async function saveSessionId(sessionId: string | null): Promise<void> {
  state.sessionId = sessionId;
  await chrome.storage.local.set({ [SESSION_KEY]: sessionId });
}

async function loadSessionId(): Promise<string | null> {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const storedValue = result[SESSION_KEY];
  return typeof storedValue === "string" ? storedValue : null;
}

async function probeServer(): Promise<void> {
  for (const candidate of SERVER_CANDIDATES) {
    try {
      const response = await fetch(`${candidate}/api/config`, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const config = (await response.json()) as ServerConfig;
      state.serverBase = candidate;
      state.config = config;
      state.preferredIp = preferIp(config.localIps);
      return;
    } catch {
      // Try the next candidate.
    }
  }

  state.serverBase = null;
  state.config = null;
  state.preferredIp = null;
}

function stopRealtime(): void {
  if (socket) {
    const currentSocket = socket;
    socket = null;
    currentSocket.close();
  }
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (pollingTimer) {
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function setRealtimeMode(mode: RealtimeMode): void {
  state.realtimeMode = mode;
  elements.realtimeState.textContent =
    mode === "websocket" ? "Live" : mode === "polling" ? "Polling" : mode === "offline" ? "Offline" : "Idle";
  elements.realtimeState.className = "pill";
  if (mode === "websocket") {
    elements.realtimeState.classList.add("live");
  }
  if (mode === "polling") {
    elements.realtimeState.classList.add("polling");
  }
}

async function fetchJson<T>(urlPath: string): Promise<T> {
  if (!state.serverBase) {
    throw new Error("Server is offline");
  }

  const response = await fetch(`${state.serverBase}${urlPath}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  return (await response.json()) as T;
}

async function refreshSessionState(): Promise<void> {
  if (!state.sessionId) {
    clearSessionState();
    await render();
    return;
  }

  if (!state.serverBase) {
    setRealtimeMode("offline");
    await render();
    return;
  }

  try {
    const payload = await fetchJson<SessionSnapshotPayload>(
      `/api/sessions/${encodeURIComponent(state.sessionId)}/state`
    );
    applySnapshot(payload);
  } catch (error) {
    if (String(error).includes("404")) {
      clearSessionState();
      await saveSessionId(null);
    }
  }

  await render();
}

function startPolling(): void {
  if (pollingTimer) {
    return;
  }
  setRealtimeMode("polling");
  pollingTimer = window.setInterval(() => {
    void refreshSessionState();
  }, 2000);
}

function connectRealtime(): void {
  stopRealtime();

  if (!state.serverBase || !state.sessionId) {
    setRealtimeMode(state.serverBase ? "idle" : "offline");
    return;
  }

  const wsUrl = `${state.serverBase.replace("http://", "ws://")}/ws?sessionId=${encodeURIComponent(state.sessionId)}`;
  const currentSocket = new WebSocket(wsUrl);
  socket = currentSocket;

  currentSocket.addEventListener("open", () => {
    setRealtimeMode("websocket");
    if (pollingTimer) {
      window.clearInterval(pollingTimer);
      pollingTimer = null;
    }
  });

  currentSocket.addEventListener("message", (event) => {
    const envelope = JSON.parse(event.data) as WsEnvelope;

    if (envelope.event === "session_snapshot") {
      applySnapshot(envelope.payload as SessionSnapshotPayload);
      void render();
      return;
    }

    if (
      envelope.event === "item_added" ||
      envelope.event === "session_cleared" ||
      envelope.event === "presence_updated"
    ) {
      void refreshSessionState();
      return;
    }

    if (envelope.event === "session_expired") {
      void saveSessionId(null);
      clearSessionState();
      void render();
    }
  });

  const fallbackToPolling = () => {
    if (!state.serverBase || !state.sessionId) {
      return;
    }
    startPolling();
    reconnectTimer = window.setTimeout(() => {
      connectRealtime();
    }, 2500);
  };

  currentSocket.addEventListener("close", () => {
    if (socket !== currentSocket) {
      return;
    }
    fallbackToPolling();
  });

  currentSocket.addEventListener("error", () => {
    if (socket !== currentSocket) {
      return;
    }
    fallbackToPolling();
  });
}

async function drawQrCode(url: string | null): Promise<void> {
  const context = elements.qrCode.getContext("2d");
  context?.clearRect(0, 0, elements.qrCode.width, elements.qrCode.height);

  if (!url) {
    if (context) {
      context.fillStyle = "#eef3f9";
      context.fillRect(0, 0, elements.qrCode.width, elements.qrCode.height);
      context.fillStyle = "#718198";
      context.font = "12px Avenir Next";
      context.textAlign = "center";
      context.fillText("No room yet", elements.qrCode.width / 2, elements.qrCode.height / 2);
    }
    return;
  }

  await QRCode.toCanvas(elements.qrCode, url, {
    width: 160,
    margin: 1,
    color: {
      dark: "#102033",
      light: "#ffffff"
    }
  });
}

function renderSelectedFiles(): void {
  elements.selectedFiles.innerHTML = "";
  elements.selectedFiles.classList.toggle("hidden", state.selectedFiles.length === 0);
  for (const file of state.selectedFiles) {
    const entry = document.createElement("li");
    entry.className = "history-card";
    entry.innerHTML = `
      <div class="item-title">${escapeHtml(file.name)}</div>
      <div class="meta">${escapeHtml(formatSize(file.size))}</div>
    `;
    elements.selectedFiles.appendChild(entry);
  }
  elements.composerHint.textContent = getComposerSummary();
}

function renderParticipants(): void {
  elements.participantList.innerHTML = "";
  const participants = state.session?.participants || [];
  if (!participants.length) {
    elements.participantList.innerHTML = '<span class="chip type">Nobody joined yet.</span>';
    return;
  }

  for (const participant of participants) {
    const chip = document.createElement("span");
    chip.className = `chip type${participant.isHost ? " host" : ""}`;
    chip.textContent = `${participant.name}${participant.isHost ? " · Host" : ""}`;
    elements.participantList.appendChild(chip);
  }
}

function renderTimeline(): void {
  elements.activityList.innerHTML = "";

  if (state.timelineItems.length === 0) {
    elements.activityList.appendChild(elements.activityEmpty.content.cloneNode(true));
    return;
  }

  for (const item of state.timelineItems.slice(0, 10)) {
    const flowLabel =
      item.direction === "incoming" ? `From ${item.senderName}` : `Sent by ${item.senderName}`;
    const flowClass = item.direction === "incoming" ? "direction-incoming" : "direction-outgoing";
    const savedPath = getSavedPath(item);
    const previewUrl = absoluteUrl(item.previewUrl);
    const downloadUrl = absoluteUrl(item.downloadUrl);
    const actions: string[] = [];

    if ((item.type === "text" || item.type === "note" || item.type === "url") && item.textContent) {
      actions.push(`<button data-copy="${escapeHtml(item.textContent)}">Copy</button>`);
    }
    if (item.type === "url" && item.textContent) {
      actions.push(`<a href="${escapeHtml(item.textContent)}" target="_blank" rel="noreferrer">Open link</a>`);
    } else if (downloadUrl) {
      actions.push(`<a href="${escapeHtml(downloadUrl)}" target="_blank" rel="noreferrer">Open file</a>`);
    }

    const previewMarkup =
      item.type === "image" && previewUrl
        ? `<img class="item-preview" alt="${escapeHtml(item.title || "Shared image")}" src="${escapeHtml(previewUrl)}" />`
        : item.type === "video" && previewUrl
          ? `<video class="item-preview" controls muted src="${escapeHtml(previewUrl)}"></video>`
          : "";

    const body = item.textContent
      ? `<div class="item-body">${escapeHtml(item.textContent)}</div>`
      : `<div class="meta">${escapeHtml(item.originalFileName || item.mimeType || "File")} ${escapeHtml(formatSize(item.size))}</div>${
          savedPath ? `<div class="meta">Saved to ${escapeHtml(savedPath)}</div>` : ""
        }`;

    const entry = document.createElement("li");
    entry.className = "history-card";
    entry.innerHTML = `
      <div class="item-title">${escapeHtml(item.title || item.originalFileName || item.type)}</div>
      <div class="timeline-badges">
        <span class="chip ${flowClass}">${escapeHtml(flowLabel)}</span>
        <span class="chip type">${escapeHtml(item.type.toUpperCase())}</span>
        <span class="chip type">${escapeHtml(formatTime(item.createdAt))}</span>
      </div>
      ${previewMarkup}
      ${body}
      ${actions.length > 0 ? `<div class="item-actions">${actions.join("")}</div>` : ""}
    `;
    elements.activityList.appendChild(entry);
  }
}

function renderStatus(): void {
  if (!state.config || !state.serverBase) {
    elements.statusText.textContent =
      "LanDrop helper is not running on this Mac. Start the local helper/server, then retry.";
    return;
  }

  if (!state.session) {
    elements.statusText.textContent =
      state.sessionId === null
        ? "Server ready. Create a temporary room to share."
        : "Saved room is no longer active. Create a new room.";
    return;
  }

  elements.statusText.textContent =
    `Room ${state.session.roomCode} live on ${state.preferredIp || "LAN unavailable"} · ${state.session.participantCount} participant${
      state.session.participantCount === 1 ? "" : "s"
    } · ${state.timelineItems.length} item${state.timelineItems.length === 1 ? "" : "s"} in the stream.`;
}

async function render(): Promise<void> {
  const helperOffline = !state.config || !state.serverBase;
  const helperHealthUrl = getHelperHealthUrl();

  elements.localIp.textContent = state.preferredIp || "Unavailable";
  elements.roomCode.textContent = state.session?.roomCode || "-";
  elements.peopleCount.textContent = state.session ? String(state.session.participantCount) : "-";
  elements.countdown.textContent = formatCountdown(state.session?.expiresAt || null);
  elements.helperWarning.classList.toggle("hidden", !helperOffline);
  elements.helperUrl.textContent = helperHealthUrl;

  const shareUrl = getShareUrl();
  elements.shareUrl.textContent = shareUrl || "Create a room to generate a LAN link.";
  elements.createSession.textContent = helperOffline ? "Helper offline" : state.session ? "New room" : "Create room";
  elements.copyUrl.disabled = !shareUrl;
  elements.copyRoomCode.disabled = !state.session;
  elements.openDashboard.disabled = !state.session;
  elements.openJoinPage.disabled = helperOffline;
  elements.clearSession.disabled = !state.session;
  elements.sendContent.disabled = !state.session;
  elements.attachFiles.disabled = !state.session;
  elements.useCurrentTab.disabled = !state.session;

  elements.networkWarning.classList.toggle("hidden", !state.config || state.config.localIps.length <= 1);
  if (state.config && state.config.localIps.length > 1) {
    elements.networkWarning.textContent = `Multiple local interfaces detected: ${state.config.localIps.join(", ")}. The first address is used for the QR code.`;
  }

  renderStatus();
  renderParticipants();
  renderSelectedFiles();
  renderTimeline();
  await drawQrCode(shareUrl);
}

async function createSession(): Promise<void> {
  if (!state.serverBase) {
    await probeServer();
    if (!state.serverBase) {
      elements.statusText.textContent =
        "Cannot create a room yet because the LanDrop helper is not running on this Mac.";
      await render();
      return;
    }
  }

  const response = await fetch(`${state.serverBase}/api/sessions`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Could not create room");
  }

  const session = (await response.json()) as ShareSession;
  await saveSessionId(session.id);
  state.session = session;
  state.timelineItems = [];
  elements.composerInput.value = "";
  state.selectedFiles = [];
  elements.fileInput.value = "";
  connectRealtime();
  await refreshSessionState();
}

async function clearSessionData(): Promise<void> {
  if (!state.serverBase || !state.sessionId) {
    return;
  }
  await fetch(`${state.serverBase}/api/sessions/${encodeURIComponent(state.sessionId)}`, {
    method: "DELETE"
  });
  await refreshSessionState();
}

async function copyShareUrl(): Promise<void> {
  const shareUrl = getShareUrl();
  if (!shareUrl) {
    return;
  }
  await navigator.clipboard.writeText(shareUrl);
  elements.statusText.textContent = "Temporary room URL copied to the clipboard.";
}

async function copyRoomCode(): Promise<void> {
  if (!state.session) {
    return;
  }
  await navigator.clipboard.writeText(state.session.roomCode);
  elements.statusText.textContent = "Room code copied to the clipboard.";
}

async function copyHelperUrl(): Promise<void> {
  await navigator.clipboard.writeText(getHelperHealthUrl());
  elements.statusText.textContent = "Helper health URL copied to the clipboard.";
}

function openDashboard(): void {
  const dashboardUrl = getDashboardUrl();
  if (!dashboardUrl) {
    return;
  }
  chrome.tabs.create({ url: dashboardUrl });
}

function openJoinPage(): void {
  const joinPageUrl = getJoinPageUrl();
  if (!joinPageUrl) {
    return;
  }
  chrome.tabs.create({ url: joinPageUrl });
}

async function postOutgoingText(
  mode: "url" | "note" | "text",
  content: string,
  title?: string
): Promise<void> {
  if (!state.serverBase || !state.sessionId) {
    throw new Error("Create a room first.");
  }

  const response = await fetch(
    `${state.serverBase}/api/sessions/${encodeURIComponent(state.sessionId)}/outgoing/text`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        content,
        title,
        senderName: "Mac extension"
      })
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not share right now.");
  }
}

async function postOutgoingFiles(): Promise<void> {
  if (!state.serverBase || !state.sessionId) {
    throw new Error("Create a room first.");
  }

  if (!state.config) {
    throw new Error("Server config unavailable.");
  }

  const maxFileSizeBytes = state.config.maxChunkedUploadSizeGb * 1024 * 1024 * 1024;

  async function uploadChunkWithRetry(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    fileName: string
  ): Promise<Partial<ChunkedUploadSession>> {
    let lastErrorMessage = `Upload failed while sending ${fileName}.`;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const chunkResponse = await fetch(
        `${state.serverBase}/api/uploads/${encodeURIComponent(uploadId)}/chunks/${chunkIndex}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunk
        }
      );
      const chunkPayload = (await chunkResponse.json().catch(() => ({}))) as Partial<ChunkedUploadSession> & {
        error?: string;
      };

      if (chunkResponse.ok) {
        return chunkPayload;
      }

      lastErrorMessage =
        typeof chunkPayload.error === "string" ? chunkPayload.error : lastErrorMessage;
      if (attempt >= 3 || chunkResponse.status < 500) {
        break;
      }

      elements.statusText.textContent = `Network hiccup. Retrying chunk ${chunkIndex + 1} for ${fileName} (${attempt}/3)…`;
      await new Promise((resolve) => {
        window.setTimeout(resolve, 300 * attempt);
      });
    }

    throw new Error(lastErrorMessage);
  }

  for (let fileIndex = 0; fileIndex < state.selectedFiles.length; fileIndex += 1) {
    const file = state.selectedFiles[fileIndex];
    if (!file) {
      continue;
    }
    if (file.size > maxFileSizeBytes) {
      throw new Error(`${file.name} is larger than ${state.config.maxChunkedUploadSizeGb} GB.`);
    }

    elements.statusText.textContent = `Preparing ${file.name} (${fileIndex + 1}/${state.selectedFiles.length})…`;

    const initResponse = await fetch(
      `${state.serverBase}/api/sessions/${encodeURIComponent(state.sessionId)}/outgoing/uploads/initiate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalFileName: file.name,
          mimeType: file.type || null,
          size: file.size,
          senderName: "Mac extension"
        })
      }
    );
    const initPayload = (await initResponse.json().catch(() => ({}))) as Partial<ChunkedUploadSession> & {
      error?: string;
    };
    if (!initResponse.ok || typeof initPayload.id !== "string") {
      throw new Error(typeof initPayload.error === "string" ? initPayload.error : "Could not start file upload.");
    }

    const chunkSize = initPayload.chunkSizeBytes || state.config.chunkUploadSizeMb * 1024 * 1024;
    const totalChunks = initPayload.chunkCount || Math.ceil(file.size / chunkSize);

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        const chunkPayload = await uploadChunkWithRetry(initPayload.id, chunkIndex, chunk, file.name);

        elements.statusText.textContent = `Uploading ${file.name} (${fileIndex + 1}/${
          state.selectedFiles.length
        }) · chunk ${chunkIndex + 1}/${totalChunks} · ${formatSize(chunkPayload.receivedBytes ?? end)} of ${formatSize(file.size)}.`;
      }

      const completeResponse = await fetch(
        `${state.serverBase}/api/uploads/${encodeURIComponent(initPayload.id)}/complete`,
        { method: "POST" }
      );
      const completePayload = (await completeResponse.json().catch(() => ({}))) as { error?: string };
      if (!completeResponse.ok) {
        throw new Error(
          typeof completePayload.error === "string" ? completePayload.error : `Could not finalize ${file.name}.`
        );
      }
    } catch (error) {
      await fetch(`${state.serverBase}/api/uploads/${encodeURIComponent(initPayload.id)}`, {
        method: "DELETE"
      }).catch(() => undefined);
      throw error;
    }
  }
}

async function sendComposer(): Promise<void> {
  if (!state.session) {
    elements.statusText.textContent = "Create a room before sharing.";
    return;
  }

  const content = elements.composerInput.value.trim();
  const fileCount = state.selectedFiles.length;

  if (!content && fileCount === 0) {
    elements.statusText.textContent = "Paste something or attach files first.";
    return;
  }

  try {
    const sentParts: string[] = [];

    if (content) {
      const mode = inferTextMode(content);
      await postOutgoingText(mode, content);
      sentParts.push(mode === "url" ? "link" : mode);
    }

    if (fileCount > 0) {
      await postOutgoingFiles();
      sentParts.push(`${fileCount} file${fileCount === 1 ? "" : "s"}`);
    }

    elements.composerInput.value = "";
    state.selectedFiles = [];
    elements.fileInput.value = "";
    await refreshSessionState();
    elements.statusText.textContent = `Shared ${sentParts.join(" and ")} to the room.`;
  } catch (error) {
    elements.statusText.textContent = error instanceof Error ? error.message : "Unable to share right now.";
  }
}

async function sendCurrentTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    elements.statusText.textContent = "Could not read the current tab URL.";
    return;
  }

  try {
    await postOutgoingText("url", tab.url, tab.title || undefined);
    await refreshSessionState();
    elements.statusText.textContent = "Current tab shared to the room.";
  } catch (error) {
    elements.statusText.textContent = error instanceof Error ? error.message : "Unable to share the current tab.";
  }
}

function updateCountdownLoop(): void {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }
  countdownTimer = window.setInterval(() => {
    elements.countdown.textContent = formatCountdown(state.session?.expiresAt || null);
  }, 1000);
}

function bindEvents(): void {
  elements.createSession.addEventListener("click", () => {
    void createSession().catch((error) => {
      elements.statusText.textContent = error instanceof Error ? error.message : "Unable to create room.";
    });
  });
  elements.refresh.addEventListener("click", () => {
    void bootstrap();
  });
  elements.retryHelper.addEventListener("click", () => {
    void bootstrap();
  });
  elements.copyHelperUrl.addEventListener("click", () => {
    void copyHelperUrl();
  });
  elements.copyUrl.addEventListener("click", () => {
    void copyShareUrl();
  });
  elements.copyRoomCode.addEventListener("click", () => {
    void copyRoomCode();
  });
  elements.openDashboard.addEventListener("click", openDashboard);
  elements.openJoinPage.addEventListener("click", openJoinPage);
  elements.clearSession.addEventListener("click", () => {
    void clearSessionData();
  });
  elements.sendContent.addEventListener("click", () => {
    void sendComposer();
  });
  elements.attachFiles.addEventListener("click", () => {
    elements.fileInput.click();
  });
  elements.fileInput.addEventListener("change", () => {
    state.selectedFiles = Array.from(elements.fileInput.files || []);
    renderSelectedFiles();
  });
  elements.composerInput.addEventListener("input", () => {
    elements.composerHint.textContent = getComposerSummary();
  });
  elements.useCurrentTab.addEventListener("click", () => {
    void sendCurrentTab();
  });
  elements.activityList.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLButtonElement && target.dataset.copy !== undefined) {
      void navigator.clipboard.writeText(target.dataset.copy);
    }
  });
}

async function bootstrap(): Promise<void> {
  await probeServer();
  state.sessionId = await loadSessionId();

  if (!state.serverBase) {
    stopRealtime();
    setRealtimeMode("offline");
    clearSessionState();
    await render();
    return;
  }

  await refreshSessionState();
  connectRealtime();
}

bindEvents();
updateCountdownLoop();
void bootstrap();
