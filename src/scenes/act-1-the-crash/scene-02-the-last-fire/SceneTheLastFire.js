import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { Components } from '../../../ecs/Components.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
import { MovementSystem } from '../../../systems/MovementSystem.js';
import { CollisionSystem } from '../../../systems/CollisionSystem.js';
import { RenderSystem } from '../../../systems/RenderSystem.js';
import { CharacterLoader } from '../../../world/CharacterLoader.js';
import { FireSystem } from './FireSystem.js';
import { ParticleFactory } from '../../../world/ParticleSystem.js';
import { WorldSeed } from '../../../world/WorldSeed.js';
import { ProceduralTerrain } from '../../../world/ProceduralTerrain.js';

/**
 * ACT I — SCENE 2: THE LAST FIRE
 *
 * Narrative:
 * Flight 402's emergency beacon requires external power.
 * The player must keep the central campfire fueled with fallen pine logs through the
 * sub-zero midnight storm to power the transmitter and survive until dawn.
 */
export class SceneTheLastFire extends BaseScene {
  constructor(game) {
    super(game, 'scene-02-the-last-fire');
    this.playerId = null;
    this.characterMesh = null;
    this.renderSystem = null;
    this.fireSystem = null;
    this.blizzardEmitter = null;
    this.time = 0;

    // Terrain & Props
    this.terrainBuild = null;
    this.beaconLight = null;
    this.beaconGroup = null;
    this.highlightRing = null;
    this.campfireMesh = null;
    this.cableMesh = null;

    // Preallocated math scratch vectors
    this._playerPos = new THREE.Vector3();
    this._itemPos = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._toItem = new THREE.Vector3();
  }

  async enter() {
    await super.enter();

    // 1. Atmosphere: Deep midnight blue and dense frozen mist
    this.threeScene.background = new THREE.Color(0x0a101d);
    this.threeScene.fog = new THREE.Fog(0x0a101d, 22, 95);

    // 2. Lighting: Cool moonlit ambient & directional rim
    const ambientLight = new THREE.AmbientLight(0x3e5272, 1.1);
    this.threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x5a759e, 0x1a2636, 0.9);
    this.threeScene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0x7da4d4, 1.3);
    moonLight.position.set(-15, 28, 12);
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

    // 3. Mount 220m x 220m Themed Procedural Terrain ('the-last-fire')
    const worldSeed = WorldSeed.getSeed();
    const terrain = new ProceduralTerrain({
      seed: worldSeed,
      theme: 'the-last-fire',
      size: 220,
    });
    this.terrainBuild = terrain.build(this.ecsWorld);
    this.threeScene.add(this.terrainBuild.group);

    // Register tree and rock obstacle colliders for playable landscape
    if (this.terrainBuild.colliders) {
      for (const c of this.terrainBuild.colliders) {
        const colEntity = this.ecsWorld.createEntity();
        this.ecsWorld.addComponent(colEntity, 'Transform', Components.Transform(c.x, c.y || 0, c.z));
        this.ecsWorld.addComponent(colEntity, 'Collider', Components.Collider(c.radius, c.height || 3.0, false));
      }
    }

    // 4. Setup Campfire & FireSystem in Central Hearth (0, 0, 0)
    const campfireResult = ProceduralModels.createCampfire();
    const campfireGroup = campfireResult?.isObject3D ? campfireResult : (campfireResult?.group || campfireResult);
    const campfireData = campfireResult?.particlesData ? campfireResult : (campfireGroup?.userData?.campfireData || campfireResult);
    campfireGroup.userData = campfireGroup.userData || {};
    campfireGroup.userData.campfireData = campfireData;

    const hearthY = this.terrainBuild ? this.terrainBuild.getWalkableSurfaceElevation(0, 0) : 0.05;
    campfireGroup.position.set(0, hearthY, 0);
    this.threeScene.add(campfireGroup);
    this.campfireMesh = campfireGroup;

    if (campfireData) {
      this.fireSystem = new FireSystem(
        campfireGroup,
        campfireData.fireLight,
        campfireData.particles,
        this.game.audio,
        campfireData.instancedFlames,
        campfireData.particlesData
      );
    }

    const campfireEntity = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(campfireEntity, 'Transform', Components.Transform(0, hearthY, 0));
    this.ecsWorld.addComponent(campfireEntity, 'MeshComponent', Components.MeshComponent(campfireGroup));
    this.ecsWorld.addComponent(campfireEntity, 'Collider', Components.Collider(1.4, 1.0, true));
    this.ecsWorld.addComponent(
      campfireEntity,
      'Interactable',
      Components.Interactable('Add wood to campfire', 'feed_fire', 3.2)
    );

    // 4b. Emergency Beacon connected to thermal generator
    const beaconX = 3.0;
    const beaconZ = 4.5;
    const beaconY = this.terrainBuild ? this.terrainBuild.getWalkableSurfaceElevation(beaconX, beaconZ) : 0.05;
    this.beaconGroup = ProceduralModels.createEmergencyBeacon();
    this.beaconGroup.position.set(beaconX, beaconY, beaconZ);
    this.threeScene.add(this.beaconGroup);
    this.beaconLight = this.beaconGroup.userData.beaconLight;

    const beaconEntity = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(beaconEntity, 'Transform', Components.Transform(beaconX, beaconY, beaconZ));
    this.ecsWorld.addComponent(beaconEntity, 'MeshComponent', Components.MeshComponent(this.beaconGroup));
    this.ecsWorld.addComponent(beaconEntity, 'Collider', Components.Collider(0.7, 2.4, true));
    this.ecsWorld.addComponent(
      beaconEntity,
      'Interactable',
      Components.Interactable('Inspect beacon connection', 'inspect_beacon_power', 3.0)
    );

    // 4c. Procedural Midnight Blizzard Snow Swirls (Single Draw Call)
    this.blizzardEmitter = ParticleFactory.createBlizzardSwirl({ x: 0, y: 0, z: 0 }, 28, 160);
    this.threeScene.add(this.blizzardEmitter.mesh);

    // 5. Connect emergency power cable from campfire generator to beacon
    const cableCurve = new THREE.LineCurve3(
      new THREE.Vector3(0, hearthY + 0.03, 0),
      new THREE.Vector3(beaconX, beaconY + 0.07, beaconZ)
    );
    const cableGeo = new THREE.TubeGeometry(cableCurve, 12, 0.04, 6, false);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    this.cableMesh = new THREE.Mesh(cableGeo, cableMat);
    this.threeScene.add(this.cableMesh);

    // 6. Ground Highlight Reticle for interactions
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
      console.warn('[SceneTheLastFire] Fallback to procedural character:', err);
    }

    // 7. Player Entity & Setup
    const player = this.ecsWorld.createEntity();
    this.playerId = player;

    const spawnX = 0;
    const spawnZ = 3.2;
    const spawnY = this.terrainBuild ? this.terrainBuild.getWalkableSurfaceElevation(spawnX, spawnZ) : 0.05;
    const spawn = { x: spawnX, y: spawnY, z: spawnZ };
    const transform = Components.Transform(spawn.x, spawn.y, spawn.z);
    transform.facingAngle = 0;
    this.ecsWorld.addComponent(player, 'Transform', transform);
    this.ecsWorld.addComponent(player, 'Velocity', Components.Velocity());

    const pInput = this.ecsWorld.addComponent(player, 'PlayerInput', Components.PlayerInput());
    pInput.cameraYaw = Math.PI;

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

    // 8. Systems (Full 220m playable roaming boundary; zero-lag slope adherence)
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
      this.game.ui.showToast('Act I: The Last Fire — Gather fallen logs to keep the beacon powered');
    }
  }

  update(deltaTime) {
    if (!this.active) return;
    this.time += deltaTime;

    const transform = this.ecsWorld.getComponent(this.playerId, 'Transform');
    const playerPos = transform ? transform.position : null;

    // 1. Update Campfire FireSystem
    if (this.fireSystem) {
      this.fireSystem.update(deltaTime, playerPos);

      // Beacon pulses faster and brighter when campfire has ample fuel
      if (this.beaconLight) {
        const fuelRatio = this.fireSystem.getFuelRatio();
        if (fuelRatio > 0.15) {
          const pulse = Math.sin(this.time * 6.0);
          this.beaconLight.intensity = pulse > 0.2 ? 2.2 : 0.4;
        } else {
          this.beaconLight.intensity = 0.1; // Weak flicker
        }
      }
    }

    // 2. Update Blizzard Snow Swirls
    if (this.blizzardEmitter) {
      this.blizzardEmitter.update(deltaTime, this.time);
    }

    // 3. Input & Interactions
    const playerInput = this.ecsWorld.getComponent(this.playerId, 'PlayerInput');
    if (playerInput && this.game.input) {
      this.game.input.updatePlayerInput(playerInput);
    }

    // 4. Terrain Height Following (Instant ground adherence on snowdrifts and ridges)
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

      // Dynamic prompt text based on player inventory
      let promptText = interactable.prompt;
      if (interactable.actionType === 'feed_fire') {
        const woodCount = this.game.gameState.inventory.wood;
        promptText = woodCount > 0
          ? `Add firewood to campfire (${woodCount} held)`
          : `Campfire (Needs firewood logs)`;
      } else if (interactable.actionType === 'inspect_beacon_power') {
        const ratio = this.fireSystem ? Math.round(this.fireSystem.getFuelRatio() * 100) : 0;
        promptText = `Emergency Beacon (Transmitter Power: ${ratio}%)`;
      }

      this.game.ui.setPrompt(promptText);

      if (playerInput.interact) {
        if (interactable.actionType === 'pickup_log' || interactable.actionType === 'salvage_wood') {
          const inv = this.game.gameState.inventory;
          if (inv.wood < inv.maxWood) {
            this.game.gameState.addWood(1);
            if (this.game.audio) this.game.audio.playPickup();
            this.game.gameState.completeGoal(this.id, 'collect_wood');
            this.game.ui.showToast(`Firewood log gathered (${this.game.gameState.inventory.wood}/${inv.maxWood})`);

            const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
            if (meshComp && meshComp.mesh) {
              this.threeScene.remove(meshComp.mesh);
            }
            this.ecsWorld.destroyEntity(id);
            this.game.ui.setPrompt(null);
            if (this.highlightRing) this.highlightRing.material.opacity = 0;
          } else {
            this.game.ui.showToast('Wood inventory full (5/5)');
          }
        } else if (interactable.actionType === 'feed_fire') {
          const inv = this.game.gameState.inventory;
          if (inv.wood > 0) {
            if (this.game.dialogue) {
              this.game.dialogue.show({
                speaker: 'CAMPFIRE THERMAL GENERATOR',
                text: 'Dry pine logs stoke the embers into a roaring blaze. The thermal coupling hums, pumping electrical current across the cable to power the beacon!',
                onComplete: () => {
                  this.game.gameState.removeWood(1);
                  if (this.fireSystem) {
                    this.fireSystem.addFuel(35);
                  }
                  this.game.gameState.completeGoal(this.id, 'fuel_campfire');
                  this.game.ui.showToast('Campfire stoked & beacon powered (+35s power)');
                },
              });
            }
          } else {
            this.game.ui.showToast('No firewood held! Search clearing for fallen pine logs.');
          }
        } else if (interactable.actionType === 'inspect_beacon_power') {
          if (this.game.dialogue) {
            const ratio = this.fireSystem ? Math.round(this.fireSystem.getFuelRatio() * 100) : 0;
            this.game.dialogue.show({
              speaker: 'DISTRESS BEACON STATUS',
              text: `Emergency transmission line active. Signal generator power: ${ratio}%. Keep the campfire fed with logs to maintain signal through the night!`,
              onComplete: () => {
                if (this.game.audio && typeof this.game.audio.playBeaconBeep === 'function') {
                  this.game.audio.playBeaconBeep();
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
    if (this.blizzardEmitter) {
      this.blizzardEmitter.dispose();
      this.blizzardEmitter = null;
    }
    if (this.fireSystem) {
      this.fireSystem.dispose();
      this.fireSystem = null;
    }
    if (this.terrainBuild && this.terrainBuild.group) {
      this.threeScene.remove(this.terrainBuild.group);
      this.terrainBuild = null;
    }
    if (this.cableMesh) {
      this.threeScene.remove(this.cableMesh);
      if (this.cableMesh.geometry) this.cableMesh.geometry.dispose();
      if (this.cableMesh.material) this.cableMesh.material.dispose();
      this.cableMesh = null;
    }
    if (this.campfireMesh) {
      this.threeScene.remove(this.campfireMesh);
      this.campfireMesh = null;
    }
    if (this.beaconGroup) {
      this.threeScene.remove(this.beaconGroup);
      this.beaconGroup = null;
    }
    this.beaconLight = null;
    this.highlightRing = null;
    this.characterMesh = null;
    this.renderSystem = null;

    super.dispose();
  }
}

export default SceneTheLastFire;
