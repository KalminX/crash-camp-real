import * as THREE from 'three';
import { World } from '../ecs/World.js';

/**
 * Base Scene class with explicit lifecycle:
 * CREATE -> ENTER -> UPDATE -> EXIT -> DISPOSE
 */
export class Scene {
  constructor(game, id = 'unnamed-scene') {
    this.game = game;
    this.id = id;

    const aspect = typeof window !== 'undefined' && window.innerWidth && window.innerHeight
      ? window.innerWidth / window.innerHeight
      : 16 / 9;

    this.threeScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 180);
    this.ecsWorld = new World();
    this.active = false;
    this.cleanups = [];
  }

  /**
   * Called when entering the scene.
   * Initializes environment, lighting, ECS entities, systems, and listeners.
   */
  enter() {
    this.active = true;
  }

  /**
   * Called every frame while scene is active.
   */
  update(deltaTime) {
    if (!this.active) return;
    this.ecsWorld.update(deltaTime);
  }

  /**
   * Called when beginning transition away from the scene.
   */
  exit() {
    this.active = false;
  }

  /**
   * Called to completely teardown and free scene-specific resources.
   */
  dispose() {
    this.exit();

    // 1. Clear ECS world
    this.ecsWorld.clear();

    // 2. Deep dispose Three.js scene hierarchy
    this.disposeHierarchy(this.threeScene);
    while (this.threeScene.children.length > 0) {
      this.threeScene.remove(this.threeScene.children[0]);
    }

    // 3. Execute registered cleanup callbacks (DOM listeners, audio handles, timers)
    for (const cleanup of this.cleanups) {
      try {
        cleanup();
      } catch (err) {
        console.warn(`[Scene:${this.id}] Error in cleanup:`, err);
      }
    }
    this.cleanups = [];
  }

  /**
   * Registers a cleanup callback to be invoked on dispose().
   */
  addCleanup(fn) {
    if (typeof fn === 'function') {
      this.cleanups.push(fn);
    }
  }

  disposeHierarchy(object) {
    if (!object) return;

    if (object.geometry && typeof object.geometry.dispose === 'function') {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat && typeof mat.dispose === 'function' && mat.dispose());
      } else if (typeof object.material.dispose === 'function') {
        object.material.dispose();
      }
    }

    if (object.children) {
      for (let i = object.children.length - 1; i >= 0; i--) {
        this.disposeHierarchy(object.children[i]);
      }
    }
  }

  onResize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}
