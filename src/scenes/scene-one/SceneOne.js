import * as THREE from 'three';
import { Scene } from '../Scene.js';
import { Components } from '../../ecs/Components.js';
import { ProceduralModels } from '../../world/ProceduralModels.js';
import { MovementSystem } from '../../systems/MovementSystem.js';
import { CollisionSystem } from '../../systems/CollisionSystem.js';
import { RenderSystem } from '../../systems/RenderSystem.js';

/**
 * ACT I — SCENE 1: THE CRASH
 *
 * Narrative:
 * The player wakes up in the sub-zero snow after Flight 402 impacts the wilderness.
 * Smoke billows from the torn fuselage, glowing engine embers crackle, and debris is strewn across the trench.
 *
 * Key Elements:
 * - Damaged aircraft fuselage, severed wing, smoldering jet turbine
 * - Procedural rising smoke plumes and wind-blown sparks
 * - Basic exploration & interactable emergency supplies (First Aid Kit, Rations, Flight Manifest)
 * - Emergency Beacon: The central objective — inspecting it reveals a depleted battery requiring thermal/external power.
 */
export class SceneOne extends Scene {
  constructor(game) {
    super(game, 'scene-one');
    this.playerId = null;
    this.time = 0;

    // Raycast Interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.6;
    this.centerScreen = new THREE.Vector2(0, 0);

    // Procedural Particles (Smoke & Sparks)
    this.smokeParticles = [];
    this.sparkParticles = [];

    // Turbine Fire Light
    this.engineLight = null;

    // Beacon Light & Status
    this.beaconLight = null;
    this.beaconGroup = null;
    this.beaconInspected = false;
  }

  enter() {
    super.enter();

    // 1. Atmosphere & Fog (Smoldering crash haze in alpine dusk)
    this.threeScene.background = new THREE.Color(0x18171c);
    this.threeScene.fog = new THREE.Fog(0x18171c, 20, 80);

    // 2. Lighting (Overcast cold moonlight + fiery wreckage glow)
    const ambientLight = new THREE.AmbientLight(0x404452, 0.6);
    this.threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x565e72, 0x241d18, 0.45);
    this.threeScene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0x8fa4c2, 0.75);
    moonLight.position.set(-18, 28, 16);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.bias = -0.0005;
    this.threeScene.add(moonLight);

    // Turbine combustion fire light
    this.engineLight = new THREE.PointLight(0xff5511, 4.5, 26, 1.4);
    this.engineLight.position.set(-3.2, 1.2, -4.2);
    this.engineLight.castShadow = true;
    this.threeScene.add(this.engineLight);

    // 3. Terrain & Crash Trench
    this.buildCrashEnvironment();

    // 4. Procedural Aircraft Wreckage
    this.buildAircraftWreckage();

    // 5. Emergency Beacon (Primary Objective)
    this.buildEmergencyBeacon();

    // 6. Interactive Emergency Supplies
    this.spawnEmergencySupplies();

    // 7. Procedural Smoke & Spark Particles
    this.createSmokeAndSparks();

    // 8. Player Entity (Waking up at the edge of the impact trench)
    const player = this.ecsWorld.createEntity();
    this.playerId = player;
    // Player starts standing near the cockpit opening facing the wreckage
    this.ecsWorld.addComponent(player, 'Transform', Components.Transform(0, 0, 8));
    this.ecsWorld.addComponent(player, 'Velocity', Components.Velocity());
    const pInput = this.ecsWorld.addComponent(player, 'PlayerInput', Components.PlayerInput());
    pInput.cameraYaw = Math.PI; // Face north toward burning wreckage
    this.ecsWorld.addComponent(player, 'Collider', Components.Collider(0.45, 1.8, false));

    const playerChestLight = new THREE.PointLight(0xeef2f7, 0.6, 12, 1.6);
    this.camera.add(playerChestLight);
    this.threeScene.add(this.camera);

    // 9. Systems
    this.ecsWorld.addSystem(new MovementSystem(this.game.audio));
    this.ecsWorld.addSystem(new CollisionSystem(36));
    this.ecsWorld.addSystem(new RenderSystem(this.game.renderer, this.threeScene, this.camera));

    if (this.game.ui) {
      this.game.ui.showToast('Scene 1: The Crash');
    }
  }

  // =========================================================================
  // ENVIRONMENT & WRECKAGE MODELING
  // =========================================================================

  buildCrashEnvironment() {
    // Frosted snow terrain clearing
    const ground = ProceduralModels.createClearingGround(44);
    this.threeScene.add(ground);

    // Impact Trench (plowed earth furrow)
    const furrowGeo = new THREE.PlaneGeometry(8, 26, 8, 16);
    furrowGeo.rotateX(-Math.PI / 2);
    const furrowMat = new THREE.MeshStandardMaterial({
      color: 0x221a14, // Burnt scorched soil
      roughness: 0.95,
      metalness: 0.05,
    });
    const furrow = new THREE.Mesh(furrowGeo, furrowMat);
    furrow.position.set(-1.5, 0.02, 2);
    furrow.rotation.y = -0.15;
    furrow.receiveShadow = true;
    this.threeScene.add(furrow);

    // Boundary forest (tall pine trees & craggy rocks)
    const treeCount = 48;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const dist = 22 + Math.random() * 14;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scale = 0.9 + Math.random() * 0.5;

      const treeMesh = ProceduralModels.createTree(scale);
      treeMesh.position.set(x, 0, z);
      this.threeScene.add(treeMesh);

      const treeEnt = this.ecsWorld.createEntity();
      this.ecsWorld.addComponent(treeEnt, 'Transform', Components.Transform(x, 0, z));
      this.ecsWorld.addComponent(treeEnt, 'Collider', Components.Collider(0.6 * scale, 3.5, true));
      this.ecsWorld.addComponent(treeEnt, 'MeshComponent', Components.MeshComponent(treeMesh));
    }

    // Fractured crash rocks
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 12;
      const rock = ProceduralModels.createRock(0.8 + Math.random() * 0.7);
      rock.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      this.threeScene.add(rock);
    }
  }

  buildAircraftWreckage() {
    // Master plane wreckage model (Fuselage, severed wing, and smoking jet engine)
    const planeWreckage = ProceduralModels.createPlaneWreckage();
    planeWreckage.position.set(-2.5, 0, -3.5);
    this.threeScene.add(planeWreckage);

    const wreckageEnt = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(wreckageEnt, 'Transform', Components.Transform(-2.5, 0, -3.5));
    this.ecsWorld.addComponent(wreckageEnt, 'Collider', Components.Collider(3.8, 3.5, true));
    this.ecsWorld.addComponent(wreckageEnt, 'MeshComponent', Components.MeshComponent(planeWreckage));

    // Additional scattered debris: sheared metal panels and luggage
    const debrisGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x828892, roughness: 0.35, metalness: 0.8 });
    const luggageMat = new THREE.MeshStandardMaterial({ color: 0x5a2d28, roughness: 0.7 });

    // Twisted hull panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.4), metalMat);
    panel.position.set(3.8, 0.2, 3.5);
    panel.rotation.set(0.2, 0.6, -0.1);
    panel.castShadow = true;
    debrisGroup.add(panel);

    // Scattered suitcase
    const suitcase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5), luggageMat);
    suitcase.position.set(2.2, 0.12, 5.0);
    suitcase.rotation.y = 0.4;
    suitcase.castShadow = true;
    debrisGroup.add(suitcase);

    this.threeScene.add(debrisGroup);
  }

  // =========================================================================
  // EMERGENCY BEACON (CENTRAL OBJECTIVE)
  // =========================================================================

  buildEmergencyBeacon() {
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.position.set(4.5, 0, -1.5);

    // Metal mounting tripod / base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x33363d, roughness: 0.6, metalness: 0.7 });
    const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 0.6, 6), baseMat);
    tripod.position.y = 0.3;
    tripod.castShadow = true;
    this.beaconGroup.add(tripod);

    // High-visibility aviation emergency transponder chassis (International Orange)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xd96b32, // International safety orange
      roughness: 0.4,
      metalness: 0.3,
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.45), chassisMat);
    chassis.position.y = 0.85;
    chassis.castShadow = true;
    this.beaconGroup.add(chassis);

    // Antenna mast
    const mastMat = new THREE.MeshStandardMaterial({ color: 0xb8b4a8, metalness: 0.9, roughness: 0.2 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.4, 8), mastMat);
    mast.position.set(0, 1.7, 0);
    this.beaconGroup.add(mast);

    // Pulsing amber indicator LED at mast tip
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bulbMat);
    bulb.position.set(0, 2.4, 0);
    this.beaconGroup.add(bulb);

    this.beaconLight = new THREE.PointLight(0xffaa22, 1.2, 7, 1.8);
    this.beaconLight.position.set(0, 2.4, 0);
    this.beaconGroup.add(this.beaconLight);

    this.threeScene.add(this.beaconGroup);

    // ECS Entity for Beacon
    const beaconEnt = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(beaconEnt, 'Transform', Components.Transform(4.5, 0, -1.5));
    this.ecsWorld.addComponent(
      beaconEnt,
      'Interactable',
      Components.Interactable('Inspect Emergency Beacon', 'inspect_beacon', 3.2)
    );
    this.ecsWorld.addComponent(beaconEnt, 'Collider', Components.Collider(0.7, 2.4, true));
    this.ecsWorld.addComponent(beaconEnt, 'MeshComponent', Components.MeshComponent(this.beaconGroup));
  }

  // =========================================================================
  // EMERGENCY SUPPLIES & DISCOVERIES
  // =========================================================================

  spawnEmergencySupplies() {
    // 1. First Aid Kit near cockpit
    const medKitGroup = new THREE.Group();
    medKitGroup.position.set(-4.8, 0.12, 1.2);
    medKitGroup.rotation.y = 0.3;

    const medBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.24, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.4 })
    );
    medBox.castShadow = true;
    medKitGroup.add(medBox);

    // Red cross decal on lid
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.08), new THREE.MeshBasicMaterial({ color: 0xa83e32 }));
    crossH.position.y = 0.125;
    medKitGroup.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.24), new THREE.MeshBasicMaterial({ color: 0xa83e32 }));
    crossV.position.y = 0.125;
    medKitGroup.add(crossV);

    this.threeScene.add(medKitGroup);

    const medEnt = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(medEnt, 'Transform', Components.Transform(-4.8, 0.12, 1.2));
    this.ecsWorld.addComponent(
      medEnt,
      'Interactable',
      Components.Interactable('Salvage First Aid Kit', 'salvage_medkit', 2.8)
    );
    this.ecsWorld.addComponent(medEnt, 'MeshComponent', Components.MeshComponent(medKitGroup));

    // 2. Emergency Ration Crate in cargo debris
    const rationCrate = ProceduralModels.createRationBox();
    rationCrate.position.set(-1.0, 0, -6.5);
    rationCrate.rotation.y = -0.4;
    this.threeScene.add(rationCrate);

    const rationEnt = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(rationEnt, 'Transform', Components.Transform(-1.0, 0, -6.5));
    this.ecsWorld.addComponent(
      rationEnt,
      'Interactable',
      Components.Interactable('Salvage Emergency Rations', 'salvage_rations', 2.8)
    );
    this.ecsWorld.addComponent(rationEnt, 'Collider', Components.Collider(0.6, 0.6, true));
    this.ecsWorld.addComponent(rationEnt, 'MeshComponent', Components.MeshComponent(rationCrate));

    // 3. Flight Manifest Clipboard on cargo wreckage
    const docGroup = new THREE.Group();
    docGroup.position.set(1.5, 0.25, 3.2);
    docGroup.rotation.set(-0.2, 0.4, 0.1);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.04, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8 })
    );
    docGroup.add(board);
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.01, 0.52),
      new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.9 })
    );
    paper.position.y = 0.025;
    docGroup.add(paper);
    this.threeScene.add(docGroup);

    const docEnt = this.ecsWorld.createEntity();
    this.ecsWorld.addComponent(docEnt, 'Transform', Components.Transform(1.5, 0.25, 3.2));
    this.ecsWorld.addComponent(
      docEnt,
      'Interactable',
      Components.Interactable('Inspect Flight Documents', 'inspect_documents', 2.8)
    );
    this.ecsWorld.addComponent(docEnt, 'MeshComponent', Components.MeshComponent(docGroup));
  }

  // =========================================================================
  // PROCEDURAL SMOKE & SPARK PARTICLES
  // =========================================================================

  createSmokeAndSparks() {
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
        -3.2 + (Math.random() - 0.5) * 0.6,
        1.2 + Math.random() * 3.5,
        -4.2 + (Math.random() - 0.5) * 0.6
      );
      this.threeScene.add(mesh);

      this.smokeParticles.push({
        mesh,
        baseX: -3.2,
        baseZ: -4.2,
        baseY: 1.2,
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
      mesh.position.set(-3.2, 1.2, -4.2);
      this.threeScene.add(mesh);

      this.sparkParticles.push({
        mesh,
        x: -3.2,
        y: 1.2,
        z: -4.2,
        vx: (Math.random() - 0.2) * 0.8,
        vy: 0.8 + Math.random() * 1.2,
        vz: 0.4 + Math.random() * 0.8,
        life: Math.random() * 2.0,
        maxLife: 2.0,
      });
    }
  }

  // =========================================================================
  // MAIN UPDATE LOOP
  // =========================================================================

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
      // Dull dying pulse every 1.6s
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
        s.x = -3.2 + (Math.random() - 0.5) * 0.3;
        s.y = 1.2;
        s.z = -4.2 + (Math.random() - 0.5) * 0.3;
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

  handleInteractions(playerInput) {
    if (!playerInput || !this.game.ui) return;

    this.raycaster.setFromCamera(this.centerScreen, this.camera);
    const interactables = this.ecsWorld.query('Interactable', 'MeshComponent', 'Transform');

    let closest = null;
    let closestDist = Infinity;

    for (const id of interactables) {
      const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
      const interactable = this.ecsWorld.getComponent(id, 'Interactable');
      if (meshComp && meshComp.mesh) {
        const intersects = this.raycaster.intersectObject(meshComp.mesh, true);
        if (intersects.length > 0 && intersects[0].distance < closestDist && intersects[0].distance <= interactable.maxDistance) {
          closestDist = intersects[0].distance;
          closest = { id, interactable };
        }
      }
    }

    if (closest) {
      const { id, interactable } = closest;

      if (interactable.actionType === 'inspect_beacon') {
        this.game.ui.setPrompt('Inspect emergency beacon');
        if (playerInput.interact) {
          if (this.game.audio && typeof this.game.audio.playBeaconBeep === 'function') {
            this.game.audio.playBeaconBeep();
          }

          this.beaconInspected = true;
          this.game.gameState.setStory('beaconDiscovered', true);

          // Provide diagnostic story reveal
          this.game.ui.showToast('Beacon status: Main battery dead. Power required to transmit.');

          // Update prompt text to reflect discovery
          interactable.prompt = 'Emergency Beacon (Power Required: Build Campfire)';
        }
      } else if (interactable.actionType === 'salvage_medkit') {
        this.game.ui.setPrompt('Salvage first aid kit');
        if (playerInput.interact) {
          this.game.gameState.heal(40);
          if (this.game.audio) this.game.audio.playPickup();
          this.game.ui.showToast('First aid kit used (Health restored)');

          const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
          if (meshComp && meshComp.mesh) {
            this.threeScene.remove(meshComp.mesh);
          }
          this.ecsWorld.destroyEntity(id);
          this.game.ui.setPrompt(null);
        }
      } else if (interactable.actionType === 'salvage_rations') {
        const inv = this.game.gameState.inventory;
        if (inv.food < inv.maxFood) {
          this.game.ui.setPrompt('Salvage emergency rations');
          if (playerInput.interact) {
            this.game.gameState.addFood(2);
            if (this.game.audio) this.game.audio.playPickup();
            this.game.ui.showToast(`Emergency rations salvaged (${this.game.gameState.inventory.food}/${inv.maxFood})`);

            const meshComp = this.ecsWorld.getComponent(id, 'MeshComponent');
            if (meshComp && meshComp.mesh) {
              this.threeScene.remove(meshComp.mesh);
            }
            this.ecsWorld.destroyEntity(id);
            this.game.ui.setPrompt(null);
          }
        } else {
          this.game.ui.setPrompt('Food pouch full (5/5)');
        }
      } else if (interactable.actionType === 'inspect_documents') {
        this.game.ui.setPrompt('Inspect flight documents');
        if (playerInput.interact) {
          if (this.game.audio) this.game.audio.playPickup();
          this.game.gameState.setStory('manifestFound', true);
          this.game.ui.showToast('Flight 402: 12 souls aboard. Telemetry cut at 02:14.');
        }
      }
    } else {
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

    super.dispose();
  }
}
