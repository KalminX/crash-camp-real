/**
 * SceneNavUI — Handcrafted Game UI based on CRASH CAMP UI/UX Style Guide.
 * Includes HUD, current objectives, inventory, scene transition drawer,
 * and a standalone, noise-free, compact Developer Toolbar dock.
 */

import { WorldSeed } from '../world/WorldSeed.js';

const ICONS = {
  heart: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  wood: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`,
  food: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  arrow: `<svg class="ui-icon arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
};

export class SceneNavUI {
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('scene-nav-panel');
    this.promptEl = document.getElementById('interaction-prompt');
    this.toastContainer = document.getElementById('toast-container');
    this.reticle = document.getElementById('reticle');

    this.isDevOpen = false;
    this.lastSceneData = null;
    this.devToolbarEl = null;

    this.init();
  }

  init() {
    this.createDevToolbar();

    this.game.sceneManager.on('sceneChanged', (data) => {
      this.lastSceneData = data;
      this.render(data);
      this.updateDevToolbar(data);
    });

    this.game.gameState.on('inventoryChanged', () => {
      this.updateStateView();
    });
    this.game.gameState.on('playerChanged', () => {
      this.updateStateView();
    });
    this.game.gameState.on('sceneVisited', () => {
      this.updateStateView();
    });
    this.game.gameState.on('storyChanged', () => {
      this.updateObjective();
    });
    this.game.gameState.on('goalChanged', () => {
      this.updateGoalsView();
    });

    // Dedicated keybinding: ONLY Tilde / Backquote toggles dev toolbar
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Backquote' || e.key === '`' || e.key === '~') {
        e.preventDefault();
        this.toggleDevPanel();
      }
    });
  }

  createDevToolbar() {
    if (document.getElementById('dev-toolbar')) {
      this.devToolbarEl = document.getElementById('dev-toolbar');
      return;
    }

    // Semi-modal backdrop for mobile drawer dismissal
    const backdrop = document.createElement('div');
    backdrop.id = 'dev-backdrop';
    backdrop.className = 'dev-backdrop';
    backdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDevPanel(false);
    });
    document.body.appendChild(backdrop);
    this.devBackdropEl = backdrop;

    const bar = document.createElement('div');
    bar.id = 'dev-toolbar';
    bar.className = 'dev-toolbar';
    bar.innerHTML = `
      <div class="dev-header-row">
        <div class="dev-header-left">
          <span class="dev-drawer-title">DEV CONSOLE</span>
          <span class="dev-fps dev-fps-good" id="dev-fps-display">60 FPS • 16.6ms</span>
          <span class="dev-seed-tag" id="dev-seed-display" style="font-size: 10px; color: #9cb0c6; font-family: monospace; background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 2px; border: 1px solid #38444f;">SEED: ${WorldSeed.getSeed()}</span>
        </div>
        <div class="dev-header-right" style="display: flex; align-items: center; gap: 8px;">
          <span class="dev-url-text" id="dev-url-display">?scene=...</span>
          <button type="button" class="dev-close-btn" id="dev-close-btn" title="Close Dev Toolbar [~]">✕</button>
        </div>
      </div>

      <div class="dev-drawer-section">
        <div class="dev-section-title">WARP TO SCENE</div>
        <div class="dev-scenes-grid" id="dev-scenes-group"></div>
      </div>

      <div class="dev-drawer-section">
        <div class="dev-section-title">SURVIVAL CHEATS & WORLD SEED</div>
        <div class="dev-cheats-grid">
          <button type="button" class="dev-btn" id="cheat-wood" title="Fill wood to max">+WOOD (5/5)</button>
          <button type="button" class="dev-btn" id="cheat-food" title="Fill food to max">+FOOD (5/5)</button>
          <button type="button" class="dev-btn" id="cheat-heal" title="Restore 100% health">HEAL 100%</button>
          <button type="button" class="dev-btn" id="cheat-reset" title="Empty inventory">RESET INV</button>
          <button type="button" class="dev-btn" id="cheat-reroll-seed" title="Reroll procedural world seed and reload">REROLL SEED</button>
          <button type="button" class="dev-btn" id="cheat-wipe" title="Wipe LocalStorage & IndexedDB">WIPE DATA</button>
          <button type="button" class="dev-btn" id="cheat-view" title="Toggle Camera View">VIEW CAM</button>
        </div>
      </div>
    `;

    document.body.appendChild(bar);
    this.devToolbarEl = bar;

    // Connect cheat buttons with mobile haptics
    bar.querySelector('#cheat-wood')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      this.game.gameState.inventory.wood = this.game.gameState.inventory.maxWood;
      this.game.gameState.emit('inventoryChanged', this.game.gameState.inventory);
      this.showToast('Cheat: Wood set to max (5/5)');
    });

    bar.querySelector('#cheat-food')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      this.game.gameState.inventory.food = this.game.gameState.inventory.maxFood;
      this.game.gameState.emit('inventoryChanged', this.game.gameState.inventory);
      this.showToast('Cheat: Food set to max (5/5)');
    });

    bar.querySelector('#cheat-heal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      this.game.gameState.heal(100);
      this.showToast('Cheat: Health restored to 100%');
    });

    bar.querySelector('#cheat-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      this.game.gameState.inventory.wood = 0;
      this.game.gameState.inventory.food = 0;
      this.game.gameState.emit('inventoryChanged', this.game.gameState.inventory);
      this.showToast('Cheat: Inventory cleared');
    });

    bar.querySelector('#cheat-reroll-seed')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      const newSeed = WorldSeed.regenerateSeed();
      const seedEl = bar.querySelector('#dev-seed-display');
      if (seedEl) seedEl.textContent = `SEED: ${newSeed}`;
      this.showToast(`World Seed rerolled: ${newSeed}`);
      if (this.game.sceneManager && this.game.sceneManager.currentScene) {
        const currentId = this.game.sceneManager.currentScene.id;
        this.game.sceneManager.goTo(currentId, true, true);
      }
    });

    bar.querySelector('#cheat-wipe')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      await this.game.gameState.wipeStorage();
      const freshSeed = WorldSeed.regenerateSeed();
      const seedEl = bar.querySelector('#dev-seed-display');
      if (seedEl) seedEl.textContent = `SEED: ${freshSeed}`;
      this.showToast('Storage wiped & World Seed reset');
      if (this.lastSceneData) {
        this.render(this.lastSceneData);
      }
    });

    bar.querySelector('#cheat-view')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(15);
      if (this.game.input && typeof this.game.input.onToggleView === 'function') {
        this.game.input.onToggleView();
      }
    });

    bar.querySelector('#dev-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navigator.vibrate) navigator.vibrate(10);
      this.toggleDevPanel(false);
    });
  }

  updateDevToolbar(data) {
    if (!this.devToolbarEl) return;

    const { currentSceneId, allScenes = [] } = data;
    const group = this.devToolbarEl.querySelector('#dev-scenes-group');
    const urlDisplay = this.devToolbarEl.querySelector('#dev-url-display');

    if (urlDisplay) {
      urlDisplay.textContent = `?scene=${currentSceneId}`;
    }

    const seedEl = this.devToolbarEl.querySelector('#dev-seed-display');
    if (seedEl) {
      seedEl.textContent = `SEED: ${WorldSeed.getSeed()}`;
    }

    if (group) {
      const sceneLabels = {
        'scene-00-intro': '0: INTRO',
        'scene-01-the-crash': '1: CRASH',
        'scene-02-the-last-fire': '2: FIRE',
        'scene-03-morning-after': '3: DAWN',
      };

      group.innerHTML = allScenes
        .map((s) => {
          const isActive = s.id === currentSceneId;
          const label = sceneLabels[s.id] || s.name.toUpperCase();
          return `<button type="button" class="dev-btn ${isActive ? 'active' : ''}" data-dev-id="${s.id}">${label}</button>`;
        })
        .join('');

      group.querySelectorAll('.dev-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (navigator.vibrate) navigator.vibrate(15);
          const targetId = btn.getAttribute('data-dev-id');
          if (targetId && targetId !== currentSceneId) {
            this.game.sceneManager.goTo(targetId, true, true);
          }
        });
      });
    }
  }

  toggleDevPanel(forceState = null) {
    this.isDevOpen = forceState !== null ? forceState : !this.isDevOpen;
    if (this.devToolbarEl) {
      this.devToolbarEl.classList.toggle('open', this.isDevOpen);
    }
    if (this.devBackdropEl) {
      this.devBackdropEl.classList.toggle('open', this.isDevOpen);
    }
    const devBtn = document.getElementById('panel-dev-btn');
    if (devBtn) {
      devBtn.classList.toggle('active', this.isDevOpen);
    }
  }

  render(data) {
    if (!this.container) return;

    const {
      currentSceneId,
      currentSceneName,
      act = 'ACT I',
      actName = 'THE CRASH',
      defaultObjective = 'Survive and explore the wilderness',
      availableTransitions = [],
    } = data;

    const inv = this.game.gameState.inventory;
    const player = this.game.gameState.player;

    const goalsProgress = this.game.gameState.getSceneGoalsProgress(currentSceneId);

    this.container.innerHTML = `
      <div class="nav-panel">
        <div class="panel-header">
          <div class="panel-header-top">
            <span class="panel-tag">${act} &bull; ${actName}</span>
            <div class="panel-header-actions">
              <span class="hud-fps-badge dev-fps-good" id="hud-fps-badge" title="Real-time Frame Rate">60 FPS</span>
              <button type="button" class="panel-dev-btn ${this.isDevOpen ? 'active' : ''}" id="panel-dev-btn" title="Toggle Developer Toolbar [~]">DEV</button>
              <button type="button" class="panel-view-btn active" id="panel-view-btn" title="Toggle Camera View [V]">BIRD VIEW</button>
              <button type="button" class="panel-collapse-btn" id="panel-collapse-btn" aria-label="Toggle Panel">−</button>
            </div>
          </div>
          <div class="scene-current">
            <span class="scene-label">${act}</span>
            <span class="scene-name">${currentSceneName.toUpperCase()}</span>
          </div>
        </div>

        <div class="objective-box" id="ui-objective-box">
          ${
            goalsProgress.total > 0
              ? `
            <div class="objective-header">
              <span class="objective-label">SCENE OBJECTIVES</span>
              <span class="objective-counter" id="ui-goals-counter">${goalsProgress.completed}/${goalsProgress.total}</span>
            </div>
            <div class="goals-list" id="ui-goals-list">
              ${goalsProgress.goals
                .map(
                  (g) => `
                <div class="goal-row ${g.completed ? 'completed' : ''}">
                  <span class="goal-checkbox">${g.completed ? '✓' : '○'}</span>
                  <span class="goal-text">${g.text}</span>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : `
            <span class="objective-label">CURRENT STATUS</span>
            <span class="objective-text" id="ui-objective">${defaultObjective}</span>
          `
          }
        </div>

        <div class="state-strip">
          <div class="state-metric">
            ${ICONS.heart}
            <span class="metric-label">HEALTH</span>
            <span class="metric-value" id="ui-health-val">${Math.round(player.health)}%</span>
          </div>
          <div class="state-metric">
            ${ICONS.wood}
            <span class="metric-label">WOOD</span>
            <span class="metric-value"><strong id="ui-wood-count">${inv.wood}</strong>/${inv.maxWood}</span>
          </div>
          <div class="state-metric">
            ${ICONS.food}
            <span class="metric-label">FOOD</span>
            <span class="metric-value"><strong id="ui-food-count">${inv.food}</strong>/${inv.maxFood}</span>
          </div>
        </div>

        <!-- Story Transitions Section -->
        <div class="transitions-section">
          <div class="section-title">STORY TRANSITIONS</div>
          <div class="transition-buttons">
            ${
              availableTransitions.length > 0
                ? availableTransitions
                    .map(
                      (t) => `
              <button class="nav-btn" data-target="${t.id}">
                <span class="btn-target">${t.name}</span>
                ${ICONS.arrow}
              </button>
            `
                    )
                    .join('')
                : '<div class="no-transitions">No direct story exit unlocked yet</div>'
            }
          </div>
        </div>

        <div class="panel-footer">
          <span>[V] View &bull; [~] Dev &bull; [E] Action &bull; WASD / Joy</span>
        </div>
      </div>
    `;

    // Connect event handlers
    const collapseBtn = this.container.querySelector('#panel-collapse-btn');
    const navPanel = this.container.querySelector('.nav-panel');
    if (collapseBtn && navPanel) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = navPanel.classList.toggle('collapsed');
        collapseBtn.textContent = isCollapsed ? '+' : '−';
      });
    }

    const devBtn = this.container.querySelector('#panel-dev-btn');
    if (devBtn) {
      devBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDevPanel();
      });
    }

    const viewBtn = this.container.querySelector('#panel-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.toggleCameraMode();
      });
    }

    // Story transition buttons
    const navButtons = this.container.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        if (targetId) {
          this.game.sceneManager.goTo(targetId);
        }
      });
    });
  }

  updateGoalsView() {
    if (!this.lastSceneData) return;
    const progress = this.game.gameState.getSceneGoalsProgress(this.lastSceneData.currentSceneId);
    const counterEl = document.getElementById('ui-goals-counter');
    const listEl = document.getElementById('ui-goals-list');

    if (counterEl) {
      counterEl.textContent = `${progress.completed}/${progress.total}`;
    }

    if (listEl && progress.goals) {
      listEl.innerHTML = progress.goals
        .map(
          (g) => `
        <div class="goal-row ${g.completed ? 'completed' : ''}">
          <span class="goal-checkbox">${g.completed ? '✓' : '○'}</span>
          <span class="goal-text">${g.text}</span>
        </div>
      `
        )
        .join('');
    }
  }

  updateStateView() {
    const inv = this.game.gameState.inventory;
    const player = this.game.gameState.player;
    const woodEl = document.getElementById('ui-wood-count');
    const foodEl = document.getElementById('ui-food-count');
    const hpEl = document.getElementById('ui-health-val');
    if (woodEl) woodEl.textContent = inv.wood;
    if (foodEl) foodEl.textContent = inv.food;
    if (hpEl) hpEl.textContent = `${Math.round(player.health)}%`;
  }

  updateObjective(customText = null) {
    const objEl = document.getElementById('ui-objective');
    if (objEl) {
      if (customText) {
        objEl.textContent = customText;
      } else if (this.lastSceneData && this.lastSceneData.defaultObjective) {
        objEl.textContent = this.lastSceneData.defaultObjective;
      }
    }
  }

  setPrompt(promptText = null) {
    if (this.promptEl) {
      if (promptText) {
        const cleanText = promptText.replace(/^Press \[E\] (or Click to )?/i, '').replace(/^\[E\] /i, '');
        this.promptEl.innerHTML = `<span class="key-badge">E</span><span class="prompt-text">${cleanText}</span>`;
        this.promptEl.classList.remove('hidden');
        if (this.reticle) this.reticle.classList.add('active');
      } else {
        this.promptEl.classList.add('hidden');
        if (this.reticle) this.reticle.classList.remove('active');
      }
    }
  }

  showToast(message) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2400);
  }

  update(dt) {
    this.updateFpsDisplay();
  }

  updateFpsDisplay() {
    if (!this.game || !this.game.time) return;

    const fps = this.game.time.fps;
    const ms = this.game.time.frameTimeMs;

    if (fps === this._lastRenderedFps && ms === this._lastRenderedMs) {
      return;
    }
    this._lastRenderedFps = fps;
    this._lastRenderedMs = ms;

    let statusClass = 'dev-fps-good';
    if (fps < 30) {
      statusClass = 'dev-fps-bad';
    } else if (fps < 55) {
      statusClass = 'dev-fps-mid';
    }

    // 1. Permanent HUD Badge
    const hudBadge = document.getElementById('hud-fps-badge');
    if (hudBadge) {
      hudBadge.textContent = `${fps} FPS`;
      hudBadge.className = `hud-fps-badge ${statusClass}`;
    }

    // 2. Dev Toolbar Display
    if (this.devToolbarEl) {
      const devFps = this.devToolbarEl.querySelector('#dev-fps-display');
      if (devFps) {
        devFps.textContent = `${fps} FPS • ${ms}ms`;
        devFps.className = `dev-fps ${statusClass}`;
      }
    }
  }
}
