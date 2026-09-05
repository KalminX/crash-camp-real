/**
 * SceneNavUI — Handcrafted Game UI based on CRASH CAMP UI/UX Style Guide.
 * Restrained, functional, physical, zero emojis, Lucide SVG icons, anti-AI aesthetic.
 */

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

    this.init();
  }

  init() {
    this.game.sceneManager.on('sceneChanged', (data) => {
      this.render(data);
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
  }

  render(data) {
    if (!this.container) return;

    const { currentSceneId, currentSceneName, availableTransitions } = data;
    const inv = this.game.gameState.inventory;
    const player = this.game.gameState.player;
    const isBeaconFound = this.game.gameState.story.beaconDiscovered;

    const objectiveText = isBeaconFound
      ? 'Power the beacon: Auxiliary power required'
      : 'Locate and inspect the emergency beacon';

    this.container.innerHTML = `
      <div class="nav-panel">
        <div class="panel-header">
          <div class="panel-header-top">
            <span class="panel-tag">ACT I &bull; THE CRASH</span>
            <div class="panel-header-actions">
              <button type="button" class="panel-view-btn active" id="panel-view-btn" title="Switch View between First-Person and Bird's-Eye [V]">BIRD VIEW</button>
              <button type="button" class="panel-collapse-btn" id="panel-collapse-btn" aria-label="Toggle Panel">−</button>
            </div>
          </div>
          <div class="scene-current">
            <span class="scene-label">SCENE 1</span>
            <span class="scene-name">${currentSceneName.toUpperCase()}</span>
          </div>
        </div>

        <div class="objective-box">
          <span class="objective-label">CURRENT OBJECTIVE</span>
          <span class="objective-text" id="ui-objective">${objectiveText}</span>
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

        <div class="transitions-section">
          <div class="section-title">SCENE TRANSITIONS</div>
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
                : '<div class="no-transitions">Focus: Scene 1 (Active)</div>'
            }
          </div>
        </div>

        <div class="panel-footer">
          <span>[V] View &bull; [E] Action &bull; WASD / Joy to Move</span>
        </div>
      </div>
    `;

    // Connect click handlers
    const collapseBtn = this.container.querySelector('#panel-collapse-btn');
    const navPanel = this.container.querySelector('.nav-panel');
    if (collapseBtn && navPanel) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = navPanel.classList.toggle('collapsed');
        collapseBtn.textContent = isCollapsed ? '+' : '−';
      });
    }

    const viewBtn = this.container.querySelector('#panel-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.toggleCameraMode();
      });
    }

    const buttons = this.container.querySelectorAll('.nav-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        if (targetId) {
          this.game.sceneManager.goTo(targetId);
        }
      });
    });
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

  updateObjective() {
    const isBeaconFound = this.game.gameState.story.beaconDiscovered;
    const objEl = document.getElementById('ui-objective');
    if (objEl) {
      objEl.textContent = isBeaconFound
        ? 'Power the beacon: Auxiliary power required'
        : 'Locate and inspect the emergency beacon';
    }
  }

  setPrompt(promptText = null) {
    if (this.promptEl) {
      if (promptText) {
        // Strip any residual "[E]" or "Press [E]" to format clean physical key
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
    }, 2200);
  }
}
