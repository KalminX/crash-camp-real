import { sceneConfig } from './sceneConfig.js';
import { sceneRegistry } from './sceneRegistry.js';

/**
 * SceneManager — Controls scene lifecycle, dynamic chunk loading, transitions,
 * and two-way URL synchronization (?scene=<scene-id>).
 */
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.currentScene = null;
    this.currentSceneId = null;
    this.isTransitioning = false;
    this.listeners = new Map();

    this.setupHistoryListener();
    this.setupGoalAutoTransition();
  }

  setupGoalAutoTransition() {
    if (!this.game || !this.game.gameState) return;

    this.game.gameState.on('sceneGoalsCompleted', ({ sceneId, nextSceneId }) => {
      if (!nextSceneId) return;

      if (this.game.ui) {
        this.game.ui.showToast('All Objectives Complete! Advancing in 2s...');
      }

      setTimeout(() => {
        if (this.currentSceneId === sceneId && !this.isTransitioning) {
          this.goTo(nextSceneId, true, true);
        }
      }, 1800);
    });
  }

  /**
   * Listen for browser forward/back buttons to transition scenes seamlessly.
   */
  setupHistoryListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('popstate', (event) => {
      const targetId = event.state?.sceneId || this.getUrlSceneId() || sceneConfig.start;
      if (targetId && targetId !== this.currentSceneId) {
        this.goTo(targetId, true, false);
      }
    });
  }

  /**
   * Reads ?scene= query parameter from browser address bar.
   */
  getUrlSceneId() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const sceneParam = params.get('scene');
    if (sceneParam && sceneConfig.scenes[sceneParam]) {
      const cfg = sceneConfig.scenes[sceneParam];
      return cfg.aliasOf || sceneParam;
    }
    return null;
  }

  /**
   * Synchronizes browser URL query string with current scene without reloading.
   */
  updateUrl(sceneId, push = true) {
    if (typeof window === 'undefined') return;
    try {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('scene') !== sceneId) {
        currentUrl.searchParams.set('scene', sceneId);
        if (push) {
          window.history.pushState({ sceneId }, '', currentUrl.toString());
        } else {
          window.history.replaceState({ sceneId }, '', currentUrl.toString());
        }
      }
    } catch (err) {
      console.warn('[SceneManager] Error updating URL:', err);
    }
  }

  /**
   * Boots initial scene.
   * Priority: URL query param (?scene=...) -> initialSceneId argument -> sceneConfig.start
   */
  async start(initialSceneId = null) {
    const urlTarget = this.getUrlSceneId();
    let targetId = urlTarget || initialSceneId || sceneConfig.start;

    // Resolve alias
    if (sceneConfig.scenes[targetId]?.aliasOf) {
      targetId = sceneConfig.scenes[targetId].aliasOf;
    }

    this.updateUrl(targetId, false);
    return await this.goTo(targetId, true, false);
  }

  /**
   * Transitions to the target scene ID.
   * Dynamically loads scene code chunk, fully disposes old scene, updates GameState and URL.
   */
  async goTo(targetSceneId, force = false, updateHistory = true) {
    if (this.isTransitioning) {
      console.warn(`[SceneManager] Transition in progress. Discarding goTo("${targetSceneId}")`);
      return false;
    }

    // Resolve aliases
    const targetConfig = sceneConfig.scenes[targetSceneId];
    if (!targetConfig) {
      console.error(`[SceneManager] Unknown sceneId in sceneConfig: "${targetSceneId}"`);
      return false;
    }
    const resolvedId = targetConfig.aliasOf || targetSceneId;

    // Validate target exists in registry
    const loader = sceneRegistry[resolvedId];
    if (!loader) {
      console.error(`[SceneManager] No Scene loader registered in sceneRegistry for: "${resolvedId}"`);
      return false;
    }

    // Validate connection rule (unless starting, forced, or dev jump)
    if (!force && this.currentSceneId) {
      const currentConfig = sceneConfig.scenes[this.currentSceneId];
      const validConnections = currentConfig?.connections || [];
      if (!validConnections.includes(resolvedId)) {
        console.warn(
          `[SceneManager] Disallowed transition: "${this.currentSceneId}" -> "${resolvedId}". Valid connections:`,
          validConnections
        );
        return false;
      }
    }

    this.isTransitioning = true;
    const previousSceneId = this.currentSceneId;

    try {
      // 1. Exit and deep dispose previous scene
      if (this.currentScene) {
        this.currentScene.exit();
        this.currentScene.dispose();
        this.currentScene = null;
      }

      // 2. Dynamically import target scene module if lazy loader
      let SceneClass = null;
      if (typeof loader === 'function') {
        const module = await loader();
        SceneClass = module.default || module[Object.keys(module)[0]];
      } else {
        SceneClass = loader;
      }

      if (!SceneClass) {
        throw new Error(`Failed to resolve SceneClass from loader for "${resolvedId}"`);
      }

      // 3. Instantiate and enter new scene
      this.currentSceneId = resolvedId;
      const nextScene = new SceneClass(this.game);
      this.currentScene = nextScene;

      // Update persistent GameState
      if (this.game.gameState) {
        this.game.gameState.markSceneVisited(resolvedId);
      }

      await nextScene.enter();

      // 4. Update browser URL history
      if (updateHistory) {
        this.updateUrl(resolvedId, true);
      }

      // 5. Notify observers (UI updates navigation buttons, objectives, dev drawer)
      const resolvedConfig = sceneConfig.scenes[resolvedId] || targetConfig;
      this.emit('sceneChanged', {
        currentSceneId: resolvedId,
        currentSceneName: resolvedConfig.name,
        act: resolvedConfig.act,
        actName: resolvedConfig.actName,
        defaultObjective: resolvedConfig.defaultObjective,
        previousSceneId,
        availableTransitions: this.getAvailableTransitions(),
        allScenes: this.getAllScenesList(),
      });

      return true;
    } catch (err) {
      console.error(`[SceneManager] Failed to transition to "${resolvedId}":`, err);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  update(deltaTime) {
    if (this.currentScene && !this.isTransitioning) {
      this.currentScene.update(deltaTime);
    }
  }

  getCurrentScene() {
    return this.currentScene;
  }

  getCurrentSceneId() {
    return this.currentSceneId;
  }

  getCurrentSceneConfig() {
    return this.currentSceneId ? sceneConfig.scenes[this.currentSceneId] : null;
  }

  /**
   * Returns valid transition targets derived directly from sceneConfig.
   */
  getAvailableTransitions() {
    if (!this.currentSceneId) return [];
    const cfg = sceneConfig.scenes[this.currentSceneId];
    if (!cfg || !cfg.connections) return [];

    return cfg.connections.map((targetId) => {
      const targetCfg = sceneConfig.scenes[targetId];
      return {
        id: targetId,
        name: targetCfg ? targetCfg.name : targetId,
        tagline: targetCfg ? targetCfg.tagline : '',
      };
    });
  }

  /**
   * Returns full list of non-aliased scenes for the Dev Panel.
   */
  getAllScenesList() {
    const list = [];
    for (const [id, cfg] of Object.entries(sceneConfig.scenes)) {
      if (cfg.aliasOf) continue;
      list.push({
        id,
        name: cfg.name,
        act: cfg.act,
        actName: cfg.actName,
        tagline: cfg.tagline,
      });
    }
    return list;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}
