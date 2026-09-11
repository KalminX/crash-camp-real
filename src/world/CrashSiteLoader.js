import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CrashSiteLoader — Loads and prepares the authentic Flight 402 crash_site.glb model.
 *
 * Footprint: 55m x 55m (x, z in [-27.5, 27.5])
 * Extracts:
 * - Severed turbine position: (-6.05, 0.73, 3.85) (fire, smoke & ember origin)
 * - Cockpit position: (6.59, -1.49, -4.36)
 * - Fuselage position: (1.35, 0.80, -1.77)
 * - Tail section: (2.2, 0.2, 8.5)
 * - Static obstacle collision bounds for ECS
 */
export class CrashSiteLoader {
  static _cachedData = null;
  static _pendingPromise = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  static preload(url = '/models/crash_site.glb') {
    const loader = new CrashSiteLoader();
    return loader.load(url);
  }

  load(url = '/models/crash_site.glb') {
    if (CrashSiteLoader._cachedData) {
      return Promise.resolve(this.cloneCached(CrashSiteLoader._cachedData));
    }

    if (CrashSiteLoader._pendingPromise) {
      return CrashSiteLoader._pendingPromise;
    }

    CrashSiteLoader._pendingPromise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const rawModel = gltf.scene;

          let terrainMesh = null;
          let severedEngine = null;
          let fuselage = null;
          let cockpit = null;
          let tail = null;

          // Configure materials, shadows, and detect key parts
          rawModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.name.includes('Terrain') || child.name === 'Terrain_CrashSite') {
                terrainMesh = child;
              }
            }

            if (child.name.includes('Severed') || child.name.includes('Engine_Severed')) {
              severedEngine = child;
            } else if (child.name.includes('Fuselage')) {
              fuselage = child;
            } else if (child.name.includes('Cockpit')) {
              cockpit = child;
            } else if (child.name.includes('Tail')) {
              tail = child;
            }
          });

          // Anchor points (world coords when model is at origin)
          const severedEnginePos = new THREE.Vector3(-6.05, 0.73, 3.85);
          const cockpitPos = new THREE.Vector3(6.59, -0.2, -4.36);
          const fuselagePos = new THREE.Vector3(1.35, 0.8, -1.77);
          const tailPos = new THREE.Vector3(2.2, 0.2, 8.5);

          // ECS obstacle colliders around wreckage
          const colliders = [
            // Fuselage hull
            { x: 1.35, y: 0.8, z: -1.77, radius: 3.2, height: 2.8 },
            // Cockpit wreckage
            { x: 6.59, y: 0.0, z: -4.36, radius: 2.2, height: 2.2 },
            // Severed engine
            { x: -6.05, y: 0.73, z: 3.85, radius: 1.5, height: 1.8 },
            // Right intact engine / wing section
            { x: -7.5, y: 0.2, z: -8.0, radius: 2.2, height: 2.0 },
            // Broken left wing root
            { x: 7.8, y: 0.2, z: 4.8, radius: 2.2, height: 1.8 },
            // Tail fin wreckage
            { x: 2.2, y: 0.2, z: 8.5, radius: 1.8, height: 2.5 },
          ];

          const data = {
            model: rawModel,
            terrainMesh,
            severedEngine,
            fuselage,
            cockpit,
            tail,
            severedEnginePos,
            cockpitPos,
            fuselagePos,
            tailPos,
            colliders,
          };

          CrashSiteLoader._cachedData = data;
          CrashSiteLoader._pendingPromise = null;
          resolve(data);
        },
        undefined,
        (err) => {
          CrashSiteLoader._pendingPromise = null;
          console.error('[CrashSiteLoader] Failed to load crash_site.glb:', err);
          reject(err);
        }
      );
    });

    return CrashSiteLoader._pendingPromise;
  }

  cloneCached(cached) {
    return {
      model: cached.model.clone(true),
      severedEnginePos: cached.severedEnginePos.clone(),
      cockpitPos: cached.cockpitPos.clone(),
      fuselagePos: cached.fuselagePos.clone(),
      tailPos: cached.tailPos.clone(),
      colliders: cached.colliders.map((c) => ({ ...c })),
    };
  }
}

export default CrashSiteLoader;
