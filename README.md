# Crash Camp 🌲🔥

An atmospheric, episodic 3D wilderness survival game built with **Three.js**, **Cannon-es**, and **Vite**. 

Following the catastrophic crash of Flight 402 deep in the sub-zero wilderness, you awaken alone amidst burning fuselage and falling snow. To stay alive, you must salvage emergency rations, establish a life-saving campfire, maintain emergency beacon power, and piece together clues revealing that the crash was no accident.

---

## 🧭 Story & Narrative Progression

Crash Camp is structured as an episodic, narrative-driven survival mystery spanning **6 Acts and 19 Scenes** (plus Act 0 Prologue), progressing from raw individual survival to settlement management and uncovering a classified mystery:

```
ACT 0: PROLOGUE (The Storm)
  └─ Scene 00: Flight 402 — Penetrate the blizzard; turbulence and mid-air catastrophe
ACT I: THE CRASH
  ├─ Scene 01: The Crash — Wake up at smoldering wreckage, salvage rations, inspect beacon
  └─ Scene 02: The Last Fire — Gather pine logs, feed the fire, power beacon, survive the freezing night
ACT II: STRANDED
  ├─ Scene 03: Morning After — Dawn breaks with no rescue; discover classified flight dossiers
  ├─ Scene 04: Search for Survivors — Track blood and footprints deep into the woods
  └─ Scene 05: The Other Survivor — First moral choices; survival shifts from resources to people
ACT III: THE FOREST
  ├─ Scene 06: Into the Forest — Rivers, caves, and territorial wildlife
  ├─ Scene 07: The Old Camp — Relics and journals proving past expeditions were lost here
  └─ Scene 08: The Signal — Power an abandoned radio repeater broadcasting cryptic coordinates
ACT IV: THE SETTLEMENT
  ├─ Scene 09: Establishing Camp — Construct permanent shelter, storage, and crafting stations
  ├─ Scene 10: More Survivors — Faction management, survivor traits, and ideological friction
  └─ Scene 11: The Storm — Severe blizzard; test of community resilience and medical supplies
ACT V: THE TRUTH
  ├─ Scene 12: The Facility — Infiltrate an abandoned underground military research installation
  ├─ Scene 13: The Records — Black box telemetry, classified manifests, and conspiracy files
  └─ Scene 14: The Truth — The revelation behind why Flight 402 was brought down
ACT VI: THE ESCAPE
  ├─ Scene 15: Build the Way Out — Construct extraction beacon and repair signal mast
  ├─ Scene 16: The Journey — Group trek across rivers and frozen mountain ridges
  ├─ Scene 17: The Final Night — Protect camp and fire in a desperate last stand
  ├─ Scene 18: Rescue — Sunrise helicopter extraction
  └─ Scene 19: The Ending — 4 Branching Endings (Rescue / Stay / Expose Truth / Sacrifice)
```

---

## ⚡ Key Systems & Technical Architecture

### 1. Modular Scene Engine & Isolation
- **Self-Contained Scene Lifecycle**: Every scene inherits from `BaseScene` and strictly implements `CREATE → ENTER → UPDATE → EXIT → DISPOSE`. When navigating between scenes, all Three.js meshes, materials, physics bodies, and event listeners are fully purged from GPU/CPU memory to prevent leaks.
- **Declarative Navigation**: Scenes and transition graphs are configured in `src/scenes/sceneConfig.js` and registered in `src/scenes/sceneRegistry.js`.
- **Cross-Scene State Persistence**: `GameState` acts as a single source of truth for player health, inventory (food, firewood), narrative flags, and objective statuses, synchronizing persistently with `LocalStorage` and `IndexedDB`.

### 2. 60 FPS Performance Engine & Dynamic Resolution Scaling (DRS)
- **Automatic Framerate Governor**: Continuously samples frame times; scales WebGL render resolution dynamically (`0.75x` to `1.35x` DPR) to sustain 60 FPS on lower-tier mobile hardware.
- **Instanced Foliage & Shadow Culling**: Dense pine forests (1,500+ trees) and boulders are rendered via GPU instancing with cast/receive shadow passes disabled where visually negligible.
- **Matrix Freezing**: `matrixAutoUpdate` is frozen on static terrain tiles, rock LODs, and wreckage geometry.
- **Lighting Consolidation**: Ambient illumination and dynamic rim lights are unified across scenes to eliminate multi-pass overhead.

### 3. Progressive Web App (PWA) & 100% Offline Play
- **WebGL Cache-First Service Worker**: `public/sw.js` caches all code, assets, audio, and large 3D binary assets (`airplane.glb`, `crash_site.glb`, `character.glb`) for full offline playability.
- **App Install Integration**: Includes `public/manifest.json`, high-resolution maskable icons, standalone display mode, and an in-game one-click PWA install banner listening to `beforeinstallprompt`.
- **Network Status Monitor**: Real-time HUD badge displays current connectivity (`ONLINE` / `OFFLINE`).

### 4. Cross-Platform Controls & High-DPI Mobile Support
- **Desktop**:
  - `W` / `A` / `S` / `D` or Arrow Keys — Movement
  - `Shift` — Sprint
  - `E` or Left Click — Interact / Salvage / Fuel Fire
  - `Q` or `1` — Consume Emergency Ration (Restores Health)
  - `V` or `C` — Toggle Camera Perspective (Overhead Isometric ↔ Eye-Level Third-Person)
  - Right Mouse Drag — Free Orbit Camera (no cursor lock required)
  - Mouse Wheel — Zoom In / Out
- **Mobile**:
  - Dual responsive virtual joysticks (movement and camera orbit).
  - Dedicated touch action buttons (`[E]`, `[Q]`, `[V]`).
  - Pinch-to-zoom multi-touch gestures.
  - Adaptive FoV and `highp` precision shaders for crisp Retina rendering without visual banding.

### 5. Handcrafted, Utilitarian Aesthetic
In strict compliance with `style_guide.txt`, the UI avoids generic AI-template tropes:
- Restrained, physical survival HUD: dark earth/forest palette (`#171918`, `#242724`, `#d4a373`).
- Utilitarian typography and high-contrast physical key badges (`<span class="key-badge">E</span>`).
- Zero floating glassmorphic gradient noise, neon glow, or unnecessary modal popups.

---

## 📂 Project Structure

```
crash-camp-real/
├── index.html                 # Main HTML entry point & PWA meta tags
├── vite.config.js             # Vite build configuration
├── package.json               # Dependencies and build scripts
├── project_requirements.txt   # Complete 19-scene roadmap & architectural spec
├── project_main.txt           # Narrative design & story beat documentation
├── style_guide.txt            # Human-designed UI/UX styling principles
├── public/
│   ├── manifest.json          # PWA web app manifest
│   ├── sw.js                  # Dedicated 3D asset caching service worker
│   ├── favicon.ico / .svg     # Vector and raster favicon icons
│   ├── icons/                 # PWA icon set (192px, 512px, maskable)
│   └── models/                # 3D GLTF/GLB models (airplane, character, crash_site)
└── src/
    ├── main.js                # App bootstrap & service worker registration
    ├── style.css              # Survival HUD styles & key badge styling
    ├── core/
    │   ├── Game.js            # Engine orchestrator, DRS governor, WebGL renderer
    │   ├── GameLoop.js        # Fixed-timestep loop & tick dispatch
    │   ├── GameState.js       # Central reactive state manager
    │   ├── StorageService.js  # LocalStorage & IndexedDB persistence adapter
    │   ├── Input.js           # Keyboard & mouse event aggregation
    │   └── TouchControls.js   # Mobile virtual joysticks & touch buttons
    ├── scenes/
    │   ├── BaseScene.js       # Lifecycle contract (create/enter/update/exit/dispose)
    │   ├── SceneManager.js    # Scene transitions, preloading & blackout cuts
    │   ├── sceneConfig.js     # Declarative scene graph, objectives & goals
    │   ├── sceneRegistry.js   # Dynamic scene class registry
    │   ├── act-0-prologue/    # Scene 00: Flight 402 Intro
    │   ├── act-1-the-crash/   # Scene 01: The Crash & Scene 02: The Last Fire
    │   └── act-2-stranded/    # Scene 03: Morning After
    ├── ecs/                   # Lightweight Entity Component System (World & Components)
    ├── systems/               # MovementSystem, CollisionSystem, RenderSystem
    ├── ui/
    │   ├── SceneNavUI.js      # Scene switcher, objectives checklist, performance presets
    │   └── DialogueUI.js      # Handcrafted branching dialogue overlay
    └── world/
        ├── CrashSiteLoader.js # GLB loader & fallback procedural crash generator
        ├── AirplaneLoader.js  # Intro flight aircraft loader
        ├── ProceduralTerrain.js# Simplex-noise multi-octave alpine terrain
        └── procedural/        # Domain-specific procedural generators:
            ├── materials.js   # Shared PBR materials
            ├── natureModels.js# Instanced pine forests, boulders, streams
            ├── survivalModels.js # Campfires, beacons, ration crates
            └── aircraftModels.js # Wreckage, jet engines, furrow gouges
```

---

## 🛠️ Development & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- `npm` or `pnpm`

### Installation
```bash
# Clone the repository (if not already cloned)
git clone https://github.com/KalminX/crash-camp-real.git

# Navigate into the project folder
cd crash-camp-real

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### Building for Production
```bash
# Compile and bundle assets into dist/
npm run build

# Preview production build locally
npm run preview
```

### In-Game Console Debugging
The engine attaches the core `Game` instance to `window.__CRASH_CAMP__` in development. You can inspect runtime state and trigger scene transitions directly via DevTools:
```javascript
// Switch to Scene 2
window.__CRASH_CAMP__.sceneManager.goTo('scene-02-the-last-fire');

// Inspect player inventory & vitals
console.log(window.__CRASH_CAMP__.gameState.state);
```

---

## 📄 License
ISC / Private (Refer to project maintainers for distribution terms).
