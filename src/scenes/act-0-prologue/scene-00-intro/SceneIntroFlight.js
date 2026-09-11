import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
import { AirplaneLoader } from '../../../world/AirplaneLoader.js';
import { ProceduralTerrain } from '../../../world/ProceduralTerrain.js';
import { WorldSeed } from '../../../world/WorldSeed.js';
import { ParticleFactory, InstancedParticleEmitter } from '../../../world/ParticleSystem.js';

/**
 * PROLOGUE — SCENE 0: FLIGHT 402
 *
 * Narrative:
 * Flight 402 battles through a sub-zero storm over the frozen mountain range.
 * Turbulence rattles the airframe, lightning illuminates the cloud deck, and a sudden
 * left turbine blowout forces a catastrophic plunge into the mountain valley below.
 * The aircraft plummets directly toward the pristine alpine forest clearing (the exact land
 * of Scene 1 before the crash), shearing through the pine canopy and slamming into the snow
 * before cutting to black.
 *
 * Features:
 * - GLB airplane model with authentic materials, strobe and navigation lights.
 * - Dynamic real-time LeftEngine tracking: sparks stream out along the true slipstream
 *   vector as the burning aircraft banks, rolls, and plummets.
 * - Pristine version of Scene 1's land (unbroken snow & forest, no crash wreckage).
 * - Dramatic chase camera tracking the plane hurtling directly into the pristine valley.
 * - Tree canopy shearing climax, violent ground impact jolt, and dark transition into Scene 1.
 */
export class SceneIntroFlight extends BaseScene {
  constructor(game) {
    super(game, 'scene-00-intro');
    this.time = 0;
    this.airplane = null;
    this.airplaneData = null;
    this.airplaneLoader = new AirplaneLoader();

    // Story sequence state
    this.storyCardEl = null;
    this.storyPhase = true;
    this.storyDuration = 3.5;
    this.planeArrivalTime = 3.5;

    // High-performance instanced particle streams
    this.cloudEmitter = null;
    this.needleEmitter = null;
    this.sparkEmitter = null;

    // LeftEngine local offset and real-time world tracking
    this.leftEnginePos = new THREE.Vector3(-2.04, 0.69, -0.76);
    this.currentEngineWorldPos = new THREE.Vector3();
    this.currentEngineWorldDir = new THREE.Vector3(0, 0, 1);

    // Pristine version of Scene 1's terrain below flight path (NO crash site model)
    this.pristineTerrainGroup = null;

    // Lighting
    this.lightningLight = null;
    this.nextLightningTime = 2.8;

    // Sequence flags
    this.alarmPlayed = false;
    this.hasFailed = false;
    this.hasHitTrees = false;
    this.hasHitGround = false;
    this.isTransitioning = false;

    // Skip handler
    this.skipListener = null;
  }

  async enter() {
    await super.enter();

    // 1. Storm Sky & Cloud Fog
    this.threeScene.background = new THREE.Color(0x0a0e18);
    this.threeScene.fog = new THREE.Fog(0x0a0e18, 25, 140);

    // 2. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x384860, 1.25);
    this.threeScene.add(ambientLight);

    const stormLight = new THREE.DirectionalLight(0x6a86b0, 1.5);
    stormLight.position.set(-20, 30, 15);
    this.threeScene.add(stormLight);

    // Lightning point light
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 320);
    this.lightningLight.position.set(0, 45, -25);
    this.threeScene.add(this.lightningLight);

    // 3. High-Speed Cloud & Snow Stream Particles
    this.createSpeedStreams();

    // 4. Pristine Version of Land One (Scene 1) WITHOUT the Crash Site!
    // Exact topological twin with fresh untouched snow and standing pine trees
    const worldSeed = WorldSeed.getSeed();
    const terrain = new ProceduralTerrain({
      seed: worldSeed,
      theme: 'pristine-crash-valley',
      size: 260,
    });
    const terrainBuild = terrain.build();
    this.pristineTerrainGroup = terrainBuild.group;
    // Positioned on the valley floor below cruising altitude
    this.pristineTerrainGroup.position.set(0, -31.5, -16.0);
    this.threeScene.add(this.pristineTerrainGroup);

    // 5. Setup Camera initial framing (drifting in the storm)
    this.camera.position.set(-16, 4.0, -18);
    this.camera.lookAt(0, 0, 0);

    // 7. Load Real Airplane GLB Model
    try {
      this.airplaneData = await this.airplaneLoader.load('/models/airplane.glb');
      this.airplane = this.airplaneData.model;
      if (this.airplaneData.leftEngineOffset) {
        this.leftEnginePos.copy(this.airplaneData.leftEngineOffset);
      }
    } catch (err) {
      console.warn('[SceneIntroFlight] Fallback to procedural airliner:', err);
      this.airplaneData = ProceduralModels.createFlightAirplane();
      this.airplane = this.airplaneData.group;
      this.leftEnginePos.set(-3.8, -1.0, 2.0);
    }

    this.airplane.position.set(0, 0, 0);
    this.threeScene.add(this.airplane);
    // Airplane remains hidden in the storm clouds during prologue story briefing
    this.airplane.visible = false;

    // 8. Create Prologue Story Run-Through Card in DOM
    this.createStoryCard();

    // 9. Skip listener [SPACE] or Click
    if (typeof window !== 'undefined') {
      this.skipListener = (e) => {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          this.handleUserSkip();
        }
      };
      window.addEventListener('keydown', this.skipListener);
      this.addCleanup(() => window.removeEventListener('keydown', this.skipListener));
    }
  }

  createStoryCard() {
    if (typeof document === 'undefined') return;
    const card = document.createElement('div');
    card.id = 'intro-story-card';
    card.className = 'intro-story-card';
    card.innerHTML = [
      '<div class="story-tag">[TRANSPONDER TELEMETRY // 02:14:08 AM]</div>',
      '<div class="story-line main">FLIGHT 402 &bull; CATALINA CIVIL & CARGO TRANSPORT</div>',
      '<div class="story-line sub">NORTHERN MOUNTAIN RIDGE &bull; 18,500 FT &bull; SUB-ZERO BLIZZARD</div>',
      '<div class="story-line warning">WARNING: RADAR LOST &bull; HYDRAULIC PRESSURE FAILING</div>',
      '<div class="story-skip-hint">PRESS [SPACE] OR TAP TO ADVANCE</div>',
    ].join('');

    card.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.handleUserSkip();
    });

    document.body.appendChild(card);
    this.storyCardEl = card;
  }

  handleUserSkip() {
    if (this.storyPhase) {
      this.endStoryPhase();
    } else {
      this.finishIntro();
    }
  }

  endStoryPhase() {
    if (!this.storyPhase) return;
    this.storyPhase = false;
    this.planeArrivalTime = this.time;

    if (this.storyCardEl) {
      this.storyCardEl.classList.add('fade-out');
      setTimeout(() => {
        if (this.storyCardEl && this.storyCardEl.parentNode) {
          this.storyCardEl.parentNode.removeChild(this.storyCardEl);
          this.storyCardEl = null;
        }
      }, 350);
    }

    if (this.airplane) {
      this.airplane.visible = true;
      this.airplane.position.set(0, -1.0, 16);
    }

    if (this.game && this.game.ui) {
      this.game.ui.showToast('FLIGHT 402 &bull; 02:14 AM — [SPACE] Skip to Wreckage');
    }
  }

  createSpeedStreams() {
    const { cloudEmitter, needleEmitter } = ParticleFactory.createIntroStormStream(36, 64);
    this.cloudEmitter = cloudEmitter;
    this.needleEmitter = needleEmitter;
    this.threeScene.add(this.cloudEmitter.mesh);
    this.threeScene.add(this.needleEmitter.mesh);
  }

  createEngineFailureSparks() {
    const sparkGeo = new THREE.SphereGeometry(0.09, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // High-performance instanced spark emitter dynamically tracking moving engine nozzle
    this.sparkEmitter = new InstancedParticleEmitter({
      count: 42,
      geometry: sparkGeo,
      material: sparkMat,
      onInit: (p) => {
        p.x = this.currentEngineWorldPos.x;
        p.y = this.currentEngineWorldPos.y;
        p.z = this.currentEngineWorldPos.z;

        // Eject backward along real-time airplane slipstream vector
        const dir = this.currentEngineWorldDir;
        const speed = 22 + Math.random() * 26;
        p.vx = dir.x * speed + (Math.random() - 0.5) * 3.5;
        p.vy = dir.y * speed + (Math.random() - 0.5) * 3.5;
        p.vz = dir.z * speed + (Math.random() - 0.5) * 3.5;

        p.maxLife = 0.42;
        p.life = Math.random() * p.maxLife;
        p.scale = 1.0;
      },
      onUpdate: (p, dt) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const progress = p.life / p.maxLife;
        p.scale = Math.max(0.01, 1.0 - progress);
      },
      onReset: (p) => {
        p.life = 0;
        // Spawn precisely at real-time world position of tumbling engine
        p.x = this.currentEngineWorldPos.x + (Math.random() - 0.5) * 0.35;
        p.y = this.currentEngineWorldPos.y + (Math.random() - 0.5) * 0.35;
        p.z = this.currentEngineWorldPos.z + (Math.random() - 0.5) * 0.35;

        const dir = this.currentEngineWorldDir;
        const speed = 22 + Math.random() * 26;
        p.vx = dir.x * speed + (Math.random() - 0.5) * 3.5;
        p.vy = dir.y * speed + (Math.random() - 0.5) * 3.5;
        p.vz = dir.z * speed + (Math.random() - 0.5) * 3.5;
      },
    });

    this.threeScene.add(this.sparkEmitter.mesh);
  }

  update(deltaTime) {
    if (!this.active) return;
    this.time += deltaTime;

    // 1. Move cloud & snow particles rapidly backward past plane (InstancedMesh)
    if (this.cloudEmitter) this.cloudEmitter.update(deltaTime, this.time);
    if (this.needleEmitter) this.needleEmitter.update(deltaTime, this.time);

    // 2. Story briefing auto-advance
    if (this.storyPhase && this.time >= this.storyDuration) {
      this.endStoryPhase();
    }

    // 3. Tail Strobe & Engine Pulse
    if (this.airplaneData && this.airplaneData.strobeLight) {
      const strobe = (this.time * 2.2) % 1.0;
      this.airplaneData.strobeLight.intensity = strobe < 0.12 ? 4.5 : 0.0;
    }

    // 4. Lightning Strikes
    if (this.time > this.nextLightningTime) {
      this.triggerLightning();
      this.nextLightningTime = this.time + 3.2 + Math.random() * 2.5;
    }

    // Decay lightning
    if (this.lightningLight && this.lightningLight.intensity > 0) {
      this.lightningLight.intensity = Math.max(0, this.lightningLight.intensity - deltaTime * 16.0);
    }

    // 5. Airplane Turbulence, Flight Physics & Crash Descent into Crash Site
    if (this.airplane && !this.storyPhase) {
      const flightTime = this.time - this.planeArrivalTime;

      // Smooth surge from distance fog into close framing
      if (flightTime < 1.6) {
        const surge = flightTime / 1.6;
        this.airplane.position.z = THREE.MathUtils.lerp(16, 0, surge);
        this.airplane.position.y = THREE.MathUtils.lerp(-1.0, 0, surge);
      }

      const turbulencePitch = Math.sin(this.time * 6.5) * 0.04 + Math.sin(this.time * 14.0) * 0.015;
      const turbulenceRoll = Math.cos(this.time * 4.8) * 0.06 + Math.sin(this.time * 11.5) * 0.02;
      const turbulenceYaw = Math.sin(this.time * 3.2) * 0.02;

      // Event: Left engine flameout after 3.8 seconds of flight
      if (flightTime > 3.8 && !this.hasFailed) {
        this.hasFailed = true;
        this.createEngineFailureSparks();
        if (this.game && this.game.ui) {
          this.game.ui.showToast('WARNING: LEFT TURBINE BLOWOUT &bull; HYDRAULIC PRESSURE LOSS');
        }
      }

      // Catastrophic plunge trajectory straight toward the crash site at (0, -31.5, -16)
      if (this.hasFailed) {
        const failProgress = Math.min(1.0, (flightTime - 3.8) / 3.8);

        // Aircraft pitches steeply nose-down and banks hard left
        this.airplane.rotation.x = turbulencePitch + failProgress * 0.62; // ~35° pitch down
        this.airplane.rotation.z = turbulenceRoll + failProgress * 0.78;  // ~44° left bank
        this.airplane.rotation.y = turbulenceYaw - failProgress * 0.25;

        // Plunge downwards accelerating toward the crash site clearing (y = 0 down to -31.0m)
        const fallSpeed = 5.8 + failProgress * 15.2;
        this.airplane.position.y -= fallSpeed * deltaTime;
        // Glide forward into the crash trench (z from 0 toward -16m)
        this.airplane.position.z = THREE.MathUtils.lerp(0, -16.0, failProgress);
        this.airplane.position.x = Math.sin(failProgress * Math.PI) * -1.8;

        // Dynamically thin the cloud fog as aircraft descends, revealing crash site & forest clearing below
        if (this.airplane.position.y < -5.0) {
          const depthProgress = Math.min(1.0, (-this.airplane.position.y - 5.0) / 22.0);
          this.threeScene.fog.far = THREE.MathUtils.lerp(140, 240, depthProgress);
        }

        // Treetop level impact & canopy shearing at y <= -24m
        if (this.airplane.position.y <= -24.0 && !this.hasHitTrees) {
          this.hasHitTrees = true;
          if (this.game && this.game.ui) {
            this.game.ui.showToast('IMPACT IMMINENT &bull; BRACE FOR IMPACT!');
          }
        }

        // Ground impact into crash site trench at y <= -29.5m
        if (this.airplane.position.y <= -29.5 && !this.hasHitGround) {
          this.hasHitGround = true;
          if (this.game && this.game.ui) {
            this.game.ui.showToast('CRASH SITE IMPACT &bull; TELEMETRY LOST');
          }
        }
      } else {
        this.airplane.rotation.set(turbulencePitch, turbulenceYaw, turbulenceRoll);
      }

      // Dynamic real-time LeftEngine tracking in world space
      this.currentEngineWorldPos.copy(this.leftEnginePos)
        .applyEuler(this.airplane.rotation)
        .add(this.airplane.position);

      // Real-time backward slipstream direction vector
      this.currentEngineWorldDir.set(0, 0, 1).applyEuler(this.airplane.rotation);

      // Dynamic Camera: Cinematic Chase Framing Looking Down Toward Crash Site
      let shakeIntensity = 0.08;
      if (this.hasHitGround) {
        shakeIntensity = 1.35; // Violent crash impact shudder
      } else if (this.hasHitTrees) {
        shakeIntensity = 0.75; // Tree canopy shearing vibration
      } else if (this.hasFailed) {
        shakeIntensity = 0.38; // Emergency dive turbulence
      }

      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;

      if (this.hasFailed) {
        // High chase perspective: positioned behind and above, looking down over the wings
        // directly at the crash site rushing up to meet the plane!
        this.camera.position.set(
          this.airplane.position.x - 10.0 + shakeX,
          this.airplane.position.y + 6.8 + shakeY,
          this.airplane.position.z + 17.0
        );
        // Look down along the plane's dive trajectory into the crash site trench
        this.camera.lookAt(
          this.airplane.position.x * 0.4,
          this.airplane.position.y - 3.5,
          this.airplane.position.z - 12.0
        );
      } else {
        // Cruising orbit camera
        const camAngle = -Math.PI * 0.65 + flightTime * 0.09;
        const camDist = 18.5 - Math.min(4.0, flightTime * 0.4);
        this.camera.position.set(
          Math.sin(camAngle) * camDist + shakeX,
          3.2 + Math.sin(flightTime * 0.6) * 1.0 + shakeY,
          Math.cos(camAngle) * camDist
        );
        this.camera.lookAt(0, 0, 0);
      }

      // Transition precisely as the airplane impacts the crash site floor (y <= -30.8m or flightTime > 7.9s)
      if ((this.airplane.position.y <= -30.8 || flightTime > 7.9) && !this.isTransitioning) {
        this.finishIntro();
      }
    } else {
      // Camera drift during prologue story briefing
      this.camera.position.set(
        Math.sin(this.time * 0.2) * 20,
        4.0 + Math.cos(this.time * 0.25) * 1.0,
        -18
      );
      this.camera.lookAt(0, 0, 0);
    }

    // 6. Update engine failure sparks (InstancedMesh)
    if (this.sparkEmitter) {
      this.sparkEmitter.update(deltaTime, this.time);
    }

    super.update(deltaTime);
  }

  triggerLightning() {
    if (this.lightningLight) {
      this.lightningLight.intensity = 8.0;
      this.lightningLight.position.set(
        (Math.random() - 0.5) * 80,
        30 + Math.random() * 20,
        -20 - Math.random() * 40
      );
    }
  }

  finishIntro() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (this.storyCardEl && this.storyCardEl.parentNode) {
      this.storyCardEl.parentNode.removeChild(this.storyCardEl);
      this.storyCardEl = null;
    }

    if (this.game && this.game.sceneManager) {
      this.game.sceneManager.goTo('scene-01-the-crash', true, true);
    }
  }

  exit() {
    if (this.skipListener && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.skipListener);
    }
    if (this.storyCardEl && this.storyCardEl.parentNode) {
      this.storyCardEl.parentNode.removeChild(this.storyCardEl);
      this.storyCardEl = null;
    }
    super.exit();
  }

  dispose() {
    if (this.cloudEmitter) {
      this.cloudEmitter.dispose();
      this.cloudEmitter = null;
    }
    if (this.needleEmitter) {
      this.needleEmitter.dispose();
      this.needleEmitter = null;
    }
    if (this.sparkEmitter) {
      this.sparkEmitter.dispose();
      this.sparkEmitter = null;
    }
    if (this.pristineTerrainGroup) {
      this.threeScene.remove(this.pristineTerrainGroup);
      this.pristineTerrainGroup = null;
    }
    this.lightningLight = null;
    this.airplane = null;
    this.airplaneData = null;

    super.dispose();
  }
}

export default SceneIntroFlight;
