import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AirplaneLoader — Loads GLB airplane model, optimizes materials for alpine lighting,
 * centers pivot, and extracts engine/strobe nodes.
 */
export class AirplaneLoader {
  static _cache = new Map();
  static _pendingPromises = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Loads airplane model and prepares nodes.
   *
   * @param {string} url - Path to airplane.glb
   * @returns {Promise<Object>} - { model, leftEngine, rightEngine, strobeLight, leftEnginePos }
   */
  load(url = '/models/airplane.glb') {
    if (AirplaneLoader._cache.has(url)) {
      const cached = AirplaneLoader._cache.get(url);
      return Promise.resolve(this.cloneCached(cached));
    }

    if (AirplaneLoader._pendingPromises.has(url)) {
      return AirplaneLoader._pendingPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const rawModel = gltf.scene;

          // Configure materials and shadows
          rawModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.material) {
                // Ensure alpine metals respond to directional storm light
                child.material.roughness = Math.max(0.25, Math.min(0.85, child.material.roughness || 0.5));
                child.material.metalness = Math.min(0.65, child.material.metalness || 0.2);
                child.material.needsUpdate = true;
              }
            }
          });

          // Model dimensions: ~33.8m length/width.
          // Scale by 0.42 to match flight scene camera distance (~14.2m length)
          const scale = 0.42;
          rawModel.scale.set(scale, scale, scale);

          // Find key subnodes
          let leftEngine = null;
          let rightEngine = null;
          let cockpit = null;

          rawModel.traverse((child) => {
            if (child.name === 'LeftEngine') leftEngine = child;
            if (child.name === 'RightEngine') rightEngine = child;
            if (child.name === 'Cockpit') cockpit = child;
          });

          // Tail strobe light
          const strobeLight = new THREE.PointLight(0xffffff, 0, 18, 1.5);
          strobeLight.position.set(0, 4.2 * scale, 15.8 * scale);
          rawModel.add(strobeLight);

          // Left wingtip red nav light
          const redNavLight = new THREE.PointLight(0xff2222, 1.5, 6, 2);
          redNavLight.position.set(-16.5 * scale, 1.2 * scale, -1.0 * scale);
          rawModel.add(redNavLight);

          // Right wingtip green nav light
          const greenNavLight = new THREE.PointLight(0x22ff44, 1.5, 6, 2);
          greenNavLight.position.set(16.5 * scale, 1.2 * scale, -1.0 * scale);
          rawModel.add(greenNavLight);

          // Calculate left engine relative emitter offset
          // In raw model: LeftEngine is at X: ~-4.85, Y: ~1.65, Z: ~-1.8
          const leftEngineOffset = new THREE.Vector3(
            -4.85 * scale,
            1.65 * scale,
            -1.8 * scale
          );

          const result = {
            model: rawModel,
            leftEngine,
            rightEngine,
            cockpit,
            strobeLight,
            redNavLight,
            greenNavLight,
            leftEngineOffset,
          };

          AirplaneLoader._cache.set(url, result);
          AirplaneLoader._pendingPromises.delete(url);
          resolve(result);
        },
        undefined,
        (err) => {
          console.error('[AirplaneLoader] Error loading airplane GLB:', err);
          AirplaneLoader._pendingPromises.delete(url);
          reject(err);
        }
      );
    });

    AirplaneLoader._pendingPromises.set(url, promise);
    return promise;
  }

  cloneCached(cached) {
    // Return cached reference for single flight scene
    return cached;
  }
}
