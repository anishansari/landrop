import { spawn } from "node:child_process";
import http from "node:http";

import { createLanDropApp } from "./app.js";

function shouldOpenDashboardOnStart(): boolean {
  return process.argv.includes("--open");
}

function openInDefaultBrowser(url: string): void {
  const platform = process.platform;
  const commandParts =
    platform === "darwin"
      ? ["open", url]
      : platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const [command, ...args] = commandParts;

  if (!command) {
    return;
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

async function main(): Promise<void> {
  const { app, config, close, attachRealtime } = await createLanDropApp();
  const server = http.createServer(app);
  attachRealtime(server);

  const openOnStart = config.openDashboardOnStart || shouldOpenDashboardOnStart();

  server.listen(config.port, config.host, () => {
    const lanAddresses = config.localIps.length > 0 ? config.localIps.join(", ") : "none detected";
    const receiverUrl = `http://127.0.0.1:${config.port}/receiver`;
    const joinUrl = `http://127.0.0.1:${config.port}/join`;

    console.log(`${config.appName} receiver listening on ${receiverUrl}`);
    console.log(`Browser sender join page: ${joinUrl}`);
    console.log(`LAN IP candidates: ${lanAddresses}`);
    console.log(`Temporary files directory: ${config.storageDir}`);

    if (openOnStart) {
      openInDefaultBrowser(receiverUrl);
    }
  });

  const shutdown = () => {
    close();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
