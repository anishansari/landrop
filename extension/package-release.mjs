import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const releaseDir = path.join(rootDir, "release");

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  const manifestPath = path.join(distDir, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const version = String(manifest.version ?? "1.0.0");
  const artifactPath = path.join(releaseDir, `landrop-clip-extension-v${version}.zip`);

  await fs.mkdir(releaseDir, { recursive: true });
  await fs.rm(artifactPath, { force: true });

  await run("zip", ["-r", artifactPath, ".", "-x", "*.map"], { cwd: distDir });

  console.log(`Created release artifact: ${artifactPath}`);
}

await main();
