import http from "node:http";

import { app, BrowserWindow, dialog, shell } from "electron";

import { createLanDropApp, type LanDropApp } from "../../server/src/app.ts";

const RECEIVER_PORT = 8787;
const RECEIVER_URL = `http://127.0.0.1:${RECEIVER_PORT}/receiver`;

let mainWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
let lanDrop: LanDropApp | null = null;
let ownsServer = false;

async function startReceiverServer(): Promise<void> {
  try {
    lanDrop = await createLanDropApp({
      configOverrides: {
        port: RECEIVER_PORT,
        openDashboardOnStart: false
      }
    });
    server = http.createServer(lanDrop.app);
    lanDrop.attachRealtime(server);

    await new Promise<void>((resolve, reject) => {
      if (!server) {
        reject(new Error("Server is not initialized"));
        return;
      }

      server.once("error", (error) => {
        reject(error);
      });
      server.listen(RECEIVER_PORT, "0.0.0.0", () => {
        resolve();
      });
    });

    ownsServer = true;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException | undefined;
    if (nodeError?.code !== "EADDRINUSE") {
      throw error;
    }

    // Another local receiver is already running. Reuse it instead of failing startup.
    ownsServer = false;
    if (server) {
      server.close();
      server = null;
    }
    if (lanDrop) {
      lanDrop.close();
      lanDrop = null;
    }
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 860,
    minWidth: 1040,
    minHeight: 700,
    title: "LanDrop Clip",
    backgroundColor: "#F8FAFC",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.loadURL(RECEIVER_URL).catch(async (error) => {
    await dialog.showMessageBox({
      type: "error",
      title: "LanDrop Clip",
      message: "Could not load the local receiver page.",
      detail: error instanceof Error ? error.message : "Unknown startup error"
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://127.0.0.1:") && !url.startsWith("http://localhost:")) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function shutdown(): Promise<void> {
  if (ownsServer && server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
  }
  server = null;
  ownsServer = false;
  lanDrop?.close();
  lanDrop = null;
}

async function bootstrap(): Promise<void> {
  const singleInstance = app.requestSingleInstanceLock();
  if (!singleInstance) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (!mainWindow) {
      createMainWindow();
    }
  });

  app.on("before-quit", () => {
    void shutdown();
  });

  await app.whenReady();

  try {
    await startReceiverServer();
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "LanDrop Clip",
      message: "LanDrop Clip could not start the local receiver.",
      detail: error instanceof Error ? error.message : "Unknown startup error"
    });
    app.quit();
    return;
  }

  createMainWindow();
}

void bootstrap();
