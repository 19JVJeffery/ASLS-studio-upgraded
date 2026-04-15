<p align="center">
  <a href="https://studio.asls.io/" target="blank"><img src="./src/assets/images/studio_logo_textual.svg" height="100" alt="ASLS Studio logo" /></a>
  <p align="center">Open source, locally-hosted show control software and DMX visualizer</p>
</p>

<p align="center">
  <a href="https://madewithvuejs.com/p/asls-studio/shield-link" target="_blank">
    <img src="https://madewithvuejs.com/storage/repo-shields/4381-shield.svg" alt="MadeWithVueJs.com shield" />
  </a>
  <a href="https://github.com/ASLS-org/studio/?tab=GPL-3.0-1-ov-file" target="_blank">
    <img src="https://img.shields.io/github/license/asls-org/studio" alt="License" />
  </a>
  <a href="https://github.com/ASLS-org/studio/releases" target="_blank">
    <img src="https://img.shields.io/github/v/tag/asls-org/studio?include_prereleases&sort=semver&style=flat&label=version" alt="Version" />
  </a>
</p>

## Overview

ASLS Studio is a locally-hosted, web-based lighting control system built with Vue 3.  
It supports multiple DMX output protocols, a full cue-stack workflow, BPM-sync effect engine, OSC/MIDI input, and filesystem-based show persistence — all served from a Node.js backend that runs on your show computer.

> **Warning**: ASLS Studio is in early beta. Features are provided as-is. Report issues on the [GitHub repository](https://github.com/ASLS-org/studio/issues).

Full documentation is available at [studio.asls.io](https://studio.asls.timekadel.com).

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Running the App](#running-the-app)
4. [Backend Server](#backend-server)
5. [DMX Output Setup](#dmx-output-setup)
6. [Show Control Workflow (Cue Stack)](#show-control-workflow-cue-stack)
7. [External Control (OSC / MIDI)](#external-control-osc--midi)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [File Format & Persistence](#file-format--persistence)
10. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware
- RAM: 4 GB minimum (8 GB+ recommended)
- Graphics: Integrated GPU with WebGL 1.0/2.0 support (dedicated GPU recommended for 3D visualizer)
- Network adapter: Required for Art-Net / sACN output

### Software
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher
- **Browser**: Chrome, Firefox, or any Chromium-based browser (for Web MIDI support)

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/ASLS-org/studio
cd studio

# 2. Install dependencies (includes backend packages)
npm install
```

---

## Running the App

### Option A – Frontend only (no backend, localStorage persistence)

Useful for quick programming without hardware output.

```bash
npm start
```

Then open **http://localhost:5173** in your browser.

### Option B – Full stack (recommended for live use)

Runs the Vite dev server AND the backend Node.js server simultaneously.

```bash
npm run dev:full
```

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:3000/api**
- WebSocket: **ws://localhost:3000/ws**
- OSC input: **udp://localhost:8000**

### Option C – Production build + backend server

```bash
npm run build       # build the frontend into /dist
npm run server      # start the backend (serves /dist automatically)
```

Then open **http://localhost:3000** in your browser.

#### Environment variables (optional)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP / WebSocket server port |
| `OSC_PORT` | `8000` | OSC UDP listener port |
| `SERVER_PORT` | `3000` | Used by Vite dev proxy (must match `PORT`) |
| `AUTOSAVE_INTERVAL_MS` | `60000` | Auto-save interval in milliseconds |

---

## Backend Server

When the backend is running it provides:

| Endpoint | Method | Description |
|---|---|---|
| `/api/shows` | GET | List all saved shows |
| `/api/shows/:name` | GET | Load a specific show |
| `/api/shows/current` | GET | Load the most recently saved show |
| `/api/shows` | POST `{ name, data }` | Save / overwrite a show |
| `/api/shows/:name` | DELETE | Delete a show |
| `/api/fixtures` | GET | Fixture library index |
| `/api/fixtures/:mfr/:model` | GET | Fetch a specific fixture |
| `/api/fixtures/import` | POST | Import a custom OFL fixture |
| `/api/outputs` | GET/POST/DELETE | Manage hardware output sessions |
| `/remote/go` | POST | Advance cue stack (GO) |
| `/remote/back` | POST | Step cue stack back |
| `/remote/cue/:g/:c/go` | POST | Trigger a specific cue |
| `/remote/status` | GET | Server health check |
| `/ws` | WebSocket | DMX streaming + remote events |

Show files are stored in `~/.asls-studio/shows/` as JSON.  
An auto-save snapshot is written to `~/.asls-studio/autosave.json` every 60 s.

---

## DMX Output Setup

Open **Preferences → Outputs** (or press `Ctrl+Shift+O`) to manage output connections.

### Supported output types

| Type | Transport | Description |
|---|---|---|
| **Art-Net** | UDP (backend) | Industry-standard Art-Net 4 node output |
| **sACN / E1.31** | UDP multicast (backend) | ESTA streaming ACN for large rigs |
| **Virtual** | WebSocket | Internal visualizer only (no hardware) |
| **WSC** | WebRTC | Legacy "Web Show Control" bridge to `dmx2ws` |

#### Art-Net wiring

1. Connect your Art-Net node to the same network as the show computer.
2. Configure a static IP on the node (e.g. `192.168.1.100`).
3. In ASLS Studio, add an **Art-Net** output, set the host IP, universe (0-based), and click **Connect**.
4. The backend opens a UDP socket and sends ArtDMX packets at ~40 Hz.

#### sACN wiring

1. Ensure your sACN receiver is on the same multicast-capable network.
2. Add an **sACN** output, set the universe (1–63999), and optionally a unicast target IP.
3. Packets are sent using the ESTA E1.31 protocol at ~40 Hz.

---

## Show Control Workflow (Cue Stack)

The **Cue Stack** lets you build an ordered list of cues that advance on GO.

### Adding cues to the stack

1. Select a group in the sidebar.
2. In the Cue Pool widget, right-click a cue → **Add to Stack**.
   *(Programmatic access: `$show.cueStack.addEntry({ cue, groupId })`)*

### Navigating the stack

| Action | Keyboard | Button |
|---|---|---|
| Advance (GO) | `Enter` | Toolbar **GO ▶** button |
| Step back | `Backspace` | Toolbar **◀ BACK** button |
| Open stack view | `Ctrl+Shift+Q` | Preferences → Cue Stack |

### Cue flags

| Flag | Effect |
|---|---|
| **Block** | Stops tracking from previous cues |
| **Skip** | Entry is skipped during GO/BACK navigation |
| **Loop** | After the last cue, next GO wraps to start |

---

## External Control (OSC / MIDI)

### OSC

The backend listens for OSC messages on **UDP port 8000** (configurable via `OSC_PORT`).

| OSC Address | Arguments | Action |
|---|---|---|
| `/go` | — | Advance cue stack |
| `/back` | — | Step back |
| `/cue/<groupId>/<cueId>/go` | — | Trigger specific cue |
| `/cue/<groupId>/<cueId>/stop` | — | Stop specific cue |
| `/chase/<groupId>/<chaseId>/go` | — | Start a chase |
| `/master/bpm` | `<float>` | Set master BPM |

Example using [TouchOSC](https://hexler.net/touchosc):

```
/go   →  server IP: 192.168.1.x, port: 8000
```

### MIDI (Web MIDI API)

MIDI is handled in the browser using the Web MIDI API (Chrome required).

```js
import MidiController from '@/plugins/midi';

await MidiController.init();

// Trigger GO on note C4 (channel 1)
MidiController.onNote(1, 60, () => $show.cueStack.go());

// Control master dimmer with CC #7 (channel 1)
MidiController.onCC(1, 7, ({ value }) => { $show.master.dimmer = value / 127; });
```

---

## Keyboard Shortcuts

All shortcuts are registered in `src/plugins/shortcuts.js` and can be customised at runtime.

| Shortcut | Action |
|---|---|
| `Enter` | Cue Stack GO |
| `Backspace` | Cue Stack BACK |
| `Space` | Play / Pause show |
| `Ctrl+S` | Save show |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+Q` | Open Cue Stack |
| `Ctrl+Shift+O` | Open Outputs |
| `Ctrl+Shift+V` | Open Visualizer settings |

Custom shortcuts:

```js
import Shortcuts from '@/plugins/shortcuts';
Shortcuts.register('F1', 'Load Scene 1', () => loadScene(1));
```

---

## File Format & Persistence

### Show files

Shows are stored as JSON (`.asls` / `.json`).  The current schema version is **v2**.

When the backend server is running, shows are saved to `~/.asls-studio/shows/<name>.json` and also persisted in `localStorage` as a fallback.

| Version | Changes |
|---|---|
| v1 | Original localStorage format |
| v2 | Added `cueStack`, `_version` field; migration is automatic |

### Importing QLC+ shows

1. **File → Open** and select a `.qxw` workspace file.
2. ASLS imports:
   - All fixtures (manufacturer / model / universe / address)
   - All universes
   - All QLC+ **Scene** functions → converted to ASLS cues inside an "Imported Scenes" group

### Exporting (Save to file)

Use **File → Save As** to download the current show as a JSON file.

---

## Troubleshooting

| Symptom | Solution |
|---|---|
| "Build not found" when opening `http://localhost:3000` | Run `npm run build` first |
| Art-Net not sending | Check firewall; ensure node IP is reachable; verify universe number |
| OSC not received | Check `OSC_PORT` matches your controller; ensure no firewall block on UDP |
| MIDI not detected | Use Chrome; accept the Web MIDI permission prompt |
| Show not persisted | Start the backend server (`npm run server`); check `~/.asls-studio/shows/` |

For other issues, please open a ticket on the [GitHub repository](https://github.com/ASLS-org/studio/issues).

