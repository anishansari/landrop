import { escapeHtml } from "./utils.js";

function pageShell(title: string, body: string, inlineScript: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232563EB'/%3E%3Cpath d='M20 31h24M34 21l10 10-10 10' stroke='white' stroke-width='5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      :root {
        color-scheme: light;
        --bg: #f8fafc;
        --surface: #ffffff;
        --surface-strong: #ffffff;
        --surface-muted: #f1f5fd;
        --line: #e4ecfc;
        --line-strong: #cadbff;
        --text: #0f172a;
        --muted: #415372;
        --accent: #2563eb;
        --accent-strong: #1d4fd7;
        --accent-soft: #e2ebff;
        --success: #0f9d58;
        --success-soft: rgba(15, 157, 88, 0.15);
        --warning: #d97706;
        --warning-soft: rgba(217, 119, 6, 0.16);
        --danger: #dc2626;
        --danger-soft: rgba(220, 38, 38, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100dvh;
        font-family: "Plus Jakarta Sans", "Avenir Next", "SF Pro Text", "Segoe UI", sans-serif;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, rgba(37, 99, 235, 0) 36%),
          linear-gradient(315deg, rgba(217, 119, 6, 0.1) 0%, rgba(217, 119, 6, 0) 30%),
          linear-gradient(rgba(37, 99, 235, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37, 99, 235, 0.04) 1px, transparent 1px),
          var(--bg);
        background-size: auto, auto, 24px 24px, 24px 24px, auto;
        color: var(--text);
        overscroll-behavior-y: contain;
      }

      main {
        width: min(100%, 1180px);
        margin: 0 auto;
        padding: 22px 16px 40px;
      }

      .grid {
        display: grid;
        gap: 16px;
      }

      .hero,
      .panel {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        animation: riseIn 260ms ease;
      }

      .hero {
        padding: 24px;
        background: linear-gradient(135deg, #f4f8ff 0%, #ffffff 58%);
        border-color: #ceddff;
      }

      .hero h1,
      .section-title {
        margin: 0;
        letter-spacing: -0.02em;
      }

      .hero h1 {
        font-size: clamp(1.65rem, 3vw, 2.25rem);
        font-weight: 800;
      }

      .hero p,
      .subtle,
      .meta,
      .helper,
      .empty {
        color: var(--muted);
        line-height: 1.5;
      }

      .panel {
        padding: 18px;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 14px;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
        font-size: 0.92rem;
      }

      .status.success {
        background: var(--success-soft);
        color: var(--success);
      }

      .status.error {
        background: var(--danger-soft);
        color: var(--danger);
      }

      .actions,
      .button-grid,
      .stats,
      .identity-row,
      .copy-row {
        display: grid;
        gap: 10px;
      }

      .actions {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }

      .button-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .stats {
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      }

      .identity-row {
        grid-template-columns: 1.3fr 0.7fr;
      }

      .copy-row {
        grid-template-columns: 1fr auto;
        align-items: center;
      }

      button,
      .button-link,
      summary {
        appearance: none;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        text-align: center;
        background: #fff;
        color: var(--text);
        transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease;
      }

      button:active,
      .button-link:active,
      summary:active {
        transform: scale(0.97);
      }

      button:focus-visible,
      .button-link:focus-visible,
      summary:focus-visible,
      input:focus-visible,
      textarea:focus-visible {
        outline: 3px solid rgba(37, 99, 235, 0.24);
        outline-offset: 2px;
      }

      button.primary,
      .button-link.primary {
        background: var(--accent);
        border-color: var(--accent-strong);
        color: #fff;
      }

      button.secondary,
      .button-link.secondary {
        background: var(--surface-muted);
        border-color: var(--line);
        color: var(--text);
      }

      button.danger {
        color: var(--danger);
        border-color: rgba(220, 38, 38, 0.18);
        background: #fff7f7;
      }

      button:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .stats .mini,
      .card,
      .feed-item {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--surface-strong);
      }

      .stats .mini,
      .card {
        padding: 14px;
      }

      .feed-item {
        padding: 14px;
        display: grid;
        gap: 10px;
        position: relative;
      }

      .feed-item.direction-incoming::before,
      .feed-item.direction-outgoing::before {
        content: "";
        position: absolute;
        left: 0;
        top: 12px;
        bottom: 12px;
        width: 4px;
        border-radius: 999px;
      }

      .feed-item.direction-incoming::before {
        background: var(--success);
      }

      .feed-item.direction-outgoing::before {
        background: var(--accent);
      }

      .eyebrow {
        margin: 0 0 4px;
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--accent);
        font-weight: 700;
      }

      .label {
        display: block;
        color: var(--muted);
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
        margin-bottom: 4px;
      }

      input,
      textarea {
        width: 100%;
        border: 1px solid var(--line-strong);
        border-radius: 12px;
        padding: 12px 14px;
        font: inherit;
        background: rgba(255, 255, 255, 0.95);
      }

      textarea {
        min-height: 112px;
        resize: vertical;
      }

      .composer {
        display: grid;
        gap: 12px;
      }

      .timeline-badges,
      .participants {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .timeline-badges {
        margin-top: 10px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .chip.direction-incoming {
        background: var(--success-soft);
        color: var(--success);
      }

      .chip.direction-outgoing {
        background: var(--accent-soft);
        color: var(--accent);
      }

      .chip.type {
        background: rgba(16, 32, 51, 0.06);
        color: var(--muted);
      }

      .chip.host {
        background: var(--warning-soft);
        color: #8a5b00;
      }

      .hidden {
        display: none !important;
      }

      ul.clean {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .feed-title {
        font-weight: 700;
        font-size: 1rem;
      }

      .feed-body {
        margin-top: 10px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .feed-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .feed-actions button,
      .feed-actions a {
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(16, 32, 51, 0.06);
        color: var(--text);
        font-weight: 700;
        text-decoration: none;
      }

      .preview {
        width: 100%;
        max-height: 240px;
        object-fit: cover;
        border-radius: 14px;
        margin-top: 10px;
        background: rgba(16, 32, 51, 0.04);
      }

      .room-code {
        font-size: 2rem;
        letter-spacing: 0.18em;
        font-weight: 800;
      }

      .qr-card {
        display: grid;
        gap: 8px;
        justify-items: center;
      }

      #room-qr {
        width: min(132px, 100%);
        background: #fff;
        border-radius: 10px;
        padding: 6px;
        border: 1px solid rgba(16, 32, 51, 0.08);
      }

      .inline-form {
        display: grid;
        gap: 10px;
      }

      code {
        font-family: "SFMono-Regular", "Menlo", monospace;
        word-break: break-all;
      }

      .dropzone {
        border: 1.5px dashed rgba(37, 99, 235, 0.32);
        border-radius: 18px;
        padding: 18px;
        background: rgba(219, 234, 254, 0.52);
        cursor: pointer;
      }

      .dropzone.dragover {
        background: rgba(219, 234, 254, 0.9);
        border-color: rgba(37, 99, 235, 0.62);
      }

      .success-text {
        color: var(--success);
        font-weight: 700;
      }

      .dropzone-note {
        margin: 0;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .receiver-app {
        gap: 14px;
      }

      .receiver-ribbon {
        display: grid;
        gap: 12px;
        padding: 14px 16px;
      }

      .ribbon-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }

      .ribbon-title {
        display: grid;
        gap: 4px;
      }

      .ribbon-title h1 {
        margin: 0;
        font-size: clamp(1.35rem, 2.2vw, 1.9rem);
        letter-spacing: -0.02em;
      }

      .ribbon-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(160px, 190px) minmax(126px, 150px);
        gap: 12px;
        align-items: stretch;
      }

      .ribbon-link {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: var(--surface-muted);
      }

      .ribbon-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .room-token {
        width: 100%;
        display: grid;
        justify-items: start;
        align-content: center;
        gap: 8px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(219, 234, 254, 0.72) 0%, rgba(255, 255, 255, 0.92) 100%);
        color: var(--text);
      }

      .room-token .room-code {
        font-size: clamp(1.7rem, 3.2vw, 2.25rem);
        letter-spacing: 0.14em;
      }

      .token-helper {
        color: var(--muted);
        font-weight: 600;
        font-size: 0.82rem;
      }

      .qr-chip {
        display: grid;
        justify-items: center;
        align-content: center;
        gap: 6px;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: var(--surface-strong);
      }

      .ribbon-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .ribbon-metrics .chip {
        font-size: 0.8rem;
      }

      .ribbon-metrics .chip strong {
        margin-left: 6px;
        color: var(--text);
      }

      .info-strip {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: var(--surface-strong);
      }

      .info-copy {
        min-width: 0;
      }

      .info-copy code,
      #share-url code,
      #received-folder code {
        display: block;
      }

      .utility-menu {
        position: relative;
      }

      .utility-menu summary {
        list-style: none;
        background: var(--surface-muted);
        border-color: var(--line);
        color: var(--text);
        padding: 10px 12px;
      }

      .utility-menu summary::-webkit-details-marker {
        display: none;
      }

      .utility-sheet {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        z-index: 20;
        min-width: 190px;
        padding: 10px;
        display: grid;
        gap: 8px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: var(--surface-strong);
      }

      .utility-sheet button {
        width: 100%;
      }

      .utility-menu:not([open]) .utility-sheet {
        display: none;
      }

      .composer-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .composer-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .receiver-main {
        display: grid;
        grid-template-columns: minmax(0, 1.34fr) minmax(320px, 0.9fr);
        gap: 14px;
        align-items: start;
      }

      .activity-panel,
      .composer-panel,
      .participants-wrap {
        display: grid;
        gap: 12px;
      }

      .stream-tools {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 150px 130px;
        gap: 8px;
      }

      .stream-tools select {
        width: 100%;
        border: 1px solid var(--line-strong);
        border-radius: 12px;
        padding: 11px 12px;
        font: inherit;
        background: rgba(255, 255, 255, 0.95);
        color: var(--text);
      }

      .activity-list {
        max-height: calc(100vh - 250px);
        overflow: auto;
        padding-right: 4px;
      }

      .receiver-details {
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
        background: var(--surface-strong);
      }

      .receiver-details summary {
        width: 100%;
        background: var(--surface-muted);
        border: 0;
        border-radius: 0;
        text-align: left;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .receiver-details summary::after {
        content: '+';
        font-size: 1.2rem;
        color: var(--muted);
      }

      .receiver-details[open] summary::after {
        content: '–';
      }

      .receiver-details-body {
        display: grid;
        gap: 12px;
        padding: 12px;
      }

      .phone-app {
        width: min(100%, 720px);
      }

      .phone-hero {
        padding: 18px;
      }

      .phone-hero h1 {
        font-size: clamp(1.55rem, 7vw, 2.2rem);
      }

      .phone-hero-copy {
        display: grid;
        gap: 10px;
      }

      .phone-meta-row,
      .phone-quick-stats,
      .phone-composer-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .phone-meta-row {
        justify-content: space-between;
      }

      .phone-room-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        background: var(--surface-muted);
        border: 1px solid var(--line);
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .phone-quick-stats .chip {
        font-size: 0.84rem;
      }

      .phone-composer-panel {
        display: grid;
        gap: 12px;
      }

      .phone-composer-panel textarea {
        min-height: 144px;
      }

      .phone-send-button {
        flex: 1 1 180px;
      }

      .phone-stream-header {
        display: grid;
        gap: 4px;
      }

      .phone-details {
        padding: 0;
        overflow: hidden;
      }

      .phone-details summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 18px;
        border: 0;
        border-radius: 0;
        background: transparent;
      }

      .phone-details summary::after {
        content: '+';
        font-size: 1.25rem;
        color: var(--muted);
      }

      .phone-details[open] summary::after {
        content: '–';
      }

      .phone-details-body {
        display: grid;
        gap: 14px;
        padding: 0 18px 18px;
      }

      .transfer-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        margin-top: 2px;
        padding: 8px 11px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent-strong);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }

      @keyframes riseIn {
        from {
          transform: translateY(4px);
          opacity: 0.5;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 1ms !important;
          scroll-behavior: auto !important;
        }
      }

      @media (max-width: 1100px) {
        .receiver-main {
          grid-template-columns: 1fr;
        }

        .activity-list {
          max-height: none;
        }
      }

      @media (max-width: 900px) {
        .ribbon-grid {
          grid-template-columns: 1fr;
        }

        .room-token {
          justify-items: center;
          text-align: center;
        }

        .ribbon-actions > * {
          flex: 1 1 140px;
        }

        .utility-sheet {
          left: 0;
          right: auto;
        }

        .stream-tools {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .identity-row,
        .button-grid,
        .copy-row,
        .info-strip,
        .composer-footer {
          grid-template-columns: 1fr;
        }

        .info-strip,
        .composer-footer {
          display: grid;
        }

        .phone-meta-row {
          align-items: stretch;
        }

        .phone-meta-row,
        .phone-composer-actions {
          flex-direction: column;
        }

        .phone-meta-row > *,
        .phone-composer-actions > * {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    ${body}
    <script>
      ${inlineScript}
    </script>
  </body>
</html>`;
}

export function renderJoinPage(appName: string): string {
  const body = `<main class="grid">
    <section class="hero">
      <p class="eyebrow">Join a temporary room</p>
      <h1>${escapeHtml(appName)}</h1>
      <p>Enter a room code from your Mac and join the local sharing room from this phone.</p>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="section-title">Join room</h2>
          <p class="subtle">This is the PairDrop-style flow: temporary room code, no account, local network only.</p>
        </div>
      </div>
      <div class="inline-form">
        <label>
          <span class="label">Room code</span>
          <input id="room-code-input" type="text" placeholder="ABCDE" maxlength="8" autocapitalize="characters" />
        </label>
        <label>
          <span class="label">Your device name</span>
          <input id="device-name-input" type="text" placeholder="My phone" maxlength="40" />
        </label>
        <div class="actions">
          <button id="join-room" class="primary" type="button">Join room</button>
        </div>
        <div id="join-feedback" class="helper"></div>
      </div>
    </section>
  </main>`;

  const script = `
    const roomInput = document.getElementById('room-code-input');
    const nameInput = document.getElementById('device-name-input');
    const joinButton = document.getElementById('join-room');
    const feedback = document.getElementById('join-feedback');
    const nameKey = 'landrop.phoneName';

    nameInput.value = localStorage.getItem(nameKey) || '';

    function normaliseRoomCode(value) {
      return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    function joinRoom() {
      const roomCode = normaliseRoomCode(roomInput.value);
      if (!roomCode) {
        feedback.textContent = 'Enter a room code first.';
        return;
      }

      const name = nameInput.value.trim();
      if (name) {
        localStorage.setItem(nameKey, name);
      }

      window.location.href = '/r/' + encodeURIComponent(roomCode);
    }

    roomInput.addEventListener('input', () => {
      roomInput.value = normaliseRoomCode(roomInput.value);
    });
    joinButton.addEventListener('click', joinRoom);
    roomInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        joinRoom();
      }
    });
    nameInput.addEventListener('change', () => {
      const name = nameInput.value.trim();
      if (name) {
        localStorage.setItem(nameKey, name);
      }
    });
  `;

  return pageShell(appName + " Join", body, script);
}

export function renderPhonePage(appName: string, roomCode: string): string {
  const body = `<main class="grid phone-app">
    <section class="hero phone-hero">
      <div class="phone-hero-copy">
        <p class="eyebrow">Phone sender</p>
        <div class="phone-meta-row">
          <div>
            <h1>${escapeHtml(appName)}</h1>
            <span class="transfer-kicker">LAN file handoff</span>
            <p>Drop links, notes, and files to your Mac in one step. The transfer stream stays live right below.</p>
          </div>
          <div class="phone-room-pill">
            <span>Room</span>
            <strong id="room-code">${escapeHtml(roomCode)}</strong>
          </div>
        </div>
        <div class="phone-quick-stats">
          <div id="room-status" class="status">Checking room…</div>
          <span class="chip type">People <strong id="participant-count">-</strong></span>
          <span class="chip type">Expires <strong id="room-expiry">-</strong></span>
        </div>
      </div>
    </section>

    <section class="panel phone-composer-panel">
      <div class="panel-header">
        <div>
          <h2 class="section-title">Transfer dock</h2>
          <p class="subtle">Paste a link, note, or text. Attach files if needed. One tap sends the full payload.</p>
        </div>
      </div>
      <div id="composer-dropzone" class="composer dropzone">
        <label>
          <span class="label">Message or link</span>
          <textarea id="composer-input" placeholder="Paste a link, note, or text"></textarea>
        </label>
        <p class="dropzone-note">Tap anywhere in this box to choose files. Desktop browsers can also drag files here.</p>
        <label>
          <span class="label">Sharing as</span>
          <input id="device-name" type="text" placeholder="My phone" maxlength="40" />
        </label>
        <label id="room-pin-wrap" class="hidden">
          <span class="label">Room PIN</span>
          <input id="room-pin" type="password" placeholder="Enter room PIN" maxlength="32" />
        </label>
        <div id="composer-hint" class="helper">Nothing queued yet.</div>
        <input id="file-input" class="hidden" type="file" multiple />
        <ul id="selected-files" class="clean hidden"></ul>
        <div class="phone-composer-actions">
          <button id="attach-files" class="secondary" type="button">Attach files</button>
          <button id="send-composer" class="primary phone-send-button" type="button">Send to room</button>
        </div>
      </div>
      <div id="feedback" class="helper"></div>
    </section>

    <section class="panel">
      <div class="phone-stream-header">
        <h2 class="section-title">Transfer stream</h2>
        <p class="subtle">Inbound and outbound room transfers show up here in real time.</p>
      </div>
      <ul id="timeline-list" class="clean"></ul>
    </section>

    <details class="panel phone-details">
      <summary>
        <div>
          <h2 class="section-title">Room details</h2>
          <p class="subtle">See people in the room or refresh the connection.</p>
        </div>
      </summary>
      <div class="phone-details-body">
        <div id="participant-list" class="participants"></div>
        <button id="refresh-state" class="secondary" type="button">Refresh room</button>
      </div>
    </details>
  </main>`;

  const script = `
    const roomCode = ${JSON.stringify(roomCode)};
    const state = {
      config: null,
      active: false,
      session: null,
      timelineItems: [],
      selectedFiles: [],
      roomPin: localStorage.getItem('landrop.roomPin.' + roomCode) || '',
      pinRequired: false,
      participantId: localStorage.getItem('landrop.phoneParticipantId') || 'phone-' + Math.random().toString(36).slice(2, 10),
      participantName: localStorage.getItem('landrop.phoneName') || '',
      presenceTimer: null
    };
    localStorage.setItem('landrop.phoneParticipantId', state.participantId);

    const elements = {
      status: document.getElementById('room-status'),
      expiry: document.getElementById('room-expiry'),
      participantCount: document.getElementById('participant-count'),
      participantList: document.getElementById('participant-list'),
      deviceName: document.getElementById('device-name'),
      roomPinWrap: document.getElementById('room-pin-wrap'),
      roomPin: document.getElementById('room-pin'),
      feedback: document.getElementById('feedback'),
      refresh: document.getElementById('refresh-state'),
      composerDropzone: document.getElementById('composer-dropzone'),
      composerInput: document.getElementById('composer-input'),
      composerHint: document.getElementById('composer-hint'),
      sendComposer: document.getElementById('send-composer'),
      attachFiles: document.getElementById('attach-files'),
      fileInput: document.getElementById('file-input'),
      selectedFiles: document.getElementById('selected-files'),
      timeline: document.getElementById('timeline-list')
    };

    elements.deviceName.value = state.participantName;
    elements.roomPin.value = state.roomPin;

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function formatTime(input) {
      return new Date(input).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    function formatCountdown(expiresAt) {
      if (!expiresAt) {
        return '-';
      }
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      return minutes + ':' + seconds;
    }

    function formatSize(size) {
      if (!size) {
        return '';
      }
      if (size < 1024) {
        return size + ' B';
      }
      if (size < 1024 * 1024) {
        return (size / 1024).toFixed(1) + ' KB';
      }
      if (size < 1024 * 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(1) + ' MB';
      }
      return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    function currentDeviceName() {
      const explicit = elements.deviceName.value.trim();
      return explicit || 'Phone';
    }

    function currentRoomPin() {
      const pin = elements.roomPin.value.trim();
      state.roomPin = pin;
      if (pin) {
        localStorage.setItem('landrop.roomPin.' + roomCode, pin);
      } else {
        localStorage.removeItem('landrop.roomPin.' + roomCode);
      }
      return pin;
    }

    function setStatus(message, variant) {
      elements.status.textContent = message;
      elements.status.className = 'status';
      if (variant) {
        elements.status.classList.add(variant);
      }
    }

    function setFeedback(message, variant) {
      elements.feedback.textContent = message || '';
      elements.feedback.className = 'helper' + (variant === 'success' ? ' success-text' : '');
    }

    function updatePinVisibility() {
      const enabled = state.pinRequired || Boolean(state.session && state.session.pinEnabled);
      elements.roomPinWrap.classList.toggle('hidden', !enabled);
    }

    function looksLikeUrl(value) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    function inferTextMode(value) {
      const trimmed = value.trim();
      if (looksLikeUrl(trimmed)) {
        return 'url';
      }
      if (trimmed.includes('\\n') || trimmed.length > 160) {
        return 'note';
      }
      return 'text';
    }

    function describeComposer() {
      const text = elements.composerInput.value.trim();
      const fileCount = state.selectedFiles.length;
      if (!text && fileCount === 0) {
        return 'Nothing queued yet.';
      }
      if (text && fileCount > 0) {
        return 'Ready to share ' + inferTextMode(text) + ' plus ' + fileCount + ' file' + (fileCount === 1 ? '' : 's') + '.';
      }
      if (text) {
        return 'Ready to share ' + inferTextMode(text) + '.';
      }
      return 'Ready to share ' + fileCount + ' file' + (fileCount === 1 ? '' : 's') + '.';
    }

    function getSavedPath(item) {
      const value = item && item.metadata ? item.metadata.savedPath : null;
      return typeof value === 'string' ? value : '';
    }

    function renderParticipants() {
      elements.participantList.innerHTML = '';
      const participants = state.session?.participants || [];
      if (!participants.length) {
        elements.participantList.innerHTML = '<span class="chip type">Waiting for people…</span>';
        return;
      }

      participants.forEach((participant) => {
        const chip = document.createElement('span');
        chip.className = 'chip type' + (participant.isHost ? ' host' : '');
        chip.textContent = participant.name + (participant.isHost ? ' · Host' : '');
        elements.participantList.appendChild(chip);
      });
    }

    function renderSelectedFiles() {
      elements.selectedFiles.innerHTML = '';
      elements.selectedFiles.classList.toggle('hidden', state.selectedFiles.length === 0);
      state.selectedFiles.forEach((file) => {
        const row = document.createElement('li');
        row.className = 'feed-item';
        row.innerHTML = '<div class="feed-title">' + escapeHtml(file.name) + '</div><div class="meta">' + formatSize(file.size) + '</div>';
        elements.selectedFiles.appendChild(row);
      });
      elements.composerHint.textContent = describeComposer();
    }

    function renderTimeline() {
      elements.timeline.innerHTML = '';
      if (!state.timelineItems.length) {
        elements.timeline.innerHTML = '<li class="empty">No activity yet.</li>';
        return;
      }

      state.timelineItems.forEach((item) => {
        const row = document.createElement('li');
        const flowClass = item.direction === 'incoming' ? 'direction-incoming' : 'direction-outgoing';
        row.className = 'feed-item ' + flowClass;
        const isFromCurrentPhone = item.senderName === currentDeviceName();
        const flowLabel = item.direction === 'incoming'
          ? (isFromCurrentPhone ? 'Sent to Mac' : item.senderName + ' sent to Mac')
          : (item.senderName === 'Mac' ? 'From Mac' : item.senderName + ' shared from Mac');
        const savedPath = getSavedPath(item);
        const body = item.textContent
          ? '<div class="feed-body">' + escapeHtml(item.textContent) + '</div>'
          : '<div class="meta">' + escapeHtml(item.originalFileName || item.mimeType || 'File') + ' ' + escapeHtml(formatSize(item.size)) + '</div>' +
            (savedPath ? '<div class="meta">Saved to ' + escapeHtml(savedPath) + '</div>' : '');
        const preview = item.type === 'image' && item.previewUrl
          ? '<img class="preview" src="' + escapeHtml(item.previewUrl) + '" alt="' + escapeHtml(item.title || 'Image') + '" />'
          : item.type === 'video' && item.previewUrl
            ? '<video class="preview" controls src="' + escapeHtml(item.previewUrl) + '"></video>'
            : '';
        const actions = [];
        if (item.type === 'url' && item.textContent) {
          actions.push('<a href="' + escapeHtml(item.textContent) + '" target="_blank" rel="noreferrer">Open link</a>');
        }
        if (item.downloadUrl) {
          actions.push('<a href="' + escapeHtml(item.downloadUrl) + '" target="_blank" rel="noreferrer">Open file</a>');
        }
        if ((item.type === 'text' || item.type === 'note' || item.type === 'url') && item.textContent) {
          actions.push('<button data-copy="' + escapeHtml(item.textContent) + '">Copy</button>');
        }
        row.innerHTML =
          '<div class="feed-title">' + escapeHtml(item.title || item.originalFileName || item.type) + '</div>' +
          '<div class="timeline-badges">' +
            '<span class="chip ' + flowClass + '">' + escapeHtml(flowLabel) + '</span>' +
            '<span class="chip type">' + escapeHtml(item.type.toUpperCase()) + '</span>' +
            '<span class="chip type">' + escapeHtml(formatTime(item.createdAt)) + '</span>' +
          '</div>' +
          preview +
          body +
          (actions.length ? '<div class="feed-actions">' + actions.join('') + '</div>' : '');
        elements.timeline.appendChild(row);
      });
    }

    function shouldOpenFilePicker(target) {
      return !(target instanceof Element) || !target.closest('button, input, textarea, a, video');
    }

    async function updatePresence() {
      try {
        const name = currentDeviceName();
        localStorage.setItem('landrop.phoneName', name);
        state.participantName = name;
        await fetch('/api/rooms/' + encodeURIComponent(roomCode) + '/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: state.participantId,
            name,
            role: 'phone',
            source: 'phone',
            isHost: false,
            pin: currentRoomPin() || undefined
          })
        });
      } catch {
        // Presence updates are best effort.
      }
    }

    async function loadConfig() {
      if (state.config) {
        return;
      }
      const response = await fetch('/api/config', { cache: 'no-store' });
      state.config = await response.json();
    }

    async function loadState() {
      try {
        const query = new URLSearchParams();
        const pin = currentRoomPin();
        if (pin) {
          query.set('pin', pin);
        }
        const response = await fetch('/api/rooms/' + encodeURIComponent(roomCode) + '/state' + (query.toString() ? '?' + query.toString() : ''), { cache: 'no-store' });
        if (response.status === 401) {
          state.active = false;
          state.session = null;
          state.timelineItems = [];
          state.pinRequired = true;
          updatePinVisibility();
          renderParticipants();
          renderTimeline();
          setStatus('Room PIN required', 'error');
          setFeedback('Enter the room PIN to continue.', 'error');
          return;
        }
        if (!response.ok) {
          state.active = false;
          state.session = null;
          state.timelineItems = [];
          state.pinRequired = false;
          updatePinVisibility();
          renderParticipants();
          renderTimeline();
          setStatus('Room expired or unavailable', 'error');
          return;
        }
        const payload = await response.json();
        state.active = true;
        state.session = payload.session;
        state.timelineItems = payload.timelineItems || [];
        state.pinRequired = Boolean(payload.session?.pinEnabled);
        updatePinVisibility();
        elements.participantCount.textContent = String(payload.session.participantCount || 0);
        elements.expiry.textContent = formatCountdown(payload.session.expiresAt);
        renderParticipants();
        renderTimeline();
        setStatus('Room active · expires in ' + formatCountdown(payload.session.expiresAt), 'success');
      } catch {
        state.active = false;
        setStatus('Could not reach the local server', 'error');
      }
    }

    async function sendText(mode, content) {
      const response = await fetch('/api/rooms/' + encodeURIComponent(roomCode) + '/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, content, senderName: currentDeviceName(), pin: currentRoomPin() || undefined })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send right now.');
      }
    }

    async function uploadChunkWithRetry(uploadId, chunkIndex, chunk, fileName) {
      let lastMessage = 'Upload failed while sending ' + fileName + '.';
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const chunkResponse = await fetch(
          '/api/uploads/' + encodeURIComponent(uploadId) + '/chunks/' + chunkIndex,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk
          }
        );
        const chunkPayload = await chunkResponse.json().catch(() => ({}));
        if (chunkResponse.ok) {
          return chunkPayload;
        }

        lastMessage = chunkPayload.error || lastMessage;
        if (attempt >= 3 || chunkResponse.status < 500) {
          break;
        }
        setFeedback(
          'Network hiccup. Retrying chunk ' +
            (chunkIndex + 1) +
            ' for ' +
            fileName +
            ' (' +
            attempt +
            '/3)…',
          null
        );
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }

      throw new Error(lastMessage);
    }

    async function sendFiles() {
      await loadConfig();
      const maxFileSizeBytes = state.config.maxChunkedUploadSizeGb * 1024 * 1024 * 1024;

      for (let fileIndex = 0; fileIndex < state.selectedFiles.length; fileIndex += 1) {
        const file = state.selectedFiles[fileIndex];
        if (file.size > maxFileSizeBytes) {
          throw new Error(file.name + ' is larger than ' + state.config.maxChunkedUploadSizeGb + ' GB.');
        }

        setFeedback(
          'Preparing ' + file.name + ' (' + (fileIndex + 1) + '/' + state.selectedFiles.length + ')…',
          null
        );

        const initResponse = await fetch(
          '/api/rooms/' + encodeURIComponent(roomCode) + '/uploads/initiate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalFileName: file.name,
              mimeType: file.type || null,
              size: file.size,
              senderName: currentDeviceName(),
              pin: currentRoomPin() || undefined
            })
          }
        );
        const initPayload = await initResponse.json().catch(() => ({}));
        if (!initResponse.ok) {
          throw new Error(initPayload.error || 'Could not start file upload.');
        }

        const chunkSize = initPayload.chunkSizeBytes || state.config.chunkUploadSizeMb * 1024 * 1024;
        const totalChunks = initPayload.chunkCount || Math.ceil(file.size / chunkSize);
        const uploadId = initPayload.id;

        try {
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(file.size, start + chunkSize);
            const chunk = file.slice(start, end);
            const chunkPayload = await uploadChunkWithRetry(uploadId, chunkIndex, chunk, file.name);

            const uploadedMb = formatSize(chunkPayload.receivedBytes || end);
            const totalMb = formatSize(file.size);
            setFeedback(
              'Uploading ' +
                file.name +
                ' (' +
                (fileIndex + 1) +
                '/' +
                state.selectedFiles.length +
                ') · chunk ' +
                (chunkIndex + 1) +
                '/' +
                totalChunks +
                ' · ' +
                uploadedMb +
                ' of ' +
                totalMb,
              null
            );
          }

          const completeResponse = await fetch(
            '/api/uploads/' + encodeURIComponent(uploadId) + '/complete',
            { method: 'POST' }
          );
          const completePayload = await completeResponse.json().catch(() => ({}));
          if (!completeResponse.ok) {
            throw new Error(completePayload.error || 'Could not finalize ' + file.name + '.');
          }
        } catch (error) {
          await fetch('/api/uploads/' + encodeURIComponent(uploadId), { method: 'DELETE' }).catch(() => {});
          throw error;
        }
      }
    }

    async function sendComposer() {
      if (!state.active) {
        setFeedback('This room is not active anymore.', 'error');
        return;
      }

      const content = elements.composerInput.value.trim();
      const fileCount = state.selectedFiles.length;
      if (!content && fileCount === 0) {
        setFeedback('Paste something or attach files first.', 'error');
        return;
      }

      try {
        await updatePresence();
        const sentParts = [];
        if (content) {
          const mode = inferTextMode(content);
          await sendText(mode, content);
          sentParts.push(mode === 'url' ? 'link' : mode);
        }
        if (fileCount > 0) {
          await sendFiles();
          sentParts.push(fileCount + ' file' + (fileCount === 1 ? '' : 's'));
        }

        elements.composerInput.value = '';
        state.selectedFiles = [];
        elements.fileInput.value = '';
        renderSelectedFiles();
        setFeedback('Shared ' + sentParts.join(' and ') + ' to the room.', 'success');
        await loadState();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Unable to send right now.', 'error');
      }
    }

    function startPresenceLoop() {
      if (state.presenceTimer) {
        clearInterval(state.presenceTimer);
      }
      state.presenceTimer = setInterval(updatePresence, 15000);
    }

    elements.refresh.addEventListener('click', async () => {
      await updatePresence();
      await loadState();
    });
    elements.deviceName.addEventListener('change', async () => {
      localStorage.setItem('landrop.phoneName', currentDeviceName());
      await updatePresence();
      await loadState();
    });
    elements.roomPin.addEventListener('change', async () => {
      currentRoomPin();
      await loadState();
    });
    elements.sendComposer.addEventListener('click', sendComposer);
    elements.attachFiles.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', () => {
      state.selectedFiles = Array.from(elements.fileInput.files || []);
      renderSelectedFiles();
    });
    elements.composerDropzone.addEventListener('click', (event) => {
      if (!shouldOpenFilePicker(event.target)) {
        return;
      }
      elements.fileInput.click();
    });
    elements.composerInput.addEventListener('input', () => {
      elements.composerHint.textContent = describeComposer();
    });
    elements.timelineSearch.addEventListener('input', () => {
      state.timelineSearch = elements.timelineSearch.value || '';
      renderTimeline();
    });
    elements.timelineTypeFilter.addEventListener('change', () => {
      state.timelineTypeFilter = elements.timelineTypeFilter.value || 'all';
      renderTimeline();
    });
    elements.timelineDirectionFilter.addEventListener('change', () => {
      state.timelineDirectionFilter = elements.timelineDirectionFilter.value || 'all';
      renderTimeline();
    });
    elements.timeline.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLButtonElement && target.dataset.copy !== undefined) {
        void navigator.clipboard.writeText(target.dataset.copy);
      }
    });
    ['dragenter', 'dragover'].forEach((eventName) => {
      elements.composerDropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.composerDropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      elements.composerDropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.composerDropzone.classList.remove('dragover');
      });
    });
    elements.composerDropzone.addEventListener('drop', (event) => {
      state.selectedFiles = Array.from(event.dataTransfer?.files || []);
      renderSelectedFiles();
    });

    renderSelectedFiles();
    renderParticipants();
    renderTimeline();
    updatePinVisibility();
    void loadConfig().then(() => updatePresence()).then(loadState);
    startPresenceLoop();
    setInterval(loadState, 3000);
  `;

  return pageShell(appName + " Room", body, script);
}

export function renderDashboardPage(appName: string, sessionId: string | null, sharedHost: string | null): string {
  const body = `<main class="grid receiver-app">
    <section class="panel receiver-ribbon">
      <div class="ribbon-head">
        <div class="ribbon-title">
          <p class="eyebrow">Mac receiver</p>
          <h1>${escapeHtml(appName)}</h1>
        </div>
        <div id="dashboard-status" class="status">Loading dashboard…</div>
      </div>

      <div class="ribbon-grid">
        <div class="ribbon-link">
          <span class="label">Phone link</span>
          <div id="share-url"><code>No active room yet.</code></div>
          <div class="ribbon-actions">
            <button id="copy-link" class="primary" type="button">Copy link</button>
            <button id="open-phone-page" class="secondary" type="button">Open</button>
            <button id="create-session" class="secondary" type="button">New room</button>
            <details class="utility-menu">
              <summary>More</summary>
              <div class="utility-sheet">
                <button id="set-room-pin" class="secondary" type="button">Set / clear PIN</button>
                <button id="open-join-page" class="secondary" type="button">Open join page</button>
                <button id="refresh-dashboard" class="secondary" type="button">Refresh room</button>
                <button id="clear-session" class="danger" type="button">Clear room data</button>
              </div>
            </details>
          </div>
        </div>

        <button id="copy-room-code" class="room-token" type="button">
          <span class="label">Room code</span>
          <strong id="dashboard-room-code" class="room-code">-</strong>
          <span class="token-helper">Tap to copy</span>
        </button>

        <div class="qr-chip">
          <span class="label">Scan</span>
          <img id="room-qr" alt="Room QR code" />
        </div>
      </div>

      <div class="ribbon-metrics">
        <span class="chip type">Local IP <strong id="dashboard-ip">-</strong></span>
        <span class="chip type">People <strong id="dashboard-people">-</strong></span>
        <span class="chip type">Expires <strong id="dashboard-expiry">-</strong></span>
        <span class="chip type">PIN <strong id="dashboard-pin-state">Off</strong></span>
      </div>
    </section>

    <section class="receiver-main">
      <section class="panel activity-panel">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Transfer stream</h2>
            <p class="subtle">A unified timeline of every incoming and outgoing transfer in this room.</p>
          </div>
        </div>
        <div class="stream-tools">
          <input id="timeline-search" type="search" placeholder="Search transfer stream" />
          <select id="timeline-type-filter">
            <option value="all">All types</option>
            <option value="text">Text</option>
            <option value="note">Note</option>
            <option value="url">Link</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="file">File</option>
          </select>
          <select id="timeline-direction-filter">
            <option value="all">In + out</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </select>
        </div>
        <ul id="timeline-list" class="clean activity-list"></ul>
      </section>

      <section class="panel composer-panel">
        <div class="panel-header">
          <div>
            <h2 class="section-title">Send lane</h2>
            <p class="subtle">Push links, notes, or files from Mac back to connected phones.</p>
          </div>
        </div>
        <div id="dashboard-dropzone" class="composer dropzone">
          <label>
            <span class="label">Message or link</span>
            <textarea id="dashboard-composer-input" placeholder="Paste a link, note, or text for the room"></textarea>
          </label>
          <p class="dropzone-note">Drop files here on desktop, or tap this area to choose files.</p>
          <div id="dashboard-composer-hint" class="helper">Nothing queued yet.</div>
          <input id="dashboard-file-input" class="hidden" type="file" multiple />
          <ul id="dashboard-selected-files" class="clean hidden"></ul>
          <div class="composer-footer">
            <div class="composer-actions">
              <button id="dashboard-attach" class="secondary" type="button">Attach files</button>
              <button id="dashboard-send" class="primary" type="button">Share now</button>
            </div>
          </div>
        </div>

        <details class="receiver-details">
          <summary>Room details</summary>
          <div class="receiver-details-body">
            <div class="info-strip">
              <div class="info-copy">
                <span class="label">Received files folder</span>
                <div id="received-folder"><code>Loading…</code></div>
              </div>
              <button id="copy-inbox-path" class="secondary" type="button">Copy path</button>
            </div>

            <label>
              <span class="label">Mac display name</span>
              <input id="dashboard-device-name" type="text" placeholder="My Mac" maxlength="40" />
            </label>

            <div class="participants-wrap">
              <span class="label">People in room</span>
              <div id="participant-list" class="participants"></div>
            </div>

            <p id="network-warning" class="helper hidden"></p>
          </div>
        </details>

        <div id="dashboard-feedback" class="helper"></div>
      </section>
    </section>
  </main>`;

  const script = `
    const initialSessionId = ${JSON.stringify(sessionId)};
    const preferredHostFromQuery = ${JSON.stringify(sharedHost)};
    const sessionStorageKey = 'landrop.dashboardSessionId';
    const state = {
      config: null,
      sessionId: initialSessionId || localStorage.getItem(sessionStorageKey) || null,
      session: null,
      snapshot: null,
      timelineSearch: '',
      timelineTypeFilter: 'all',
      timelineDirectionFilter: 'all',
      selectedFiles: [],
      roomPin: localStorage.getItem('landrop.dashboardRoomPin') || '',
      preferredIp: preferredHostFromQuery || null,
      participantId: localStorage.getItem('landrop.dashboardParticipantId') || 'mac-' + Math.random().toString(36).slice(2, 10),
      participantName: localStorage.getItem('landrop.dashboardName') || 'Mac',
      presenceTimer: null
    };
    localStorage.setItem('landrop.dashboardParticipantId', state.participantId);

    const elements = {
      status: document.getElementById('dashboard-status'),
      ip: document.getElementById('dashboard-ip'),
      roomCode: document.getElementById('dashboard-room-code'),
      people: document.getElementById('dashboard-people'),
      expiry: document.getElementById('dashboard-expiry'),
      pinState: document.getElementById('dashboard-pin-state'),
      shareUrl: document.getElementById('share-url'),
      qrCode: document.getElementById('room-qr'),
      receivedFolder: document.getElementById('received-folder'),
      networkWarning: document.getElementById('network-warning'),
      timeline: document.getElementById('timeline-list'),
      timelineSearch: document.getElementById('timeline-search'),
      timelineTypeFilter: document.getElementById('timeline-type-filter'),
      timelineDirectionFilter: document.getElementById('timeline-direction-filter'),
      participantList: document.getElementById('participant-list'),
      deviceName: document.getElementById('dashboard-device-name'),
      createSession: document.getElementById('create-session'),
      copyLink: document.getElementById('copy-link'),
      copyRoomCode: document.getElementById('copy-room-code'),
      copyInboxPath: document.getElementById('copy-inbox-path'),
      openPhonePage: document.getElementById('open-phone-page'),
      setRoomPin: document.getElementById('set-room-pin'),
      openJoinPage: document.getElementById('open-join-page'),
      clearSession: document.getElementById('clear-session'),
      refresh: document.getElementById('refresh-dashboard'),
      feedback: document.getElementById('dashboard-feedback'),
      dropzone: document.getElementById('dashboard-dropzone'),
      composerInput: document.getElementById('dashboard-composer-input'),
      composerHint: document.getElementById('dashboard-composer-hint'),
      attachFiles: document.getElementById('dashboard-attach'),
      send: document.getElementById('dashboard-send'),
      fileInput: document.getElementById('dashboard-file-input'),
      selectedFiles: document.getElementById('dashboard-selected-files')
    };

    elements.deviceName.value = state.participantName;

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function formatTime(input) {
      return new Date(input).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    function formatCountdown(expiresAt) {
      if (!expiresAt) {
        return '-';
      }
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      return minutes + ':' + seconds;
    }

    function formatSize(size) {
      if (!size) {
        return '';
      }
      if (size < 1024) {
        return size + ' B';
      }
      if (size < 1024 * 1024) {
        return (size / 1024).toFixed(1) + ' KB';
      }
      if (size < 1024 * 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(1) + ' MB';
      }
      return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    function setStatus(message, variant) {
      elements.status.textContent = message;
      elements.status.className = 'status';
      if (variant) {
        elements.status.classList.add(variant);
      }
    }

    function setFeedback(message, variant) {
      elements.feedback.textContent = message || '';
      elements.feedback.className = 'helper' + (variant === 'success' ? ' success-text' : '');
    }

    function currentDeviceName() {
      const explicit = elements.deviceName.value.trim();
      return explicit || 'Mac';
    }

    function currentRoomPin() {
      const pin = (state.roomPin || '').trim();
      if (pin) {
        localStorage.setItem('landrop.dashboardRoomPin', pin);
      } else {
        localStorage.removeItem('landrop.dashboardRoomPin');
      }
      return pin;
    }

    function looksLikeUrl(value) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    function inferTextMode(value) {
      const trimmed = value.trim();
      if (looksLikeUrl(trimmed)) {
        return 'url';
      }
      if (trimmed.includes('\\n') || trimmed.length > 160) {
        return 'note';
      }
      return 'text';
    }

    function describeComposer() {
      const text = elements.composerInput.value.trim();
      const fileCount = state.selectedFiles.length;
      if (!text && fileCount === 0) {
        return 'Nothing queued yet.';
      }
      if (text && fileCount > 0) {
        return 'Ready to share ' + inferTextMode(text) + ' plus ' + fileCount + ' file' + (fileCount === 1 ? '' : 's') + '.';
      }
      if (text) {
        return 'Ready to share ' + inferTextMode(text) + '.';
      }
      return 'Ready to share ' + fileCount + ' file' + (fileCount === 1 ? '' : 's') + '.';
    }

    function getSavedPath(item) {
      const value = item && item.metadata ? item.metadata.savedPath : null;
      return typeof value === 'string' ? value : '';
    }

    function getShareUrl() {
      if (!state.session || !state.config) {
        return null;
      }
      const host = state.preferredIp || state.config.localIps[0];
      if (!host) {
        return null;
      }
      return 'http://' + host + ':' + state.config.port + '/r/' + state.session.roomCode;
    }

    function getQrUrl() {
      if (!state.sessionId) {
        return '';
      }
      const params = new URLSearchParams();
      if (state.preferredIp) {
        params.set('host', state.preferredIp);
      }
      return '/api/sessions/' + encodeURIComponent(state.sessionId) + '/qrcode' + (params.toString() ? '?' + params.toString() : '');
    }

    async function fetchConfig() {
      const response = await fetch('/api/config', { cache: 'no-store' });
      state.config = await response.json();
      if (!state.preferredIp) {
        state.preferredIp = state.config.localIps[0] || null;
      }
    }

    async function updatePresence() {
      if (!state.sessionId) {
        return;
      }
      try {
        const name = currentDeviceName();
        localStorage.setItem('landrop.dashboardName', name);
        state.participantName = name;
        await fetch('/api/sessions/' + encodeURIComponent(state.sessionId) + '/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: state.participantId,
            name,
            role: 'mac',
            source: 'dashboard',
            isHost: true
          })
        });
      } catch {
        // Presence updates are best effort.
      }
    }

    async function createSession() {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentRoomPin() || undefined })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not create a room.');
      }
      const session = payload;
      state.sessionId = session.id;
      localStorage.setItem(sessionStorageKey, session.id);
      await updatePresence();
      await loadState();
    }

    async function clearSession() {
      if (!state.sessionId) {
        return;
      }
      await fetch('/api/sessions/' + encodeURIComponent(state.sessionId), { method: 'DELETE' });
      await loadState();
    }

    async function setOrClearPin() {
      if (!state.sessionId) {
        setFeedback('Create a room first.', 'error');
        return;
      }
      const previous = state.session?.pinEnabled ? '(PIN enabled)' : '(PIN disabled)';
      const result = window.prompt(
        'Set room PIN (4-32 chars, letters/numbers/_/-). Leave blank to clear.',
        currentRoomPin()
      );
      if (result === null) {
        return;
      }
      const nextPin = result.trim();
      const response = await fetch('/api/sessions/' + encodeURIComponent(state.sessionId) + '/pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: nextPin.length ? nextPin : null })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not update room PIN.');
      }
      state.roomPin = nextPin;
      currentRoomPin();
      setFeedback(nextPin ? 'Room PIN updated.' : 'Room PIN cleared.', 'success');
      await loadState(false);
      if (!nextPin && previous !== '(PIN disabled)') {
        await updatePresence();
      }
    }

    function renderParticipants() {
      elements.participantList.innerHTML = '';
      const participants = state.session?.participants || [];
      if (!participants.length) {
        elements.participantList.innerHTML = '<span class="chip type">Nobody joined yet.</span>';
        return;
      }

      participants.forEach((participant) => {
        const chip = document.createElement('span');
        chip.className = 'chip type' + (participant.isHost ? ' host' : '');
        chip.textContent = participant.name + (participant.isHost ? ' · Host' : '');
        elements.participantList.appendChild(chip);
      });
    }

    function renderSelectedFiles() {
      elements.selectedFiles.innerHTML = '';
      elements.selectedFiles.classList.toggle('hidden', state.selectedFiles.length === 0);
      state.selectedFiles.forEach((file) => {
        const item = document.createElement('li');
        item.className = 'feed-item';
        item.innerHTML = '<div class="feed-title">' + escapeHtml(file.name) + '</div><div class="meta">' + escapeHtml(formatSize(file.size)) + '</div>';
        elements.selectedFiles.appendChild(item);
      });
      elements.composerHint.textContent = describeComposer();
    }

    function renderTimeline() {
      elements.timeline.innerHTML = '';
      const items = state.snapshot?.timelineItems || [];
      const query = state.timelineSearch.trim().toLowerCase();
      const filteredItems = items.filter((item) => {
        if (state.timelineTypeFilter !== 'all' && item.type !== state.timelineTypeFilter) {
          return false;
        }
        if (
          state.timelineDirectionFilter !== 'all' &&
          item.direction !== state.timelineDirectionFilter
        ) {
          return false;
        }
        if (!query) {
          return true;
        }
        const blob = [
          item.title || '',
          item.textContent || '',
          item.originalFileName || '',
          item.senderName || '',
          item.mimeType || '',
          item.type || ''
        ]
          .join(' ')
          .toLowerCase();
        return blob.includes(query);
      });

      if (!filteredItems.length) {
        const hasFilter =
          Boolean(query) ||
          state.timelineTypeFilter !== 'all' ||
          state.timelineDirectionFilter !== 'all';
        elements.timeline.innerHTML = '<li class="empty">' + (hasFilter ? 'No matching transfers.' : 'No activity yet.') + '</li>';
        return;
      }
      filteredItems.forEach((item) => {
        const row = document.createElement('li');
        const flowClass = item.direction === 'incoming' ? 'direction-incoming' : 'direction-outgoing';
        row.className = 'feed-item ' + flowClass;
        const flowLabel = item.direction === 'incoming' ? 'From ' + item.senderName : 'Sent by ' + item.senderName;
        const savedPath = getSavedPath(item);
        const body = item.textContent
          ? '<div class="feed-body">' + escapeHtml(item.textContent) + '</div>'
          : '<div class="meta">' + escapeHtml(item.originalFileName || item.mimeType || 'File') + ' ' + escapeHtml(formatSize(item.size)) + '</div>' +
            (savedPath ? '<div class="meta">Saved to ' + escapeHtml(savedPath) + '</div>' : '');
        const preview = item.type === 'image' && item.previewUrl
          ? '<img class="preview" src="' + escapeHtml(item.previewUrl) + '" alt="' + escapeHtml(item.title || 'Image') + '" />'
          : item.type === 'video' && item.previewUrl
            ? '<video class="preview" controls src="' + escapeHtml(item.previewUrl) + '"></video>'
            : '';
        const actions = [];
        if (item.type === 'url' && item.textContent) {
          actions.push('<a href="' + escapeHtml(item.textContent) + '" target="_blank" rel="noreferrer">Open link</a>');
        }
        if (item.downloadUrl) {
          actions.push('<a href="' + escapeHtml(item.downloadUrl) + '" target="_blank" rel="noreferrer">Open file</a>');
        }
        if ((item.type === 'text' || item.type === 'note' || item.type === 'url') && item.textContent) {
          actions.push('<button data-copy="' + escapeHtml(item.textContent) + '">Copy</button>');
        }
        row.innerHTML =
          '<div class="feed-title">' + escapeHtml(item.title || item.originalFileName || item.type) + '</div>' +
          '<div class="timeline-badges">' +
            '<span class="chip ' + flowClass + '">' + escapeHtml(flowLabel) + '</span>' +
            '<span class="chip type">' + escapeHtml(item.type.toUpperCase()) + '</span>' +
            '<span class="chip type">' + escapeHtml(formatTime(item.createdAt)) + '</span>' +
          '</div>' +
          preview +
          body +
          (actions.length ? '<div class="feed-actions">' + actions.join('') + '</div>' : '');
        elements.timeline.appendChild(row);
      });
    }

    function render() {
      const shareUrl = getShareUrl();
      elements.ip.textContent = state.preferredIp || 'Unavailable';
      elements.roomCode.textContent = state.session?.roomCode || '-';
      elements.people.textContent = state.session ? String(state.session.participantCount) : '-';
      elements.expiry.textContent = formatCountdown(state.session?.expiresAt || null);
      elements.pinState.textContent = state.session?.pinEnabled ? 'On' : 'Off';
      elements.shareUrl.innerHTML = shareUrl ? '<code>' + escapeHtml(shareUrl) + '</code>' : '<code>No active room yet.</code>';
      elements.qrCode.src = shareUrl ? getQrUrl() : '';
      elements.qrCode.classList.toggle('hidden', !shareUrl);
      elements.receivedFolder.innerHTML = state.config
        ? '<code>' + escapeHtml(state.config.receivedFilesDir) + '</code>'
        : '<code>Waiting for server…</code>';
      elements.copyLink.disabled = !shareUrl;
      elements.copyRoomCode.disabled = !state.session;
      elements.copyInboxPath.disabled = !state.config;
      elements.openPhonePage.disabled = !shareUrl;
      elements.clearSession.disabled = !state.sessionId;
      elements.setRoomPin.disabled = !state.sessionId;
      elements.send.disabled = !state.sessionId;
      elements.attachFiles.disabled = !state.sessionId;
      elements.createSession.textContent = state.sessionId ? 'New room' : 'Create room';
      elements.networkWarning.classList.toggle('hidden', !state.config || state.config.localIps.length <= 1);
      if (state.config && state.config.localIps.length > 1) {
        elements.networkWarning.textContent = 'Multiple local interfaces detected: ' + state.config.localIps.join(', ') + '. The first address is used for the room link.';
      }
      if (!state.config) {
        setStatus('Local server offline.', 'error');
      } else if (!state.session) {
        setStatus('Preparing your receiver room…', null);
      } else {
        setStatus('Room active · ' + state.session.participantCount + ' participant' + (state.session.participantCount === 1 ? '' : 's') + ' · expires in ' + formatCountdown(state.session.expiresAt), 'success');
      }
      renderParticipants();
      renderSelectedFiles();
      renderTimeline();
    }

    function shouldOpenFilePicker(target) {
      return !(target instanceof Element) || !target.closest('button, input, textarea, a, video');
    }

    async function loadState(allowAutoCreate = true) {
      await fetchConfig();
      if (!state.sessionId) {
        if (allowAutoCreate) {
          await createSession();
          return;
        }
        state.session = null;
        state.snapshot = null;
        render();
        return;
      }
      const response = await fetch('/api/sessions/' + encodeURIComponent(state.sessionId) + '/state', { cache: 'no-store' });
      if (!response.ok) {
        state.session = null;
        state.snapshot = null;
        localStorage.removeItem(sessionStorageKey);
        state.sessionId = null;
        if (allowAutoCreate) {
          await createSession();
          return;
        }
        render();
        return;
      }
      const payload = await response.json();
      state.session = payload.session;
      state.snapshot = payload;
      render();
    }

    async function sendText(mode, content) {
      const response = await fetch('/api/sessions/' + encodeURIComponent(state.sessionId) + '/outgoing/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, content, senderName: currentDeviceName() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send right now.');
      }
    }

    async function uploadChunkWithRetry(uploadId, chunkIndex, chunk, fileName) {
      let lastMessage = 'Upload failed while sending ' + fileName + '.';
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const chunkResponse = await fetch(
          '/api/uploads/' + encodeURIComponent(uploadId) + '/chunks/' + chunkIndex,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: chunk
          }
        );
        const chunkPayload = await chunkResponse.json().catch(() => ({}));
        if (chunkResponse.ok) {
          return chunkPayload;
        }
        lastMessage = chunkPayload.error || lastMessage;
        if (attempt >= 3 || chunkResponse.status < 500) {
          break;
        }
        setFeedback(
          'Network hiccup. Retrying chunk ' +
            (chunkIndex + 1) +
            ' for ' +
            fileName +
            ' (' +
            attempt +
            '/3)…',
          null
        );
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
      throw new Error(lastMessage);
    }

    async function sendFiles() {
      if (!state.config) {
        await fetchConfig();
      }
      const maxFileSizeBytes = state.config.maxChunkedUploadSizeGb * 1024 * 1024 * 1024;

      for (let fileIndex = 0; fileIndex < state.selectedFiles.length; fileIndex += 1) {
        const file = state.selectedFiles[fileIndex];
        if (file.size > maxFileSizeBytes) {
          throw new Error(file.name + ' is larger than ' + state.config.maxChunkedUploadSizeGb + ' GB.');
        }

        setFeedback(
          'Preparing ' + file.name + ' (' + (fileIndex + 1) + '/' + state.selectedFiles.length + ')…',
          null
        );

        const initResponse = await fetch(
          '/api/sessions/' + encodeURIComponent(state.sessionId) + '/outgoing/uploads/initiate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalFileName: file.name,
              mimeType: file.type || null,
              size: file.size,
              senderName: currentDeviceName()
            })
          }
        );
        const initPayload = await initResponse.json().catch(() => ({}));
        if (!initResponse.ok) {
          throw new Error(initPayload.error || 'Could not start file upload.');
        }

        const chunkSize = initPayload.chunkSizeBytes || state.config.chunkUploadSizeMb * 1024 * 1024;
        const totalChunks = initPayload.chunkCount || Math.ceil(file.size / chunkSize);
        const uploadId = initPayload.id;

        try {
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(file.size, start + chunkSize);
            const chunk = file.slice(start, end);
            const chunkPayload = await uploadChunkWithRetry(uploadId, chunkIndex, chunk, file.name);

            const uploadedSize = formatSize(chunkPayload.receivedBytes || end);
            setFeedback(
              'Uploading ' +
                file.name +
                ' (' +
                (fileIndex + 1) +
                '/' +
                state.selectedFiles.length +
                ') · chunk ' +
                (chunkIndex + 1) +
                '/' +
                totalChunks +
                ' · ' +
                uploadedSize +
                ' of ' +
                formatSize(file.size),
              null
            );
          }

          const completeResponse = await fetch(
            '/api/uploads/' + encodeURIComponent(uploadId) + '/complete',
            { method: 'POST' }
          );
          const completePayload = await completeResponse.json().catch(() => ({}));
          if (!completeResponse.ok) {
            throw new Error(completePayload.error || 'Could not finalize ' + file.name + '.');
          }
        } catch (error) {
          await fetch('/api/uploads/' + encodeURIComponent(uploadId), { method: 'DELETE' }).catch(() => {});
          throw error;
        }
      }
    }

    async function sendComposer() {
      if (!state.sessionId) {
        setFeedback('Create a room first.', 'error');
        return;
      }

      const content = elements.composerInput.value.trim();
      const fileCount = state.selectedFiles.length;
      if (!content && fileCount === 0) {
        setFeedback('Paste something or attach files first.', 'error');
        return;
      }

      try {
        await updatePresence();
        const sentParts = [];
        if (content) {
          const mode = inferTextMode(content);
          await sendText(mode, content);
          sentParts.push(mode === 'url' ? 'link' : mode);
        }
        if (fileCount > 0) {
          await sendFiles();
          sentParts.push(fileCount + ' file' + (fileCount === 1 ? '' : 's'));
        }

        elements.composerInput.value = '';
        state.selectedFiles = [];
        elements.fileInput.value = '';
        renderSelectedFiles();
        setFeedback('Shared ' + sentParts.join(' and ') + ' to the room.', 'success');
        await loadState();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Unable to send right now.', 'error');
      }
    }

    function openPhonePage() {
      const shareUrl = getShareUrl();
      if (!shareUrl) {
        return;
      }
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    function openJoinPage() {
      window.open('/join', '_blank', 'noopener,noreferrer');
    }

    function startPresenceLoop() {
      if (state.presenceTimer) {
        clearInterval(state.presenceTimer);
      }
      state.presenceTimer = setInterval(updatePresence, 15000);
    }

    elements.createSession.addEventListener('click', async () => {
      try {
        await createSession();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Unable to create room.', 'error');
      }
    });
    elements.copyLink.addEventListener('click', async () => {
      const shareUrl = getShareUrl();
      if (!shareUrl) {
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setFeedback('Room link copied.', 'success');
    });
    elements.copyRoomCode.addEventListener('click', async () => {
      if (!state.session) {
        return;
      }
      await navigator.clipboard.writeText(state.session.roomCode);
      setFeedback('Room code copied.', 'success');
    });
    elements.copyInboxPath.addEventListener('click', async () => {
      if (!state.config) {
        return;
      }
      await navigator.clipboard.writeText(state.config.receivedFilesDir);
      setFeedback('Inbox folder path copied.', 'success');
    });
    elements.openPhonePage.addEventListener('click', openPhonePage);
    elements.setRoomPin.addEventListener('click', async () => {
      try {
        await setOrClearPin();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Could not update room PIN.', 'error');
      }
    });
    elements.openJoinPage.addEventListener('click', openJoinPage);
    elements.clearSession.addEventListener('click', clearSession);
    elements.refresh.addEventListener('click', async () => {
      await updatePresence();
      await loadState();
    });
    elements.send.addEventListener('click', sendComposer);
    elements.attachFiles.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', () => {
      state.selectedFiles = Array.from(elements.fileInput.files || []);
      renderSelectedFiles();
    });
    elements.dropzone.addEventListener('click', (event) => {
      if (!shouldOpenFilePicker(event.target)) {
        return;
      }
      elements.fileInput.click();
    });
    elements.deviceName.addEventListener('change', async () => {
      localStorage.setItem('landrop.dashboardName', currentDeviceName());
      await updatePresence();
      await loadState();
    });
    elements.composerInput.addEventListener('input', () => {
      elements.composerHint.textContent = describeComposer();
    });
    elements.timeline.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLButtonElement && target.dataset.copy !== undefined) {
        void navigator.clipboard.writeText(target.dataset.copy);
      }
    });
    ['dragenter', 'dragover'].forEach((eventName) => {
      elements.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      elements.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropzone.classList.remove('dragover');
      });
    });
    elements.dropzone.addEventListener('drop', (event) => {
      state.selectedFiles = Array.from(event.dataTransfer?.files || []);
      renderSelectedFiles();
    });

    renderSelectedFiles();
    renderParticipants();
    renderTimeline();
    void fetchConfig()
      .then(async () => {
        if (state.sessionId) {
          await updatePresence();
        }
        await loadState(true);
      });
    startPresenceLoop();
    setInterval(loadState, 2500);
  `;

  return pageShell(appName + " Dashboard", body, script);
}
