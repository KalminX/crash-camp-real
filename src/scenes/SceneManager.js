import { sceneConfig } from './sceneConfig.js';
import { sceneRegistry } from './sceneRegistry.js';

/**
 * SceneManager — Controls scene lifecycle, transitions, and validation.
 * Reads sceneConfig for connection rules and sceneRegistry for implementations.
 */
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.currentScene = null;
    this.currentSceneId = null;
    this.isTransitioning = false;
    this.listeners = new Map();
  }

  /**
   * Starts the initial scene defined in sceneConfig.start or override.
   */
  async start(initialSceneId = null) {
    const targetId = initialSceneId || sceneConfig.start;
    return await this.goTo(targetId, true);
  }

  /**
   * Transitions to the target scene ID.
   * Validates target in sceneConfig and sceneRegistry.
   * Cleans up previous scene completely.
   */
  async goTo(targetSceneId, force = false) {
    if (this.isTransitioning) {
      console.warn(`[SceneManager] Transition in progress. Discarding goTo("${targetSceneId}")`);
      return false;
    }

    // 1. Validate target exists in configuration
    const targetConfig = sceneConfig.scenes[targetSceneId];
    if (!targetConfig) {
      console.error(`[SceneManager] Unknown sceneId in sceneConfig: "${targetSceneId}"`);
      return false;
    }

    // 2. Validate target exists in registry
    const SceneClass = sceneRegistry[targetSceneId];
    if (!SceneClass) {
      console.error(`[SceneManager] No Scene class registered in sceneRegistry for: "${targetSceneId}"`);
      return false;
    }

    // 3. Validate connection rule (unless starting or forced)
    if (!force && this.currentSceneId) {
      const currentConfig = sceneConfig.scenes[this.currentSceneId];
      const validConnections = currentConfig?.connections || [];
      if (!validConnections.includes(targetSceneId)) {
        console.warn(
          `[SceneManager] Disallowed transition: "${this.currentSceneId}" -> "${targetSceneId}". Valid connections:`,
          validConnections
        );
        return false;
      }
    }

    this.isTransitioning = true;
    const previousSceneId = this.currentSceneId;

    try {
      // 4. Exit and dispose previous scene
      if (this.currentScene) {
        this.currentScene.exit();
        this.currentScene.dispose();
        this.currentScene = null;
      }

      // 5. Instantiate and enter new scene
      this.currentSceneId = targetSceneId;
      const nextScene = new SceneClass(this.game);
      this.currentScene = nextScene;

      // Update persistent GameState
      if (this.game.gameState) {
        this.game.gameState.markSceneVisited(targetSceneId);
      }

      await nextScene.enter();

      // 6. Notify observers (UI updates navigation buttons)
      this.emit('sceneChanged', {
        currentSceneId: targetSceneId,
        currentSceneName: targetConfig.name,
        previousSceneId,
        availableTransitions: this.getAvailableTransitions(),
      });

      return true;
    } catch (err) {
      console.error(`[SceneManager] Failed to transition to "${targetSceneId}":`, err);
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
