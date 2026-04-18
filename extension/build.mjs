import esbuild from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

const isWatch = process.argv.includes("--watch");
const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const staticFiles = ["popup.html", "styles.css", "manifest.json"];

function createCrcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

const crcTable = createCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function isInsideRoundedRect(x, y, size, radius) {
  const min = radius;
  const max = size - radius;

  if ((x >= min && x <= max) || (y >= min && y <= max)) {
    return true;
  }

  const cornerX = x < min ? min : max;
  const cornerY = y < min ? min : max;
  const dx = x - cornerX;
  const dy = y - cornerY;
  return dx * dx + dy * dy <= radius * radius;
}

function isInsideCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function isInsideRect(x, y, left, top, right, bottom) {
  return x >= left && x <= right && y >= top && y <= bottom;
}

function createIconBuffer(size) {
  const width = size;
  const height = size;
  const radius = size * 0.22;
  const raw = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixelStart = rowStart + 1 + x * 4;
      const insideCard = isInsideRoundedRect(x + 0.5, y + 0.5, size, radius);

      if (!insideCard) {
        raw[pixelStart] = 0;
        raw[pixelStart + 1] = 0;
        raw[pixelStart + 2] = 0;
        raw[pixelStart + 3] = 0;
        continue;
      }

      const mixX = x / Math.max(1, width - 1);
      const mixY = y / Math.max(1, height - 1);
      const mix = (mixX * 0.58) + (mixY * 0.42);

      let red = Math.round(14 + (33 * mix));
      let green = Math.round(97 + (72 * (1 - mix * 0.45)));
      let blue = Math.round(132 + (92 * (1 - mix)));
      let alpha = 255;

      const inset = size * 0.035;
      const inHighlight = isInsideRoundedRect(
        x + 0.5 - inset,
        y + 0.5 - inset,
        size - inset * 2,
        Math.max(2, radius - inset)
      );

      if (!inHighlight) {
        red = Math.max(0, red - 10);
        green = Math.max(0, green - 12);
        blue = Math.max(0, blue - 18);
      }

      const shadowOffset = size * 0.03;
      const shadowAlpha = isInsideRect(
        x,
        y,
        size * 0.28 + shadowOffset,
        size * 0.22 + shadowOffset,
        size * 0.75 + shadowOffset,
        size * 0.78 + shadowOffset
      )
        ? 38
        : 0;

      const whiteBar =
        isInsideRect(x, y, size * 0.28, size * 0.22, size * 0.44, size * 0.78) ||
        isInsideRect(x, y, size * 0.28, size * 0.62, size * 0.75, size * 0.78);

      const accentDot = isInsideCircle(x, y, size * 0.7, size * 0.31, size * 0.1);

      if (shadowAlpha > 0 && !whiteBar && !accentDot) {
        red = Math.max(0, red - shadowAlpha);
        green = Math.max(0, green - shadowAlpha);
        blue = Math.max(0, blue - shadowAlpha);
      }

      if (whiteBar) {
        red = 255;
        green = 255;
        blue = 255;
      }

      if (accentDot) {
        red = 255;
        green = 205;
        blue = 82;
      }

      raw[pixelStart] = red;
      raw[pixelStart + 1] = green;
      raw[pixelStart + 2] = blue;
      raw[pixelStart + 3] = alpha;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0))
  ]);
}

async function generateIcons() {
  const iconDir = path.join(distDir, "icons");
  await fs.mkdir(iconDir, { recursive: true });

  for (const size of [16, 32, 48, 128]) {
    const iconPath = path.join(iconDir, `icon${size}.png`);
    await fs.writeFile(iconPath, createIconBuffer(size));
  }
}

async function copyStaticFiles() {
  await fs.mkdir(distDir, { recursive: true });
  await Promise.all(
    staticFiles.map(async (fileName) => {
      const source = path.join(rootDir, "src", fileName);
      const target = path.join(distDir, fileName);
      await fs.copyFile(source, target);
    })
  );
  await generateIcons();
}

const buildOptions = {
  entryPoints: {
    popup: path.join(rootDir, "src", "popup.ts"),
    background: path.join(rootDir, "src", "background.ts")
  },
  bundle: true,
  outdir: distDir,
  format: "esm",
  sourcemap: isWatch,
  minify: !isWatch,
  target: "chrome114",
  logLevel: "info"
};

if (isWatch) {
  const context = await esbuild.context(buildOptions);
  await context.watch();
  await copyStaticFiles();
  const watcher = (await import("node:fs")).watch(path.join(rootDir, "src"), async (_eventType, fileName) => {
    if (!fileName || !staticFiles.includes(fileName)) {
      return;
    }
    await copyStaticFiles();
  });
  console.log("Extension build watching for changes...");
  process.on("SIGINT", async () => {
    watcher.close();
    await context.dispose();
    process.exit(0);
  });
} else {
  await esbuild.build(buildOptions);
  await copyStaticFiles();
}
