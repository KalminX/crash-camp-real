import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { Components } from '../../../ecs/Components.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
import { MovementSystem } from '../../../systems/MovementSystem.js';
import { CollisionSystem } from '../../../systems/CollisionSystem.js';
import { RenderSystem } from '../../../systems/RenderSystem.js';
import { CharacterLoader } from '../../../world/CharacterLoader.js';
import { CrashSiteLoader } from '../../../world/CrashSiteLoader.js';
import { ProceduralTerrain } from '../../../world/ProceduralTerrain.js';
import { ParticleFactory } from '../../../world/ParticleSystem.js';
import { WorldSeed } from '../../../world/WorldSeed.js';

/**
 * ACT I — SCENE 1: THE CRASH
 *
 * Narrative:
 * The player wakes up in the sub-zero snow after Flight 402 impacts the wilderness.
 * Smoke billows from the severed engine, glowing wreckage crackles, and debris is strewn across the trench.
 * Beyond the perimeter, rugged procedural pine ridges, boulder crags, and frozen hollows stretch into the blizzard.
 *
 * Features:
 * - Authentic 55m x 55m crash_site.glb model (fuselage, cockpit, severed turbine, broken wings).
 * - 220m x 220m procedural terrain seamlessly edge-interpolated at d = 27.5m (zero seams).
 * - Multi-octave Perlin noise biomes (Deep Pine Ridge, Rocky Crags, Frozen Hollow).
 * - Deterministic generation backed by persistent seed in localStorage.
 * - Instanced pine trees and rock fields (60 FPS performance).
 */
export class SceneTheCrash extends BaseScene {
  constructor(game) {
    super(game, 'scene-01-the-crash');
    this.playerId = null;
    this.characterMesh = null;
    this.renderSystem = null;
    this.time = 0;

    // High-performance instanced particle emitters
    this.smokeEmitter = null;
    this.sparkEmitter = null;
    this.turbinePos = new THREE.Vector3(-6.05, 0.73, 3.85);

    // Environment containers
    this.crashSiteModel = null;
    this.terrainGroup = null;
    this.terrainBuild = null;

    // Lights
    this.engineLight = null;
    this.beaconLight = null;
    this.beaconGroup = null;
    this.beaconInspected = false;

    // Ground interaction reticle
    this.highlightRing = null;

    // Preallocated math scratch vectors for zero-allocation interaction checks
    this._playerPos = new THREE.Vector3();
    this._itemPos = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._toItem = new THREE.Vector3();
  }

  async enter() {
    await super.enter();

    // 1. Atmosphere & Fog: Clear natural lighting preserving authentic original crash site colors
    this.threeScene.background = new THREE.Color(0xb2c9dc);
    this.threeScene.fog = new THREE.Fog(0xb2c9dc, 55, 185);

    // 2. Lighting: Pure, high-fidelity illumination (retains all original GLB materials and vertex colors)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a5d3f, 0.7);
    this.threeScene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.45);
    sunLight.position.set(-20, 36, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 85;
    this.threeScene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xdbe8f5, 0.75);
    fillLight.position.set(22, 26, -20);
    this.threeScene.add(fillLight);

    // Pre-frame camera immediately so no frame ever renders at (0, 0, 0)
    this.camera.position.set(0, 24, 16);
    this.camera.lookAt(0, 0, 6);

    // 3. Mount Authentic Crash Site GLB Model (100% original colors and materials retained)
    const crashLoader = new CrashSiteLoader();
    try {
      const crashData = await crashLoader.load('/models/crash_site.glb');
      this.crashSiteModel = crashData.model;
      this.threeScene.add(this.crashSiteModel);

      if (crashData.severedEnginePos) {
        this.turbinePos.copy(crashData.severedEnginePos);
      }

      // Register ECS static obstacle colliders for wreckage
      if (crashData.colliders) {
        for (const c of crashData.colliders) {
          const colEntity = this.ecsWorld.createEntity();
          this.ecsWorld.addComponent(colEntity, 'Transform', Components.Transform(c.x, c.y || 0, c.z));
          this.ecsWorld.addComponent(colEntity, 'Collider', Components.Collider(c.radius, c.height || 2.5, false));
        }
      }
    } catch (err) {
      console.warn('[SceneTheCrash] Error loading authentic crash site model:', err);
    }

    // 4. Mount 220m x 220m Deterministic Procedural Terrain with Seamless Edge Blending & Biomes
    const worldSeed = WorldSeed.getSeed();
    const terrain = new ProceduralTerrain({ seed: worldSeed });
    this.terrainBuild = terrain.build(this.ecsWorld);
    this.terrainGroup = this.terrainBuild.group;
    this.threeScene.add(this.terrainGroup);

    // Register tree and boulder colliders for nearby playable terrain
    if (this.terrainBuild.colliders) {
      for (const c of this.terrainBuild.colliders) {
        const colEntity = this.ecsWorld.createEntity();
        this.ecsWorld.addComponent(colEntity, 'Transform', Components.Transform(c.x, c.y || 0, c.z));
        this.ecsWorld.addComponent(colEntity, 'Collider', Components.Collider(c.radius, c.height || 3.0, false));
      }
    }

    // 5. Severed Turbine Combustion Fire Light & Particles
    this.engineLight = new THREE.PointLight(0xff5511, 4.5, 26, 1.4);
    this.engineLight.position.set(this.turbinePos.x, this.turbinePos.y + 0.6, this.turbinePos.z);
    this.engineLight.castShadow = false;
    this.threeScene.add(this.engineLight);

    this.createSmokeAndSparks(this.turbinePos.x, this.turbinePos.y + 0.5, this.turbinePos.z);

    // 6. Interactive Survival Entities placed at wreckage anchor points
    this.createInteractiveEntities();

    // 7. Ground Highlight Reticle for Smoothed Interactions
    const ringGeo = new THREE.RingGeometry(0.55, 0.7, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.highlightRing = new THREE.Mesh(ringGeo, ringMat);
    this.highlightRing.position.y = 0.05;
    this.threeScene.add(this.highlightRing);

    // Dedicated character visibility fill lights
    const characterFrontLight = new THREE.PointLight(0xfff7ea, 1.4, 8.5, 1.2);
    characterFrontLight.position.set(0, 1.8, 0.7);

    const characterBackLight = new THREE.PointLight(0xdbe7f5, 1.0, 7.0, 1.4);
    characterBackLight.position.set(0, 1.6, -0.7);

    // Preload animated GLB character model
    const characterLoader = new CharacterLoader();
    let charData = null;
    try {
      charData = await characterLoader.load('/models/character.glb', (percent) => {
        if (this.game && typeof this.game.updateLoadingProgress === 'function') {
          this.game.updateLoadingProgress(percent);
        }
      });
    } catch (err) {
      console.warn('[SceneTheCrash] Fallback to procedural character:', err);
    }

    // 8. Player Entity & Animated GLB Character
    const player = this.ecsWorld.createEntity();
    this.playerId = player;

    // Spawn safely on the snow trench path with accurate ground elevation
    const spawnX = 0;
    const spawnZ = 12.0;
    const spawnY = this.terrainBuild ? this.terrainBuild.getWalkableSurfaceElevation(spawnX, spawnZ) : 0.05;
    const spawn = { x: spawnX, y: spawnY, z: spawnZ };
    const transform = Components.Transform(spawn.x, spawn.y, spawn.z);
    transform.facingAngle = Math.PI;
    this.ecsWorld.addComponent(player, 'Transform', transform);
    this.ecsWorld.addComponent(player, 'Velocity', Components.Velocity());

    const pInput = this.ecsWorld.addComponent(player, 'PlayerInput', Components.PlayerInput());
    pInput.cameraYaw = 0;

    this.ecsWorld.addComponent(player, 'Collider', Components.Collider(0.45, 1.8, false));

    if (charData) {
      this.characterMesh = charData.model;
      this.characterMesh.userData = {
        animate: (speed, dt, isMoving, isSprinting) => {
          charData.update(speed, dt, isMoving, isSprinting);
        },
      };
    } else {
      this.characterMesh = ProceduralModels.createHumanoidCharacter();
    }

    this.characterMesh.add(characterFrontLight);
    this.characterMesh.add(characterBackLight);
    this.threeScene.add(this.characterMesh);
    this.ecsWorld.addComponent(player, 'MeshComponent', Components.MeshComponent(this.characterMesh));

    // Player chest light on camera
    const playerChestLight = new THREE.PointLight(0xeef2f7, 0.8, 14, 1.4);
    this.camera.add(playerChestLight);
    this.threeScene.add(this.camera);

    // 9. Systems (boundary radius 105m covers full 220m x 220m created terrain; zero-lag slope adherence)
    this.ecsWorld.addSystem(
      new MovementSystem(this.game.audio, (x, z) =>
        this.terrainBuild.getWalkableSurfaceElevation(x, z)
      )
    );
    this.ecsWorld.addSystem(new CollisionSystem(105));

    this.renderSystem = new RenderSystem(this.game.renderer, this.threeScene, this.camera);
    this.renderSystem.setCameraMode('birds-eye');
    this.ecsWorld.addSystem(this.renderSystem);

    if (this.game.ui) {
      this.game.ui.showToast("Act I: The Crash (Press 'V' or click BIRD VIEW to toggle camera)");
    }

    // Atmospheric wake-up subtitle tag
    if (typeof document !== 'undefined') {
      const wakeTag = document.createElement('div');
      wakeTag.className = 'scene-wakeup-tag';
      wakeTag.innerHTML = `04:22 AM &bull; CRASH TRENCH &bull; -18°C &bull; SEED: ${worldSeed}`;
      document.body.appendChild(wakeTag);
      setTimeout(() => {
        wakeTag.classList.add('fade-out');
        setTimeout(() => {
          if (wakeTag.parentNode) wakeTag.parentNode.removeChild(wakeTag);
        }, 1000);
      }, 4200);
    }
  }

  createInteractiveEntities() {
    const getH = (x, z) => (this.terrainBuild ? this.terrainBuild.getWalkableHeight(x, z) : 0.05);

    // 1. Emergency Beacon at the tail section
    const bX = 2.2, bZ = 8.5;
    const bY = getH(bX, bZ);
    const beaconEntity = this.ecsWorld.createEntity();
    this.beaconGroup = ProceduralModels.createEmergencyBeacon();
    this.beaconGroup.position.set(bX, bY, bZ);
    this.beaconLight = this.beaconGroup.userData.beaconLight;
    this.threeScene.add(this.beaconGroup);

    this.ecsWorld.addComponent(beaconEntity, 'Transform', Components.Transform(bX, bY, bZ));
    this.ecsWorld.addComponent(beaconEntity, 'MeshComponent', Components.MeshComponent(this.beaconGroup));
    this.ecsWorld.addComponent(beaconEntity, 'Collider', Components.Collider(0.65, 2.2, true));
    this.ecsWorld.addComponent(
      beaconEntity,
      'Interactable',
      Components.Interactable('Inspect Emergency Beacon', 'inspect_beacon', 2.8)
    );

    // 2. Rations Crate 1 (Galley debris)
    const r1X = 3.5, r1Z = -2.0;
    const r1Y = getH(r1X, r1Z);
    const rationEntity1 = this.ecsWorld.createEntity();
    const rationMesh1 = ProceduralModels.createRationBox();
    rationMesh1.position.set(r1X, r1Y, r1Z);
    this.threeScene.add(rationMesh1);

    this.ecsWorld.addComponent(rationEntity1, 'Transform', Components.Transform(r1X, r1Y, r1Z));
    this.ecsWorld.addComponent(rationEntity1, 'MeshComponent', Components.MeshComponent(rationMesh1));
    this.ecsWorld.addComponent(rationEntity1, 'Collider', Components.Collider(0.55, 0.5, true));
    this.ecsWorld.addComponent(
      rationEntity1,
      'Interactable',
      Components.Interactable('Salvage Emergency Rations (+2 Food)', 'salvage_rations', 2.5)
    );

    // 3. Rations Crate 2 (Near forward fuselage)
    const r2X = -4.5, r2Z = -2.5;
    const r2Y = getH(r2X, r2Z);
    const rationEntity2 = this.ecsWorld.createEntity();
    const rationMesh2 = ProceduralModels.createRationBox();
    rationMesh2.position.set(r2X, r2Y, r2Z);
    this.threeScene.add(rationMesh2);

    this.ecsWorld.addComponent(rationEntity2, 'Transform', Components.Transform(r2X, r2Y, r2Z));
    this.ecsWorld.addComponent(rationEntity2, 'MeshComponent', Components.MeshComponent(rationMesh2));
    this.ecsWorld.addComponent(rationEntity2, 'Collider', Components.Collider(0.55, 0.5, true));
    this.ecsWorld.addComponent(
      rationEntity2,
      'Interactable',
      Components.Interactable('Salvage Emergency Rations (+2 Food)', 'salvage_rations', 2.5)
    );

    // 4. First Aid Kit (Near cockpit breach)
    const fX = -2.0, fZ = -4.5;
    const fY = getH(fX, fZ);
    const medkitEntity = this.ecsWorld.createEntity();
    const medkitMesh = ProceduralModels.createFirstAidKit();
    medkitMesh.position.set(fX, fY, fZ);
    this.threeScene.add(medkitMesh);

    this.ecsWorld.addComponent(medkitEntity, 'Transform', Components.Transform(fX, fY, fZ));
    this.ecsWorld.addComponent(medkitEntity, 'MeshComponent', Components.MeshComponent(medkitMesh));
    this.ecsWorld.addComponent(medkitEntity, 'Collider', Components.Collider(0.45, 0.35, true));
    this.ecsWorld.addComponent(
      medkitEntity,
      'Interactable',
      Components.Interactable('Salvage Medical Supplies (+40 HP)', 'salvage_medkit', 2.5)
    );

    // 5. Flight Documents (Navigator table)
    const dX = 5.5, dZ = -5.0;
    const dY = getH(dX, dZ);
    const docEntity = this.ecsWorld.createEntity();
    const docMesh = ProceduralModels.createFlightDocuments();
    docMesh.position.set(dX, dY, dZ);
    this.threeScene.add(docMesh);

    this.ecsWorld.addComponent(docEntity, 'Transform', Components.Transform(dX, dY, dZ));
    this.ecsWorld.addComponent(docEntity, 'MeshComponent', Components.MeshComponent(docMesh));
    this.ecsWorld.addComponent(docEntity, 'Collider', Components.Collider(0.45, 0.35, true));
    this.ecsWorld.addComponent(
      docEntity,
      'Interactable',
      Components.Interactable('Read Flight Manifest', 'inspect_documents', 2.5)
    );
  }

  createSmokeAndSparks(bx, by, bz) {
    const pos = { x: bx, y: by, z: bz };
    this.smokeEmitter = ParticleFactory.createSmokePlume(pos, 28);
    this.sparkEmitter = ParticleFactory.createSparks(pos, 22);
    this.threeScene.add(this.smokeEmitter.mesh);
    this.threeScene.add(this.sparkEmitter.mesh);
  }

  update(deltaTime) {
    if (!this.active) return;

    this.time += deltaTime;

    // 1. Engine Combustion Flicker
    if (this.engineLight) {
      const flicker = Math.sin(this.time * 16.0) * 0.4 + (Math.random() - 0.5) * 0.3;
      this.engineLight.intensity = Math.max(2.8, 4.5 + flicker);
    }

    // 2. Emergency Beacon Slow Amber Blink
    if (this.beaconLight) {
      const pulse = Math.sin(this.time * 3.9);
      const isLit = pulse > 0.4;
      this.beaconLight.intensity = isLit ? 1.6 : 0.2;
    }

    // 3. Update Procedural Smoke Plume (InstancedMesh)
    if (this.smokeEmitter) {
      this.smokeEmitter.update(deltaTime, this.time);
    }

    // 4. Update Embers / Sparks (InstancedMesh)
    if (this.sparkEmitter) {
      this.sparkEmitter.update(deltaTime, this.time);
    }

    // 5. Input & Interactions
    const playerInput = this.ecsWorld.getComponent(this.playerId, 'PlayerInput');
    if (playerInput && this.game.input) {
      this.game.input.updatePlayerInput(playerInput);
    }

    // 6. Terrain Height Following (Instant ground adherence on slopes and mounds)
    const pTransform = this.ecsWorld.getComponent(this.playerId, 'Transform');
    if (pTransform && this.terrainBuild && typeof this.terrainBuild.getWalkableSurfaceElevation === 'function') {
      pTransform.position.y = this.terrainBuild.getWalkableSurfaceElevation(pTransform.position.x, pTransform.position.z);
    }

    this.handleInteractions(playerInput);

    super.update(deltaTime);
  }

  handleInteractions(playerInput) {
    if (!playerInput || !this.game.ui) return;

    // Do not check or trigger scene interactions while dialogue modal is open
    if (this.game.dialogue && this.game.dialogue.isOpen()) {
      this.game.ui.setPrompt(null);
      if (this.highlightRing) this.highlightRing.material.opacity = 0;
      return;
    }

    const transform = this.ecsWorld.getComponent(this.playerId, 'Transform');
    if (!transform) return;

    this._playerPos.copy(transform.position);
    this._forward.set(-Math.sin(playerInput.cameraYaw), 0, -Math.cos(playerInput.cameraYaw)).normalize();

    const interactables = this.ecsWorld.query('Interactable', 'Transform');
    let bestCandidate = null;
    let bestScore = Infinity;

    for (const id of interactables) {
      const itemTransform = this.ecsWorld.getComponent(id, 'Transform');
      const interactable = this.ecsWorld.getComponent(id, 'Interactable');
      if (!itemTransform || !interactable) continue;

      this._itemPos.copy(itemTransform.position);
      this._toItem.subVectors(this._itemPos, this._playerPos);
      this._toItem.y = 0;

      const dist = this._toItem.length();
      if (dist > interactable.maxDistance) continue;

      let score = dist;
      if (dist > 0.01) {
        this._toItem.normalize();
        const dot = this._forward.dot(this._toItem);
        if (dist < 1.6 || dot > 0.28) {
          score = dist - dot * 1.2;
          if (score < bestScore) {
            bestScore = score;
            bestCandidate = { id, interactable, position: itemTransform.position };
          }
        }
      }
    }

    if (bestCandidate) {
      const { id, interactable, position } = bestCandidate;

      if (this.highlightRing) {
        this.highlightRing.position.set(position.x, position.y + 0.03, position.z);
        const pulse = 0.65 + Math.sin(this.time * 6.0) * 0.25;
        this.highlightRing.material.opacity = pulse;
      }

      this.game.ui.setPrompt(interactable.prompt);

      if (playerInput.interact) {
        if (interactable.actionType === 'inspect_beacon') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'DISTRESS BEACON TRANSCEIVER',
              text: 'The casing is shattered and the battery terminal is dead. Diagnostic readout: "INSUFFICIENT POWER — AUXILIARY DC GENERATOR REQUIRED TO BROADCAST DISTRESS SIGNAL".',
              onComplete: () => {
                if (this.game.audio && typeof this.game.audio.playBeaconBeep === 'function') {
                  this.game.audio.playBeaconBeep();
                }
                this.beaconInspected = true;
                this.game.gameState.setStory('beaconDiscovered', true);
                this.game.gameState.completeGoal(this.id, 'inspect_beacon');
                interactable.prompt = 'Emergency Beacon (Power Required: Build Campfire)';
              },
            });
          }
        } else if (interactable.actionType === 'salvage_medkit') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'FLIGHT MEDICAL PACK',
              text: 'Thermal foil blankets, antiseptic compresses, and burn gel. Applied immediately to treat impact trauma.',
              onComplete: () => {
                this.game.gameState.heal(40);
                if (this.game.audio) this.game.audio.playPickup();
                this.game.ui.showToast('First aid kit used (+40 Health)');

                const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
                if (meshComp && meshComp.mesh) {
                  if (meshComp.mesh.parent) meshComp.mesh.parent.remove(meshComp.mesh);
                  else this.threeScene.remove(meshComp.mesh);
                }
                this.ecsWorld.destroyEntity(id);
                this.game.ui.setPrompt(null);
                if (this.highlightRing) this.highlightRing.material.opacity = 0;
              },
            });
          }
        } else if (interactable.actionType === 'salvage_rations') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'EMERGENCY RATION CRATE',
              text: 'Galvanized galley container. Sealed electrolyte pouches and high-calorie rations remain intact.',
              onComplete: () => {
                const inv = this.game.gameState.inventory;
                if (inv.food < inv.maxFood) {
                  this.game.gameState.addFood(2);
                  if (this.game.audio) this.game.audio.playPickup();
                  this.game.gameState.completeGoal(this.id, 'salvage_rations');
                  this.game.ui.showToast(`Emergency rations salvaged (${this.game.gameState.inventory.food}/${inv.maxFood})`);

                  const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
                  if (meshComp && meshComp.mesh) {
                    if (meshComp.mesh.parent) meshComp.mesh.parent.remove(meshComp.mesh);
                    else this.threeScene.remove(meshComp.mesh);
                  }
                  this.ecsWorld.destroyEntity(id);
                  this.game.ui.setPrompt(null);
                  if (this.highlightRing) this.highlightRing.material.opacity = 0;
                } else {
                  this.game.ui.showToast('Food pouch full (5/5)');
                }
              },
            });
          }
        } else if (interactable.actionType === 'inspect_documents') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'FLIGHT 402 TELEMETRY',
              text: 'Flight 402 manifest: 12 souls aboard. Telemetry cut abruptly at 02:14 AM — transponder manually severed.',
              onComplete: () => {
                if (this.game.audio) this.game.audio.playPickup();
                this.game.gameState.setStory('manifestFound', true);
              },
            });
          }
        } else if (interactable.actionType === 'salvage_wood') {
          const inv = this.game.gameState.inventory;
          if (inv.wood < inv.maxWood) {
            this.game.gameState.addWood(1);
            if (this.game.audio) this.game.audio.playPickup();
            this.game.ui.showToast(`Firewood salvaged (${inv.wood}/${inv.maxWood})`);

            const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
            if (meshComp && meshComp.mesh) {
              if (meshComp.mesh.parent) meshComp.mesh.parent.remove(meshComp.mesh);
              else this.threeScene.remove(meshComp.mesh);
            }
            this.ecsWorld.destroyEntity(id);
            this.game.ui.setPrompt(null);
            if (this.highlightRing) this.highlightRing.material.opacity = 0;
          } else {
            this.game.ui.showToast('Wood bundle full (5/5)');
          }
        }
      }
    } else {
      if (this.highlightRing) {
        this.highlightRing.material.opacity = 0;
      }
      this.game.ui.setPrompt(null);
    }
  }

  exit() {
    if (this.game.ui) {
      this.game.ui.setPrompt(null);
    }
    super.exit();
  }

  dispose() {
    if (this.smokeEmitter) {
      this.smokeEmitter.dispose();
      this.smokeEmitter = null;
    }
    if (this.sparkEmitter) {
      this.sparkEmitter.dispose();
      this.sparkEmitter = null;
    }
    if (this.crashSiteModel) {
      this.threeScene.remove(this.crashSiteModel);
      this.crashSiteModel = null;
    }
    if (this.terrainGroup) {
      this.threeScene.remove(this.terrainGroup);
      this.terrainGroup = null;
    }
    this.engineLight = null;
    this.beaconLight = null;
    this.beaconGroup = null;
    this.highlightRing = null;
    this.characterMesh = null;
    this.renderSystem = null;

    super.dispose();
  }
}

export default SceneTheCrash;
