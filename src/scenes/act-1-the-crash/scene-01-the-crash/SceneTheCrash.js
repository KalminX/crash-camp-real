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
 * ACT I — SCENE 1: THE CRASH
 *
 * Narrative:
 * The player wakes up in the sub-zero snow after Flight 402 impacts the wilderness.
 * Smoke billows from the torn fuselage, glowing engine embers crackle, and debris is strewn across the trench.
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
    this.turbinePos = new THREE.Vector3(-3.2, 0.6, -4.2);

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

    // 1. Atmosphere & Fog (Clearer alpine dusk with extended visibility)
    this.threeScene.background = new THREE.Color(0x232832);
    this.threeScene.fog = new THREE.Fog(0x232832, 38, 125);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x9cb0c6, 1.45);
    this.threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xbcd0e8, 0x6e7e72, 1.25);
    this.threeScene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0xd6e5f8, 1.4);
    moonLight.position.set(-18, 30, 16);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.bias = -0.0005;
    moonLight.shadow.camera.left = -30;
    moonLight.shadow.camera.right = 30;
    moonLight.shadow.camera.top = 30;
    moonLight.shadow.camera.bottom = -30;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 70;
    this.threeScene.add(moonLight);

    const fillLight = new THREE.DirectionalLight(0x8fa3b8, 0.85);
    fillLight.position.set(20, 24, -18);
    this.threeScene.add(fillLight);

    // 3. Load Environment & Grid Map from co-located JSON Asset
    const mapLoader = new MapLoader();
    const mapResult = mapLoader.load(mapData, this.ecsWorld, this.threeScene);

    // 4. Retrieve key objects from map
    const turbineEntity = mapResult.specialEntities.get('engine_turbine');
    if (turbineEntity && turbineEntity.mesh) {
      this.turbinePos.copy(turbineEntity.mesh.position);
      this.turbinePos.y += 0.6;
    }

    const beaconData = mapResult.specialEntities.get('emergency_beacon');
    if (beaconData && beaconData.mesh) {
      this.beaconGroup = beaconData.mesh;
      this.beaconLight = beaconData.mesh.userData.beaconLight;
    }

    // Turbine combustion fire light (castShadow = false to prevent 6-pass cubemap lag)
    this.engineLight = new THREE.PointLight(0xff5511, 4.5, 26, 1.4);
    this.engineLight.position.set(this.turbinePos.x, this.turbinePos.y + 0.6, this.turbinePos.z);
    this.engineLight.castShadow = false;
    this.threeScene.add(this.engineLight);

    // 5. Procedural Smoke & Spark Particles
    this.createSmokeAndSparks(this.turbinePos.x, this.turbinePos.y + 0.6, this.turbinePos.z);

    // 6. Ground Highlight Reticle for Smoothed Interactions
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

    // 7. Player Entity & Animated GLB Character
    const player = this.ecsWorld.createEntity();
    this.playerId = player;

    const spawn = mapResult.playerSpawn || { x: 0, y: 0, z: 8 };
    const transform = Components.Transform(spawn.x, 0, spawn.z);
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

    // 8. Systems
    this.ecsWorld.addSystem(new MovementSystem(this.game.audio));
    this.ecsWorld.addSystem(new CollisionSystem(36));

    this.renderSystem = new RenderSystem(this.game.renderer, this.threeScene, this.camera);
    this.renderSystem.setCameraMode('birds-eye');
    this.ecsWorld.addSystem(this.renderSystem);

    if (this.game.ui) {
      this.game.ui.showToast("Act I: The Crash (Press 'V' or click BIRD VIEW to toggle camera)");
    }
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
        this.highlightRing.position.set(position.x, 0.05, position.z);
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
