import * as THREE from 'three';
import { Scene } from '../Scene.js';
import { Components } from '../../ecs/Components.js';
import { ProceduralModels } from '../../world/ProceduralModels.js';
import { MovementSystem } from '../../systems/MovementSystem.js';
import { CollisionSystem } from '../../systems/CollisionSystem.js';
import { RenderSystem } from '../../systems/RenderSystem.js';
import { MapLoader } from '../../world/MapLoader.js';
import { CharacterLoader } from '../../world/CharacterLoader.js';
import sceneOneMap from '../../data/maps/sceneOneMap.json';

/**
 * ACT I — SCENE 1: THE CRASH
 *
 * Narrative:
 * The player wakes up in the sub-zero snow after Flight 402 impacts the wilderness.
 * Smoke billows from the torn fuselage, glowing engine embers crackle, and debris is strewn across the trench.
 *
 * Architecture & Features:
 * - Map loaded from JSON grid representation (sceneOneMap.json) with legend and model registry.
 * - Humanoid player character created from composite shapes with natural articulation.
 * - Dual camera support: First-Person View (FPV) and elevated Bird's-Eye View [V].
 * - Smoothed proximity & forward-cone interaction system with ground highlight reticle.
 * - Optimized math calculations with zero per-frame garbage collection allocations.
 */
export class SceneOne extends Scene {
  constructor(game) {
    super(game, 'scene-one');
    this.playerId = null;
    this.characterMesh = null;
    this.renderSystem = null;
    this.time = 0;

    // Procedural Particles (Smoke & Sparks)
    this.smokeParticles = [];
    this.sparkParticles = [];
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
    super.enter();

    // 1. Atmosphere & Fog (Clearer alpine dusk with extended visibility)
    this.threeScene.background = new THREE.Color(0x232832);
    this.threeScene.fog = new THREE.Fog(0x232832, 38, 125);

    // 2. Lighting (Enhanced ambient illumination & directional key/fill lights)
    const ambientLight = new THREE.AmbientLight(0x9cb0c6, 1.45);
    this.threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xbcd0e8, 0x6e7e72, 1.25);
    this.threeScene.add(hemiLight);

    // Key directional moonlight
    const moonLight = new THREE.DirectionalLight(0xd6e5f8, 1.4);
    moonLight.position.set(-18, 30, 16);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.bias = -0.0005;
    this.threeScene.add(moonLight);

    // Soft rim & fill directional light from opposite angle to eliminate harsh shadows
    const fillLight = new THREE.DirectionalLight(0x8fa3b8, 0.85);
    fillLight.position.set(20, 24, -18);
    this.threeScene.add(fillLight);

    // 3. Load Environment & Grid Map from JSON Asset
    const mapLoader = new MapLoader();
    const mapResult = mapLoader.load(sceneOneMap, this.ecsWorld, this.threeScene);

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

    // Turbine combustion fire light
    this.engineLight = new THREE.PointLight(0xff5511, 4.5, 26, 1.4);
    this.engineLight.position.set(this.turbinePos.x, this.turbinePos.y + 0.6, this.turbinePos.z);
    this.engineLight.castShadow = true;
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

    // Dedicated character visibility fill lights (moves directly with the humanoid)
    const characterFrontLight = new THREE.PointLight(0xfff7ea, 1.4, 8.5, 1.2);
    characterFrontLight.position.set(0, 1.8, 0.7);

    const characterBackLight = new THREE.PointLight(0xdbe7f5, 1.0, 7.0, 1.4);
    characterBackLight.position.set(0, 1.6, -0.7);

    // Preload animated GLB character model BEFORE starting scene to prevent composite character pop-in
    const characterLoader = new CharacterLoader();
    let charData = null;
    try {
      charData = await characterLoader.load('/models/character.glb', (percent) => {
        if (this.game && typeof this.game.updateLoadingProgress === 'function') {
          this.game.updateLoadingProgress(percent);
        }
      });
    } catch (err) {
      console.warn('[SceneOne] Fallback to procedural character:', err);
    }

    // 7. Player Entity & Animated GLB Character
    const player = this.ecsWorld.createEntity();
    this.playerId = player;

    const spawn = mapResult.playerSpawn || { x: 0, y: 0, z: 8 };
    const transform = Components.Transform(spawn.x, 0, spawn.z);
    transform.facingAngle = Math.PI; // Face north toward burning wreckage (away from camera)
    this.ecsWorld.addComponent(player, 'Transform', transform);
    this.ecsWorld.addComponent(player, 'Velocity', Components.Velocity());

    const pInput = this.ecsWorld.addComponent(player, 'PlayerInput', Components.PlayerInput());
    pInput.cameraYaw = 0; // Camera behind player looking North

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

    // Player chest light on camera (for first-person view)
    const playerChestLight = new THREE.PointLight(0xeef2f7, 0.8, 14, 1.4);
    this.camera.add(playerChestLight);
    this.threeScene.add(this.camera);

    // 8. Systems
    this.ecsWorld.addSystem(new MovementSystem(this.game.audio));
    this.ecsWorld.addSystem(new CollisionSystem(36));

    this.renderSystem = new RenderSystem(this.game.renderer, this.threeScene, this.camera);
    // Start in Bird's-Eye View so user immediately sees their humanoid character!
    this.renderSystem.setCameraMode('birds-eye');
    this.ecsWorld.addSystem(this.renderSystem);

    if (this.game.ui) {
      this.game.ui.showToast("Act I: The Crash (Press 'V' or click BIRD VIEW to toggle camera)");
    }
  }

  createSmokeAndSparks(bx, by, bz) {
    // 1. Rising Smoke Puffs from turbine breach
    const smokeGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x3a3a42,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
      mesh.position.set(
        bx + (Math.random() - 0.5) * 0.6,
        by + Math.random() * 3.5,
        bz + (Math.random() - 0.5) * 0.6
      );
      this.threeScene.add(mesh);

      this.smokeParticles.push({
        mesh,
        baseX: bx,
        baseZ: bz,
        baseY: by,
        speed: 0.6 + Math.random() * 0.5,
        life: Math.random() * 4.0,
        maxLife: 4.0,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }

    // 2. Glowing wind-blown embers / sparks
    const sparkGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff6622 });

    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.set(bx, by, bz);
      this.threeScene.add(mesh);

      this.sparkParticles.push({
        mesh,
        x: bx,
        y: by,
        z: bz,
        vx: (Math.random() - 0.2) * 0.8,
        vy: 0.8 + Math.random() * 1.2,
        vz: 0.4 + Math.random() * 0.8,
        life: Math.random() * 2.0,
        maxLife: 2.0,
      });
    }
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

    // 3. Update Procedural Smoke Particles
    for (const p of this.smokeParticles) {
      p.life += deltaTime * p.speed;
      if (p.life > p.maxLife) {
        p.life = 0;
      }
      const progress = p.life / p.maxLife;
      const driftX = Math.sin(p.swayPhase + this.time * 0.8) * 0.5 + progress * 0.8;
      const driftZ = Math.cos(p.swayPhase + this.time * 0.8) * 0.4 + progress * 1.2;

      p.mesh.position.set(p.baseX + driftX, p.baseY + progress * 5.0, p.baseZ + driftZ);
      const scale = 0.8 + progress * 2.2;
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.material.opacity = (1 - progress) * 0.35;
    }

    // 4. Update Embers / Sparks
    for (const s of this.sparkParticles) {
      s.life += deltaTime;
      if (s.life > s.maxLife) {
        s.life = 0;
        s.x = this.turbinePos.x + (Math.random() - 0.5) * 0.3;
        s.y = this.turbinePos.y;
        s.z = this.turbinePos.z + (Math.random() - 0.5) * 0.3;
        s.vy = 0.8 + Math.random() * 1.2;
      }
      s.x += s.vx * deltaTime;
      s.y += s.vy * deltaTime;
      s.z += s.vz * deltaTime;
      s.vy -= 0.3 * deltaTime;
      s.mesh.position.set(s.x, s.y, s.z);
    }

    // 5. Input & Interactions
    const playerInput = this.ecsWorld.getComponent(this.playerId, 'PlayerInput');
    if (playerInput && this.game.input) {
      this.game.input.updatePlayerInput(playerInput);
    }

    this.handleInteractions(playerInput);

    super.update(deltaTime);
  }

  /**
   * Smoothed Proximity & Forward-Cone Interaction System.
   * Seamless in both First-Person and Bird's-Eye View.
   * Provides immediate visual target feedback and zero-flicker triggering.
   */
  handleInteractions(playerInput) {
    if (!playerInput || !this.game.ui) return;

    const transform = this.ecsWorld.getComponent(this.playerId, 'Transform');
    if (!transform) return;

    this._playerPos.copy(transform.position);

    // Player forward direction in XZ plane
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
      this._toItem.y = 0; // Flat ground distance

      const dist = this._toItem.length();
      if (dist > interactable.maxDistance) continue;

      let score = dist;

      if (dist > 0.01) {
        this._toItem.normalize();
        const dot = this._forward.dot(this._toItem);

        // Accept if within close proximity (< 1.6m) OR facing within ~70° cone (dot > 0.28)
        if (dist < 1.6 || dot > 0.28) {
          // Weight towards objects the player is directly facing
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

      // Position visual highlight reticle beneath candidate
      if (this.highlightRing) {
        this.highlightRing.position.set(position.x, 0.05, position.z);
        const pulse = 0.65 + Math.sin(this.time * 6.0) * 0.25;
        this.highlightRing.material.opacity = pulse;
      }

      // Display interaction prompt
      this.game.ui.setPrompt(interactable.prompt);

      // Trigger interaction action when key/touch is pressed
      if (playerInput.interact) {
        if (interactable.actionType === 'inspect_beacon') {
          if (this.game.audio && typeof this.game.audio.playBeaconBeep === 'function') {
            this.game.audio.playBeaconBeep();
          }

          this.beaconInspected = true;
          this.game.gameState.setStory('beaconDiscovered', true);
          this.game.ui.showToast('Beacon status: Main battery dead. Power required to transmit.');
          interactable.prompt = 'Emergency Beacon (Power Required: Build Campfire)';
        } else if (interactable.actionType === 'salvage_medkit') {
          this.game.gameState.heal(40);
          if (this.game.audio) this.game.audio.playPickup();
          this.game.ui.showToast('First aid kit used (Health restored)');

          const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
          if (meshComp && meshComp.mesh) {
            this.threeScene.remove(meshComp.mesh);
          }
          this.ecsWorld.destroyEntity(id);
          this.game.ui.setPrompt(null);
          if (this.highlightRing) this.highlightRing.material.opacity = 0;
        } else if (interactable.actionType === 'salvage_rations') {
          const inv = this.game.gameState.inventory;
          if (inv.food < inv.maxFood) {
            this.game.gameState.addFood(2);
            if (this.game.audio) this.game.audio.playPickup();
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
        } else if (interactable.actionType === 'inspect_documents') {
          if (this.game.audio) this.game.audio.playPickup();
          this.game.gameState.setStory('manifestFound', true);
          this.game.ui.showToast('Flight 402: 12 souls aboard. Telemetry cut at 02:14.');
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
    this.smokeParticles = [];
    this.sparkParticles = [];
    this.engineLight = null;
    this.beaconLight = null;
    this.beaconGroup = null;
    this.highlightRing = null;
    this.characterMesh = null;
    this.renderSystem = null;

    super.dispose();
  }
}
