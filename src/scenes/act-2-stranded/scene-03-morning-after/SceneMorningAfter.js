import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { Components } from '../../../ecs/Components.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
import { MovementSystem } from '../../../systems/MovementSystem.js';
import { CollisionSystem } from '../../../systems/CollisionSystem.js';
import { RenderSystem } from '../../../systems/RenderSystem.js';
import { MapLoader } from '../../../world/MapLoader.js';
import { CharacterLoader } from '../../../world/CharacterLoader.js';
import { ParticleFactory } from '../../../world/ParticleSystem.js';
import mapData from './map.json' with { type: 'json' };

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

    // 3. Load Map from co-located map.json
    const mapLoader = new MapLoader();
    const mapResult = mapLoader.load(mapData, this.ecsWorld, this.threeScene);

    // 4. Create Survivor Footprints Trail in the snow leading North
    this.createSurvivorFootprints();

    // 4b. Procedural Dawn Frost Dust Shimmer (InstancedMesh — 1 single draw call)
    this.frostEmitter = ParticleFactory.createDawnFrostShimmer({ x: 0, y: 0, z: -6 }, 22, 120);
    this.threeScene.add(this.frostEmitter.mesh);

    // 5. Ground Highlight Reticle for interactions
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

    // 6. Player Entity & Setup
    const player = this.ecsWorld.createEntity();
    this.playerId = player;

    const spawn = mapResult.playerSpawn || { x: 0, y: 0, z: 2 };
    const transform = Components.Transform(spawn.x, 0, spawn.z);
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

    // 7. Systems
    this.ecsWorld.addSystem(new MovementSystem(this.game.audio));
    this.ecsWorld.addSystem(new CollisionSystem(32));

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

    // Trail of 14 boot prints leading northward from wreckage toward trees
    for (let i = 0; i < 14; i++) {
      const step = new THREE.Mesh(stepGeo, stepMat);
      const side = i % 2 === 0 ? -0.22 : 0.22;
      step.position.set(side + (Math.random() - 0.5) * 0.1, 0.02, -2 - i * 1.5);
      step.rotation.y = (Math.random() - 0.5) * 0.15;
      this.threeScene.add(step);
      this.trailMarkers.push(step);
    }

    // Footprints trail interactable entity at trail start
    const trailEntity = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(trailEntity, 'Transform', Components.Transform(0, 0, -4));
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
        this.highlightRing.position.set(position.x, 0.05, position.z);
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
    this.trailMarkers = [];
    this.highlightRing = null;
    this.characterMesh = null;
    this.renderSystem = null;

    super.dispose();
  }
}

export default SceneMorningAfter;
