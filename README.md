# LanDrop Clip

LanDrop Clip is a local-only Mac receiver with a browser sender. The main product flow is now:

1. start the receiver on the Mac
2. the receiver opens a local dashboard automatically
3. the dashboard creates a temporary room and QR code
4. one or more phones open the room in the browser and share links, notes, text, or files
5. everything lands in one local Mac activity stream and inbox folder

The Chrome extension is still available as an optional fast control surface, but the core product no longer depends on it.

The system is intentionally local-first:

- No cloud
- No remote database
- No internet required after install
- Temporary in-memory session metadata
- Temporary files stored on disk in a local temp directory

## Final Folder Structure

```text
justshare/
├── desktop/
│   ├── src/
│   │   └── main.ts
│   ├── build.mjs
│   └── package.json
├── extension/
│   ├── src/
│   │   ├── background.ts
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── styles.css
│   ├── build.mjs
│   ├── package.json
│   └── tsconfig.json
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── server.ts
│   │   ├── session-store.ts
│   │   ├── utils.ts
│   │   └── views.ts
│   ├── test/
│   │   └── api.test.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── shared/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.base.json
```

## What The App Does

1. The Mac runs a local Express + WebSocket receiver on `0.0.0.0:8787`.
2. The receiver dashboard opens at `http://127.0.0.1:8787/receiver`.
3. The receiver creates a temporary room and renders a QR code for a link like:

```text
http://192.168.x.x:8787/r/TF33L
```

4. The Android phone opens that link, or joins through `http://<mac-ip>:8787/join`, in any browser on the same network.
5. The phone browser can submit to the Mac:
   - plain text
   - notes
   - URLs
   - images
   - videos
   - PDFs
   - generic files
6. The Mac dashboard can also push links, notes, text, and files back to all joined phones in the room.
7. Rooms keep lightweight participant presence, so the Mac can see who joined.
8. Optional room PIN can lock phone-side access and submissions.
9. Large files use chunked uploads with retry to survive brief network hiccups.
10. Rooms expire automatically after inactivity and their temporary files are removed.

## Architecture Overview

- `server/`
  - Express HTTP API
  - WebSocket realtime endpoint
  - Browser sender room page at `/r/:roomCode`
  - Join page at `/join`
  - Receiver dashboard at `/receiver`
  - In-memory session metadata
  - Temp-file storage on disk
- `extension/`
  - Optional Manifest V3 popup extension
  - Fast room controls if you want browser-native shortcuts
  - QR code generation
  - Latest item + history display
  - Quick "send to room" action
  - WebSocket with polling fallback
  - Current room persisted in `chrome.storage.local`
- `desktop/`
  - Installable desktop app wrapper for the local receiver (macOS, Windows, Linux packaging)
  - Starts the local LAN server automatically at launch
  - Opens the receiver UI in an app window (no terminal required for end users)
- `shared/`
  - Shared TypeScript types for rooms, items, config, and websocket payloads

## Why A Local Receiver Is Needed

The Mac needs a local LAN-facing receiver. A browser extension cannot reliably replace that. The local receiver is the component that can:

- bind to `0.0.0.0`
- expose a phone-friendly HTTP page on the local network
- receive multipart uploads
- keep session state
- store temporary files
- broadcast updates over WebSocket

The extension is the control and display layer, not the network host.

## Tech Choices

- Backend: Node.js + TypeScript
- HTTP server: Express
- Realtime: `ws`
- Uploads: chunked browser uploads for large files, `multer` fallback for simple multipart posts
- Validation: `zod`
- QR code rendering: `qrcode`
- Tests: Vitest + Supertest
- Extension: Chrome Manifest V3
- Phone UI: server-rendered HTML/CSS/JS

## Prerequisites

### For developers

- Node.js 20+ installed
- macOS, Windows, or Linux
- Android phone connected to the same WiFi or LAN as the Mac
- Google Chrome on the Mac only if you want the optional extension

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Optional server config

Copy the example env file if you want to change defaults:

```bash
cp server/.env.example server/.env
```

Supported settings:

- `PORT` default `8787`
- `SESSION_TTL_MINUTES` default `15`
- `MAX_UPLOAD_SIZE_MB` default `50` for legacy single-request multipart uploads
- `CHUNK_UPLOAD_SIZE_MB` default `8` for chunked upload requests
- `MAX_CHUNKED_UPLOAD_SIZE_GB` default `20` per file
- `STORAGE_DIR` default system temp dir + `landrop-clip`
- `RECEIVED_FILES_DIR` default `~/Downloads/LanDrop Clip Inbox`
- `OPEN_DASHBOARD_ON_START` default `false`

### 3. Run the receiver in development

```bash
npm run receiver:dev
```

This starts the shared watcher plus the Mac receiver server and opens the receiver dashboard automatically.

### 4. Build for a cleaner run

```bash
npm run build
```

This creates the unpacked extension bundle in:

```text
extension/dist
```

### 4b. Create a Chrome upload zip

If you want a package that is ready to load in Chrome or upload to the Chrome Web Store:

```bash
npm run release:extension
```

This creates:

```text
extension/release/landrop-clip-extension-v1.0.0.zip
```

Use that zip for store upload, and use the generated `extension/dist` folder for `Load unpacked` during local testing.

### 5. Start the receiver in build mode

```bash
npm run receiver
```

This opens the receiver dashboard automatically on the Mac.

You can also double-click [LanDrop-Receiver.command](/Users/anish/Desktop/justshare/LanDrop-Receiver.command) on macOS.

## macOS App Packaging (Installable App)

If you want a user-installable app so users just open software and see the QR immediately:

### 1. Build the Mac app package

```bash
npm run desktop:dist:mac
```

Artifacts are generated in:

```text
desktop/release/LanDrop-Clip-mac-arm64.zip
desktop/release-builder/LanDrop Clip-1.0.0-arm64-mac.zip
```

### 2. Install and run as an end user

1. Unzip `LanDrop-Clip-mac-arm64.zip`
2. Drag `LanDrop Clip.app` to `Applications`
3. Open `LanDrop Clip.app`
4. The app starts the local receiver automatically and opens the receiver dashboard with QR

No terminal is required in this packaged flow.

For unsigned local builds, macOS Gatekeeper may block first launch. Use **Right-click > Open** once, then allow it in **System Settings > Privacy & Security**.

For public release, sign and notarize the app so users can open it with a normal double-click.

## Windows and Linux Packaging

Desktop packaging is now cross-platform:

- Windows: NSIS installer + portable EXE
- Linux: AppImage
- macOS: ZIP

Build commands:

```bash
npm run desktop:dist:win
npm run desktop:dist:linux
npm run desktop:dist:mac
```

Artifacts are generated in:

```text
desktop/release-builder/
```

Native packaging works best on each target OS (Windows on Windows runner, Linux on Linux runner, etc.).

A CI matrix workflow is included at:

- `.github/workflows/desktop-build-matrix.yml`

## Publish To GitHub (From macOS Only)

If you only have a Mac, this is the recommended release flow:

1. Push source to GitHub (main branch).
2. Let GitHub Actions build Windows/Linux/macOS artifacts in the cloud.
3. Download artifacts from the workflow run.

Suggested commands from the project root:

```bash
git init
git add .
git commit -m "LanDrop Clip MVP + cross-platform packaging"
git branch -M main
git remote add origin git@github.com:anishansari/landrop.git
git push -u origin main
```

After push:

1. Open your repository on GitHub.
2. Go to **Actions**.
3. Open **Desktop Build Matrix** run.
4. Download artifacts:
   - `landrop-desktop-macos-latest`
   - `landrop-desktop-windows-latest`
   - `landrop-desktop-ubuntu-latest`
   - `landrop-extension`

This gives you Mac/Windows/Linux desktop packages plus the extension zip without requiring local Windows/Linux machines.

## User Downloads And Installation

For end users, share your GitHub Releases page:

- `https://github.com/anishansari/landrop/releases/latest`

Download and install by OS:

- macOS:
  - Download `LanDrop-Clip-mac-arm64.zip`
  - Unzip, drag app to Applications, open app
- Windows:
  - Download `LanDrop Clip Setup <version>.exe` (installer) or `LanDrop Clip <version>.exe` (portable)
  - Run installer OR portable exe directly
- Linux:
  - Download `.AppImage` for portable run
  - For AppImage: `chmod +x <file>.AppImage` then run it

The extension zip is also attached in release assets for Chrome Web Store upload or internal distribution.

## Automatic Release Publishing

A tag-based release workflow is included at:

- `.github/workflows/release-packages.yml`

When you push a tag like `v1.0.1`, GitHub will:

1. Build macOS/Windows/Linux desktop packages
2. Build extension release zip
3. Create a GitHub Release and attach all assets automatically

## Other Ways To Build Windows/Linux Without Owning Those Machines

- Use GitHub Actions matrix (already configured here) - easiest and cheapest to start.
- Use a CI provider like Codemagic/CircleCI/Azure Pipelines with Windows + Linux runners.
- Use a rented cloud VM (Windows Server + Ubuntu) and run `npm run desktop:dist:win` / `npm run desktop:dist:linux`.
- Use virtualization locally (Parallels/UTM/VMware) if you prefer manual control.

## Receiver-First Usage

1. Start the receiver on the Mac with `npm run receiver`
2. The Mac opens `http://127.0.0.1:8787/receiver`
3. A temporary room is created automatically
4. The dashboard shows:
   - local IP
   - room code
   - QR code
   - optional room PIN state
   - people in the room
   - unified activity stream
5. If needed, click `More` in the ribbon and set a room PIN
6. On Android, scan the QR code or open the join page and enter the room code
7. If PIN is enabled, enter it once on the phone page
8. Send links, notes, text, images, PDFs, videos, or files from the phone browser
9. The Mac receives everything in the local dashboard and saves incoming files to the inbox folder

## Optional Chrome Extension

1. Run `npm run build` or `npm run release:extension`
2. Open Chrome
3. Go to `chrome://extensions`
4. Enable `Developer mode`
5. Click `Load unpacked`
6. Select the `extension/dist` folder
7. Pin the `LanDrop Clip` extension to the toolbar

The extension is now optional. Use it only if you want:

- current-tab to room
- browser toolbar access to room controls
- compact popup view of the live stream

## Useful Scripts

- `npm run dev` start dev watchers
- `npm run receiver:dev` start the receiver-first dev flow
- `npm run build` build all packages
- `npm run build:desktop` build server/shared plus desktop app runtime bundle
- `npm start` run the built server
- `npm run receiver` run the built Mac receiver and open the dashboard
- `npm run desktop:start` run the desktop app locally
- `npm run desktop:dist:mac` package a zipped macOS app artifact
- `npm run desktop:dist:win` build Windows desktop artifacts (NSIS + portable)
- `npm run desktop:dist:linux` build Linux desktop artifacts (AppImage + deb)
- `npm run desktop:dist:ci:mac` CI-friendly macOS zip build via electron-builder
- `npm test` run backend tests

## Room Behavior

- Each room has a random session ID plus a short room code
- Each room tracks:
  - `id`
  - `roomCode`
- `createdAt`
- `pinEnabled`
- `lastActivityAt`
- `expiresAt`
  - `status`
  - `items`
  - `participants`
- Room items have a direction:
  - `incoming` for phone → Mac
  - `outgoing` for Mac → phones in the room
- Inactivity extends the current room on each submission or presence update
- Expired rooms are cleaned up automatically
- Clearing a room removes its current files and history while keeping the room alive

## Networking Notes

- The server binds to `0.0.0.0`
- LAN IPs are detected from non-loopback IPv4 interfaces
- Private LAN addresses are preferred in this order:
  - `192.168.x.x`
  - `10.x.x.x`
  - `172.16.x.x` to `172.31.x.x`
- The receiver dashboard runs on `127.0.0.1`
- The extension, if used, talks to the receiver on `127.0.0.1`
- The phone uses the LAN IP shown in the receiver dashboard or popup

## Security Notes For This MVP

- Random session IDs and room codes
- Optional room PIN lock for phone-side room access
- File size limits
- Sanitized text input
- Normalized filenames
- Path traversal avoided by looking up files from in-memory room metadata
- Preview only for safe inline categories like image, video, and PDF
- No uploaded content is executed
- Expired room files are deleted

There is no user auth, no encryption layer beyond whatever your local network already provides, and no attempt at NAT traversal. This is intentionally same-LAN only.

## macOS Firewall Troubleshooting

If the phone cannot open the temporary URL:

1. Open `System Settings`
2. Go to `Network` then `Firewall`
3. If the firewall is on, allow incoming connections for Terminal or the app you use to run Node
4. Restart the server and try again

You can also test from the Mac itself:

```bash
curl http://127.0.0.1:8787/api/health
```

Then test the LAN address from another device on the same WiFi:

```text
http://YOUR_LAN_IP:8787/api/health
```

## Router / Client-Isolation Troubleshooting

Some WiFi networks block peer-to-peer traffic between connected devices. Common names include:

- AP isolation
- client isolation
- guest mode isolation
- wireless isolation

If the Mac and phone are on the same WiFi but still cannot connect, check the router settings and make sure local device-to-device traffic is allowed.

## Limitations

- The extension talks to `127.0.0.1`, so the receiver must run on the same Mac as Chrome
- Room PIN is room-level only (no per-device permissions yet)
- Large uploads are supported only up to the configured max size
- The popup only auto-updates while it is open
- There is no persistent history after the server stops
- This is designed for same-LAN use, not remote access

## Privacy Model

LanDrop Clip is local only.

- No cloud sync
- No analytics
- No remote API
- No third-party auth
- No data leaves your local network unless you manually move it somewhere else

## Tests Included

The backend test suite covers:

- room creation
- room expiration
- text submission
- file upload metadata
- chunked upload assembly
- latest item retrieval

Run them with:

```bash
npm test
```

## Future Improvements

- Push from Mac into the room by drag/drop inside the extension
- Clipboard image paste support on mobile browsers where supported
- Per-device permissions and room moderation controls
- Checksums for end-to-end transfer verification
- Optional badge or sound notifications for new items
- Stronger upload allowlists and antivirus hooks for stricter environments
