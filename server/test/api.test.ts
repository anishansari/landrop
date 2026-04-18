import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createLanDropApp } from "../src/app.js";
import { SessionStore } from "../src/session-store.js";

describe("LanDrop Clip server", () => {
  let tempDir: string;
  let receivedDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "landrop-clip-test-"));
    receivedDir = await fs.mkdtemp(path.join(os.tmpdir(), "landrop-clip-inbox-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(receivedDir, { recursive: true, force: true });
  });

  it("creates sessions", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        localIps: ["192.168.1.4"]
      }
    });

    const response = await request(app).post("/api/sessions");

    expect(response.status).toBe(201);
    expect(response.body.id).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(response.body.roomCode).toMatch(/^[A-Z2-9]{5}$/);
    expect(response.body.status).toBe("active");
    close();
  });

  it("expires inactive sessions", async () => {
    const store = new SessionStore({
      storageDir: tempDir,
      receivedFilesDir: receivedDir,
      sessionTtlMs: 1_000
    });
    await store.prepare();
    const now = Date.now();
    const session = store.createSession(now);

    expect(store.getSession(session.id)).not.toBeNull();
    await store.expireInactiveSessions(now + 1_500);
    expect(store.getSession(session.id)).toBeNull();
  });

  it("accepts text submissions", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir
      }
    });
    const session = await request(app).post("/api/sessions");

    const response = await request(app)
      .post(`/api/sessions/${session.body.id}/text`)
      .send({
        mode: "text",
        content: "hello from phone",
        title: "Greeting"
      });

    expect(response.status).toBe(201);
    expect(response.body.type).toBe("text");
    expect(response.body.direction).toBe("incoming");
    expect(response.body.textContent).toBe("hello from phone");
    expect(response.body.title).toBe("Greeting");
    close();
  });

  it("accepts blank optional titles for text submissions", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir
      }
    });
    const session = await request(app).post("/api/sessions");

    const response = await request(app)
      .post(`/api/sessions/${session.body.id}/text`)
      .send({
        mode: "text",
        content: "hello without a title",
        title: ""
      });

    expect(response.status).toBe(201);
    expect(response.body.textContent).toBe("hello without a title");
    expect(response.body.title).toBe("hello without a title");
    close();
  });

  it("stores upload metadata and exposes latest item", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir
      }
    });
    const session = await request(app).post("/api/sessions");

    const uploadResponse = await request(app)
      .post(`/api/sessions/${session.body.id}/files`)
      .attach("files", Buffer.from("%PDF-1.4 test"), "example.pdf");

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body).toHaveLength(1);
    expect(uploadResponse.body[0].type).toBe("pdf");
    expect(uploadResponse.body[0].direction).toBe("incoming");
    expect(uploadResponse.body[0].downloadUrl).toContain(`/files/${session.body.id}/`);
    expect(uploadResponse.body[0].previewUrl).toContain(`/preview/${session.body.id}/`);
    expect(uploadResponse.body[0].metadata.savedPath).toContain(receivedDir);
    await expect(fs.stat(uploadResponse.body[0].metadata.savedPath)).resolves.toBeTruthy();

    const latestResponse = await request(app).get(`/api/sessions/${session.body.id}/latest`);

    expect(latestResponse.status).toBe(200);
    expect(latestResponse.body.originalFileName).toBe("example.pdf");
    expect(latestResponse.body.mimeType).toBe("application/pdf");
    close();
  });

  it("supports chunked uploads and assembles the stored file", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir,
        maxUploadSizeMb: 1,
        maxUploadSizeBytes: 1024,
        chunkUploadSizeMb: 1,
        chunkUploadSizeBytes: 4,
        maxChunkedUploadSizeGb: 1,
        maxChunkedUploadSizeBytes: 1024 * 1024
      }
    });
    const session = await request(app).post("/api/sessions");
    const originalBuffer = Buffer.from("abcdefghij");

    const initResponse = await request(app)
      .post(`/api/sessions/${session.body.id}/uploads/initiate`)
      .send({
        originalFileName: "large-video.mp4",
        mimeType: "video/mp4",
        size: originalBuffer.length,
        senderName: "Pixel Pro"
      });

    expect(initResponse.status).toBe(201);
    expect(initResponse.body.chunkCount).toBe(3);

    await request(app)
      .put(`/api/uploads/${initResponse.body.id}/chunks/0`)
      .set("Content-Type", "application/octet-stream")
      .send(originalBuffer.subarray(0, 4))
      .expect(200);
    await request(app)
      .put(`/api/uploads/${initResponse.body.id}/chunks/1`)
      .set("Content-Type", "application/octet-stream")
      .send(originalBuffer.subarray(4, 8))
      .expect(200);
    await request(app)
      .put(`/api/uploads/${initResponse.body.id}/chunks/2`)
      .set("Content-Type", "application/octet-stream")
      .send(originalBuffer.subarray(8))
      .expect(200);

    const completeResponse = await request(app).post(`/api/uploads/${initResponse.body.id}/complete`);

    expect(completeResponse.status).toBe(201);
    expect(completeResponse.body.type).toBe("video");
    expect(completeResponse.body.originalFileName).toBe("large-video.mp4");
    expect(completeResponse.body.senderName).toBe("Pixel Pro");
    await expect(fs.readFile(completeResponse.body.metadata.savedPath)).resolves.toEqual(originalBuffer);

    const downloadResponse = await request(app).get(completeResponse.body.downloadUrl);
    expect(downloadResponse.status).toBe(200);
    expect(Buffer.from(downloadResponse.body)).toEqual(originalBuffer);
    close();
  });

  it("supports outbound links and exposes them in session state", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir
      }
    });
    const session = await request(app).post("/api/sessions");

    const outboundResponse = await request(app)
      .post(`/api/sessions/${session.body.id}/outgoing/text`)
      .send({
        mode: "url",
        content: "https://example.com/story",
        title: "Read later"
      });

    expect(outboundResponse.status).toBe(201);
    expect(outboundResponse.body.direction).toBe("outgoing");
    expect(outboundResponse.body.textContent).toBe("https://example.com/story");

    const stateResponse = await request(app).get(`/api/sessions/${session.body.id}/state`);

    expect(stateResponse.status).toBe(200);
    expect(stateResponse.body.latestIncomingItem).toBeNull();
    expect(stateResponse.body.latestOutgoingItem.title).toBe("Read later");
    expect(stateResponse.body.outgoingItems).toHaveLength(1);
    expect(stateResponse.body.outgoingItems[0].direction).toBe("outgoing");
    close();
  });

  it("resolves room codes and tracks temporary room presence", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir
      }
    });
    const session = await request(app).post("/api/sessions");
    const roomCode = session.body.roomCode;

    const roomResponse = await request(app).get(`/api/rooms/${roomCode}`);
    expect(roomResponse.status).toBe(200);
    expect(roomResponse.body.id).toBe(session.body.id);

    const presenceResponse = await request(app).post(`/api/rooms/${roomCode}/presence`).send({
      participantId: "phone-test",
      name: "Pixel 9",
      role: "phone",
      source: "phone"
    });

    expect(presenceResponse.status).toBe(200);
    expect(presenceResponse.body.participantCount).toBe(1);
    expect(presenceResponse.body.participants[0].name).toBe("Pixel 9");
    close();
  });

  it("accepts room-code based text submissions", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir
      }
    });
    const session = await request(app).post("/api/sessions");

    const response = await request(app)
      .post(`/api/rooms/${session.body.roomCode}/text`)
      .send({
        mode: "url",
        content: "https://example.com/group-share",
        senderName: "Pixel 9"
      });

    expect(response.status).toBe(201);
    expect(response.body.direction).toBe("incoming");
    expect(response.body.senderName).toBe("Pixel 9");

    const stateResponse = await request(app).get(`/api/sessions/${session.body.id}/state`);
    expect(stateResponse.status).toBe(200);
    expect(stateResponse.body.timelineItems[0].senderName).toBe("Pixel 9");
    close();
  });

  it("renders a QR code for the active room", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir,
        localIps: ["192.168.1.4"]
      }
    });
    const session = await request(app).post("/api/sessions");

    const qrResponse = await request(app).get(
      `/api/sessions/${session.body.id}/qrcode?host=192.168.1.4`
    );
    const qrBody =
      typeof qrResponse.text === "string" && qrResponse.text.length > 0
        ? qrResponse.text
        : Buffer.from(qrResponse.body).toString("utf8");

    expect(qrResponse.status).toBe(200);
    expect(qrResponse.type).toBe("image/svg+xml");
    expect(qrBody).toContain("<svg");
    close();
  });

  it("enforces room PIN when configured", async () => {
    const { app, close } = await createLanDropApp({
      disableCleanupTimer: true,
      configOverrides: {
        storageDir: tempDir,
        receivedFilesDir: receivedDir,
        localIps: ["192.168.1.4"]
      }
    });

    const session = await request(app).post("/api/sessions").send({ pin: "1234" });
    expect(session.status).toBe(201);
    expect(session.body.pinEnabled).toBe(true);

    const stateWithoutPin = await request(app).get(`/api/rooms/${session.body.roomCode}/state`);
    expect(stateWithoutPin.status).toBe(401);

    const stateWithPin = await request(app).get(
      `/api/rooms/${session.body.roomCode}/state?pin=1234`
    );
    expect(stateWithPin.status).toBe(200);
    expect(stateWithPin.body.session.pinEnabled).toBe(true);

    const textWithoutPin = await request(app).post(`/api/rooms/${session.body.roomCode}/text`).send({
      mode: "text",
      content: "blocked"
    });
    expect(textWithoutPin.status).toBe(401);

    const textWithPin = await request(app).post(`/api/rooms/${session.body.roomCode}/text`).send({
      mode: "text",
      content: "allowed",
      pin: "1234"
    });
    expect(textWithPin.status).toBe(201);
    expect(textWithPin.body.textContent).toBe("allowed");

    close();
  });
});
