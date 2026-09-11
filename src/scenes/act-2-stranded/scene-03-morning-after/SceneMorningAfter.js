import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { Components } from '../../../ecs/Components.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
import { MovementSystem } from '../../../systems/MovementSystem.js';
import { CollisionSystem } from '../../../systems/CollisionSystem.js';
import { RenderSystem } from '../../../systems/RenderSystem.js';
import { CharacterLoader } from '../../../world/CharacterLoader.js';
import { CrashSiteLoader } from '../../../world/CrashSiteLoader.js';
import { ParticleFactory } from '../../../world/ParticleSystem.js';
import { WorldSeed } from '../../../world/WorldSeed.js';
import { ProceduralTerrain } from '../../../world/ProceduralTerrain.js';

/**
 * ACT II — SCENE 3: MORNING AFTER
 *
 * Narrative:
 * Morning breaks over the snowy valley. The emergency beacon sent its signal, but the sky is silent.
 * No rescue helicopter arrived.
 * Investigating the wreckage deeper reveals flight manifests and telemetry:
 * the crash was not an accident. And fresh tracks lead north into the forest.
 */
export class SceneMorningAfter extends BaseScene {
  constructor(game) {
    super(game, 'scene-03-morning-after');
    this.playerId = null;
    this.characterMesh = null;
    this.renderSystem = null;
    this.frostEmitter = null;
    this.time = 0;

    // Terrain & Wreckage
    this.terrainBuild = null;
    this.wreckageMesh = null;

    // Highlights
    this.highlightRing = null;
    this.trailMarkers = [];

    // Preallocated math scratch vectors
    this._playerPos = new THREE.Vector3();
    this._itemPos = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._toItem = new THREE.Vector3();
  }

  async enter() {
    await super.enter();

    // 1. Atmosphere: Golden alpine sunrise and crisp pre-dawn fog
    this.threeScene.background = new THREE.Color(0xb86948);
    this.threeScene.fog = new THREE.Fog(0xb86948, 30, 115);

    // 2. Lighting: Warm low-angle morning sunlight and peach ambient fill
    const ambientLight = new THREE.AmbientLight(0xf2cfb1, 1.4);
    this.threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffdec2, 0x5a6358, 1.2);
    this.threeScene.add(hemiLight);

    // Golden low-angle sunrise from East
    const sunLight = new THREE.DirectionalLight(0xffe6c2, 1.6);
    sunLight.position.set(24, 14, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 70;
    this.threeScene.add(sunLight);

    // 3. Mount 220m x 220m Themed Procedural Terrain ('morning-after')
    const worldSeed = WorldSeed.getSeed();
    const terrain = new ProceduralTerrain({
      seed: worldSeed,
      theme: 'morning-after',
      size: 220,
    });
    this.terrainBuild = terrain.build(this.ecsWorld);
    this.threeScene.add(this.terrainBuild.group);

    // Register tree and boulder colliders for playable landscape
    if (this.terrainBuild.colliders) {
      for (const c of this.terrainBuild.colliders) {
        const colEntity = this.ecsWorld.createEntity();
        this.ecsWorld.addComponent(colEntity, 'Transform', Components.Transform(c.x, c.y || 0, c.z));
        this.ecsWorld.addComponent(colEntity, 'Collider', Components.Collider(c.radius, c.height || 3.0, false));
      }
    }

    // 4. Mount Authentic Crash Site GLB Model (100% original colors and materials retained)
    const crashLoader = new CrashSiteLoader();
    try {
      const crashData = await crashLoader.load('/models/crash_site.glb');
      this.wreckageMesh = crashData.model;
      this.threeScene.add(this.wreckageMesh);

      if (crashData.colliders) {
        for (const c of crashData.colliders) {
          const colEntity = this.ecsWorld.createEntity();
          this.ecsWorld.addComponent(colEntity, 'Transform', Components.Transform(c.x, c.y || 0, c.z));
          this.ecsWorld.addComponent(colEntity, 'Collider', Components.Collider(c.radius, c.height || 2.5, false));
        }
      }
    } catch (err) {
      console.warn('[SceneMorningAfter] Fallback to procedural plane wreckage:', err);
      this.wreckageMesh = ProceduralModels.createPlaneWreckage();
      this.threeScene.add(this.wreckageMesh);
    }

    // 5. Narrative Debris & Supplies
    // 5a. Classified Flight Dossier
    const dossierEntity = this.ecsWorld.createEntity();
    const dossierMesh = ProceduralModels.createFlightDocuments();
    const dY = this.terrainBuild.getWalkableHeight(2.5, -3.2);
    dossierMesh.position.set(2.5, dY, -3.2);
    this.threeScene.add(dossierMesh);

    this.ecsWorld.addComponent(dossierEntity, 'Transform', Components.Transform(2.5, dY, -3.2));
    this.ecsWorld.addComponent(dossierEntity, 'MeshComponent', Components.MeshComponent(dossierMesh));
    this.ecsWorld.addComponent(dossierEntity, 'Collider', Components.Collider(0.6, 0.4, true));
    this.ecsWorld.addComponent(
      dossierEntity,
      'Interactable',
      Components.Interactable('Inspect classified flight dossier', 'inspect_dossier', 2.8)
    );

    // 5b. Emergency Medical Kit
    const medkitEntity = this.ecsWorld.createEntity();
    const medkitMesh = ProceduralModels.createFirstAidKit();
    const mY = this.terrainBuild.getWalkableHeight(-3.2, 3.8);
    medkitMesh.position.set(-3.2, mY, 3.8);
    this.threeScene.add(medkitMesh);

    this.ecsWorld.addComponent(medkitEntity, 'Transform', Components.Transform(-3.2, mY, 3.8));
    this.ecsWorld.addComponent(medkitEntity, 'MeshComponent', Components.MeshComponent(medkitMesh));
    this.ecsWorld.addComponent(medkitEntity, 'Collider', Components.Collider(0.5, 0.4, true));
    this.ecsWorld.addComponent(
      medkitEntity,
      'Interactable',
      Components.Interactable('Salvage medical pouch (+40 HP)', 'salvage_medkit', 2.8)
    );

    // 5c. Rations Crate
    const rationEntity = this.ecsWorld.createEntity();
    const rationMesh = ProceduralModels.createRationBox();
    const rY = this.terrainBuild.getWalkableHeight(3.6, 2.2);
    rationMesh.position.set(3.6, rY, 2.2);
    this.threeScene.add(rationMesh);

    this.ecsWorld.addComponent(rationEntity, 'Transform', Components.Transform(3.6, rY, 2.2));
    this.ecsWorld.addComponent(rationEntity, 'MeshComponent', Components.MeshComponent(rationMesh));
    this.ecsWorld.addComponent(rationEntity, 'Collider', Components.Collider(0.6, 0.5, true));
    this.ecsWorld.addComponent(
      rationEntity,
      'Interactable',
      Components.Interactable('Salvage ration pack (+2 Food)', 'salvage_rations', 2.8)
    );

    // 6. Create Survivor Footprints Trail in the snow leading North along frozen creek
    this.createSurvivorFootprints();

    // 6b. Procedural Dawn Frost Dust Shimmer (InstancedMesh — 1 single draw call)
    this.frostEmitter = ParticleFactory.createDawnFrostShimmer({ x: 0, y: 0, z: -6 }, 22, 120);
    this.threeScene.add(this.frostEmitter.mesh);

    // 7. Ground Highlight Reticle for interactions
    const ringGeo = new THREE.RingGeometry(0.55, 0.7, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
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
      console.warn('[SceneMorningAfter] Fallback to procedural character:', err);
    }

    // 8. Player Entity & Setup
    const player = this.ecsWorld.createEntity();
    this.playerId = player;

    const spawnX = 0;
    const spawnZ = 2.5;
    const spawnY = this.terrainBuild ? this.terrainBuild.getWalkableSurfaceElevation(spawnX, spawnZ) : 0.05;
    const spawn = { x: spawnX, y: spawnY, z: spawnZ };
    const transform = Components.Transform(spawn.x, spawn.y, spawn.z);
    transform.facingAngle = Math.PI; // Face north toward footprints
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

    // Player chest light
    const playerChestLight = new THREE.PointLight(0xeef2f7, 0.8, 14, 1.4);
    this.camera.add(playerChestLight);
    this.threeScene.add(this.camera);

    // 9. Systems (Full 220m playable roaming boundary; zero-lag slope adherence)
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
      this.game.ui.showToast('Act II: Morning After — Dawn broke in silence. Search the clearing for clues.');
    }
  }

  createSurvivorFootprints() {
    const stepGeo = new THREE.BoxGeometry(0.28, 0.02, 0.52);
    const stepMat = new THREE.MeshBasicMaterial({
      color: 0x4a5d73,
      transparent: true,
      opacity: 0.55,
    });

    // Trail of 18 boot prints leading northward along the frozen creek bed
    for (let i = 0; i < 18; i++) {
      const step = new THREE.Mesh(stepGeo, stepMat);
      const z = -2.0 - i * 1.8;
      const creekCenter = Math.sin(z * 0.04) * 6.5;
      const side = i % 2 === 0 ? -0.25 : 0.25;
      const fx = creekCenter + side + (Math.random() - 0.5) * 0.12;
      const fy = (this.terrainBuild ? this.terrainBuild.getWalkableHeight(fx, z) : 0.0) + 0.015;

      step.position.set(fx, fy, z);
      step.rotation.y = (Math.random() - 0.5) * 0.15;
      this.threeScene.add(step);
      this.trailMarkers.push(step);
    }

    // Footprints trail interactable entity at trail start
    const trailStartY = this.terrainBuild ? this.terrainBuild.getWalkableHeight(0, -4) : 0.05;
    const trailEntity = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(trailEntity, 'Transform', Components.Transform(0, trailStartY, -4));
    this.ecsWorld.addComponent(
      trailEntity,
      'Interactable',
      Components.Interactable('Inspect survivor footprints in snow', 'inspect_tracks', 3.0)
    );
  }

  update(deltaTime) {
    if (!this.active) return;
    this.time += deltaTime;

    // 1. Update Dawn Frost Shimmer Particles
    if (this.frostEmitter) {
      this.frostEmitter.update(deltaTime, this.time);
    }

    // 2. Input & Interactions
    const playerInput = this.ecsWorld.getComponent(this.playerId, 'PlayerInput');
    if (playerInput && this.game.input) {
      this.game.input.updatePlayerInput(playerInput);
    }

    // 3. Terrain Height Following (Instant ground adherence on snowdrifts, crags, and frozen creek)
    const pTransform = this.ecsWorld.getComponent(this.playerId, 'Transform');
    if (pTransform && this.terrainBuild && typeof this.terrainBuild.getWalkableSurfaceElevation === 'function') {
      pTransform.position.y = this.terrainBuild.getWalkableSurfaceElevation(pTransform.position.x, pTransform.position.z);
    }

    this.handleInteractions(playerInput);

    super.update(deltaTime);
  }

  handleInteractions(playerInput) {
    if (!playerInput || !this.game.ui) return;

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
        if (interactable.actionType === 'inspect_tracks') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'SURVIVOR FOOTPRINTS',
              text: 'Fresh military-pattern tread impressions in the snow, leading northward toward the ridgeline. Someone kicked free of the wreckage at dawn and pushed into the deep forest.',
              onComplete: () => {
                if (this.game.audio) this.game.audio.playPickup();
                this.game.gameState.setStory('tracksFollowed', true);
                this.game.gameState.completeGoal(this.id, 'inspect_tracks');
              },
            });
          }
        } else if (interactable.actionType === 'inspect_dossier') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'CLASSIFIED FLIGHT TELEMETRY',
              text: 'Flight 402 flight recorder transcript: "02:14:02 — Transponder manual circuit disengaged by cockpit override." This crash was deliberately engineered.',
              onComplete: () => {
                if (this.game.audio) this.game.audio.playPickup();
                this.game.gameState.setStory('dossierFound', true);
                this.game.gameState.completeGoal(this.id, 'inspect_dossier');
              },
            });
          }
        } else if (interactable.actionType === 'salvage_medkit') {
          if (this.game.dialogue) {
            this.game.dialogue.show({
              speaker: 'FIRST AID SUPPLIES',
              text: 'Emergency trauma compress and iodine dressings recovered from the rear fuselage.',
              onComplete: () => {
                this.game.gameState.heal(40);
                if (this.game.audio) this.game.audio.playPickup();
                this.game.ui.showToast('Medical supplies recovered (+40 Health)');

                const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
                if (meshComp && meshComp.mesh) {
                  this.threeScene.remove(meshComp.mesh);
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
              speaker: 'DRIED RATION POUCH',
              text: 'Vacuum-sealed protein rations salvaged from the cargo hold.',
              onComplete: () => {
                const inv = this.game.gameState.inventory;
                if (inv.food < inv.maxFood) {
                  this.game.gameState.addFood(2);
                  if (this.game.audio) this.game.audio.playPickup();
                  this.game.ui.showToast(`Emergency rations recovered (${this.game.gameState.inventory.food}/${inv.maxFood})`);

                  const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
                  if (meshComp && meshComp.mesh) {
                    this.threeScene.remove(meshComp.mesh);
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
    if (this.frostEmitter) {
      this.frostEmitter.dispose();
      this.frostEmitter = null;
    }
    if (this.terrainBuild && this.terrainBuild.group) {
      this.threeScene.remove(this.terrainBuild.group);
      this.terrainBuild = null;
    }
    if (this.wreckageMesh) {
      this.threeScene.remove(this.wreckageMesh);
      this.wreckageMesh = null;
    }
    this.trailMarkers = [];
    this.highlightRing = null;
    this.characterMesh = null;
    this.renderSystem = null;

    super.dispose();
  }
}

export default SceneMorningAfter;
