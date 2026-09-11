import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CharacterLoader — Loads GLB character models and configures animations with smooth crossfading.
 * Neutralizes root motion translation so Walk, Run, and Jump play strictly in-place.
 */
export class CharacterLoader {
  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Loads character model, configures materials/shadows, removes root motion, and sets up mixer.
   *
   * @param {string} url - Asset path to GLB model
   * @param {Function} [onProgress] - Optional loading progress callback (percent: number)
   * @returns {Promise<Object>}
   */
  load(url = '/models/character.glb', onProgress = null) {
    if (CharacterLoader._cache.has(url)) {
      return Promise.resolve(CharacterLoader._cache.get(url));
    }

    if (CharacterLoader._pendingPromises.has(url)) {
      return CharacterLoader._pendingPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Wrap in a root group to give boot tread clean clearance (+0.035m) on terrain slopes
          const wrapperGroup = new THREE.Group();
          wrapperGroup.name = 'CharacterRoot';

          // Scale model to match survival world scale (~1.75m height)
          model.scale.set(1.18, 1.18, 1.18);
          model.position.set(0, 0.035, 0); // Keep feet resting cleanly on top of snow/terrain polygons
          wrapperGroup.add(model);

          // Configure shadows & enhance material response
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.material) {
                child.material.roughness = Math.min(0.85, child.material.roughness || 0.8);
                child.material.metalness = Math.min(0.2, child.material.metalness || 0.05);
                child.material.needsUpdate = true;
              }
            }
          });

          // Animation Mixer setup
          const mixer = new THREE.AnimationMixer(model);
          const actions = {};

          if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((clip) => {
              // Neutralize root motion so Walk, Run, Jump play in-place without snapback glitches
              const isMovementClip = ['Walk', 'Run', 'Jump'].includes(clip.name);

              clip.tracks.forEach((track) => {
                const trackName = track.name.toLowerCase();
                if (trackName.includes('hips') && trackName.endsWith('.position')) {
                  if (isMovementClip && track.values && track.values.length >= 3) {
                    const firstX = track.values[0];
                    const firstY = track.values[1];
                    const keyframeCount = track.values.length / 3;

                    // Lock forward displacement (Y in Armature space) and sideways drift (X)
                    for (let i = 0; i < keyframeCount; i++) {
                      track.values[i * 3 + 1] = firstY;
                      track.values[i * 3] = firstX;
                    }
                  }
                }
              });

              actions[clip.name] = mixer.clipAction(clip);
            });
          }

          let activeAction = null;
          let activeActionName = '';

          // Smooth animation interpolation / crossfading helper
          function playAnimation(name, duration = 0.25) {
            const nextAction = actions[name];
            if (!nextAction || activeActionName === name) return;

            nextAction.reset();
            nextAction.enabled = true;
            nextAction.setEffectiveTimeScale(1);
            nextAction.setEffectiveWeight(1);

            if (activeAction && activeAction !== nextAction) {
              nextAction.crossFadeFrom(activeAction, duration, true);
            }

            nextAction.play();
            activeAction = nextAction;
            activeActionName = name;
          }

          // Default state: start with Idle
          if (actions.Idle) {
            playAnimation('Idle', 0.1);
          } else if (actions[gltf.animations[0]?.name]) {
            playAnimation(gltf.animations[0].name, 0.1);
          }

          // State-driven animation update called every frame
          function update(speed, dt, isMoving, isSprinting, isDefeated = false) {
            if (isDefeated && actions.Defeated) {
              playAnimation('Defeated', 0.3);
            } else if (isMoving) {
              if (isSprinting && actions.Run) {
                playAnimation('Run', 0.2);
                if (actions.Run) {
                  // Synchronize stride rate with actual movement speed
                  actions.Run.timeScale = Math.max(0.75, Math.min(1.4, speed / 6.2));
                }
              } else if (actions.Walk) {
                playAnimation('Walk', 0.2);
                if (actions.Walk) {
                  actions.Walk.timeScale = Math.max(0.7, Math.min(1.35, speed / 3.8));
                }
              }
            } else if (actions.Idle) {
              playAnimation('Idle', 0.25);
            }

            mixer.update(dt);
          }

          const result = {
            model: wrapperGroup,
            innerModel: model,
            mixer,
            actions,
            playAnimation,
            update,
          };

          CharacterLoader._cache.set(url, result);
          CharacterLoader._pendingPromises.delete(url);
          resolve(result);
        },
        (xhr) => {
          if (typeof onProgress === 'function' && xhr.total) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            onProgress(percent);
          }
        },
        (err) => {
          CharacterLoader._pendingPromises.delete(url);
          console.warn('[CharacterLoader] Error loading GLB model:', err);
          reject(err);
        }
      );
    });

    CharacterLoader._pendingPromises.set(url, promise);
    return promise;
  }
}

CharacterLoader._cache = new Map();
CharacterLoader._pendingPromises = new Map();
