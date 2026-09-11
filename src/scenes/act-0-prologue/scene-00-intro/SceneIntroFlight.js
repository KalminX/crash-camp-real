import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
import { AirplaneLoader } from '../../../world/AirplaneLoader.js';
import { ParticleFactory, InstancedParticleEmitter } from '../../../world/ParticleSystem.js';

/**
 * PROLOGUE — SCENE 0: FLIGHT 402
 *
 * Narrative:
 * Flight 402 battles through a sub-zero storm over the frozen mountain range.
 * Turbulence rattles the airframe, lightning illuminates the cloud deck, and a sudden
 * engine failure forces a catastrophic descent into the snow below.
 *
 * Mechanics:
 * - Controls are non-interactive (cinematic automated camera).
 * - High-speed procedural cloud & snow particle stream.
 * - Dynamic lightning flashes and left-engine flameout sparks.
 * - Auto-transitions to Scene 1 (The Crash) or skips via [SPACE].
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

    // LeftEngine failure spark position (calculated from GLB model)
    this.leftEnginePos = new THREE.Vector3(-2.04, 0.69, -0.76);

    // Lighting
    this.lightningLight = null;
    this.nextLightningTime = 2.8;

    // Sequence flags
    this.alarmPlayed = false;
    this.hasFailed = false;
    this.isTransitioning = false;

    // Skip handler
    this.skipListener = null;
  }

  async enter() {
    await super.enter();

    // 1. Storm Sky & Dense Cloud Fog
    this.threeScene.background = new THREE.Color(0x070a10);
    this.threeScene.fog = new THREE.Fog(0x070a10, 25, 140);

    // 2. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x283548, 1.2);
    this.threeScene.add(ambientLight);

    const stormLight = new THREE.DirectionalLight(0x5a759e, 1.4);
    stormLight.position.set(-20, 25, 15);
    this.threeScene.add(stormLight);

    // Lightning point light
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 300);
    this.lightningLight.position.set(0, 40, -30);
    this.threeScene.add(this.lightningLight);

    // 3. High-Speed Cloud & Snow Stream Particles (Giving illusion of forward speed)
    this.createSpeedStreams();

    // 4. Setup Camera initial framing (drifting in the storm)
    this.camera.position.set(-16, 4.0, -18);
    this.camera.lookAt(0, 0, 0);

    // 5. Load Real Airplane GLB Model
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

    // 6. Create Prologue Story Run-Through Card in DOM
    this.createStoryCard();

    // 7. Skip listener [SPACE] or Click
    this.skipListener = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handleUserSkip();
      }
    };
    window.addEventListener('keydown', this.skipListener);
    this.addCleanup(() => window.removeEventListener('keydown', this.skipListener));
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
      '<div class="story-skip-hint">PRESS [SPACE] OR TAP TO ADVANCE</div>'
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
    const sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const ep = this.leftEnginePos;

    this.sparkEmitter = new InstancedParticleEmitter({
      count: 32,
      geometry: sparkGeo,
      material: sparkMat,
      onInit: (p) => {
        p.x = ep.x;
        p.y = ep.y;
        p.z = ep.z;
        p.vx = (Math.random() - 0.5) * 2.5;
        p.vy = (Math.random() - 0.5) * 2.5;
        p.vz = 18 + Math.random() * 28;
        p.maxLife = 0.45;
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
        p.x = ep.x + (Math.random() - 0.5) * 0.3;
        p.y = ep.y + (Math.random() - 0.5) * 0.3;
        p.z = ep.z;
        p.vx = (Math.random() - 0.5) * 2.5;
        p.vy = (Math.random() - 0.5) * 2.5;
        p.vz = 18 + Math.random() * 28;
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

    // 2. Tail Strobe & Engine Pulse
    if (this.airplaneData && this.airplaneData.strobeLight) {
      const strobe = (this.time * 2.2) % 1.0;
      this.airplaneData.strobeLight.intensity = strobe < 0.12 ? 4.5 : 0.0;
    }

    // 3. Lightning Strikes
    if (this.time > this.nextLightningTime) {
      this.triggerLightning();
      this.nextLightningTime = this.time + 3.2 + Math.random() * 2.5;
    }

    // Decay lightning
    if (this.lightningLight && this.lightningLight.intensity > 0) {
      this.lightningLight.intensity = Math.max(0, this.lightningLight.intensity - deltaTime * 16.0);
    }

    // 4. Airplane Turbulence & Flight Physics
    if (this.airplane && !this.storyPhase) {
      const flightTime = this.time - this.planeArrivalTime;

      // Smooth surge from distance fog into close framing
      if (flightTime < 1.6) {
        const surge = flightTime / 1.6;
        this.airplane.position.z = THREE.MathUtils.lerp(16, 0, surge);
        this.airplane.position.y = THREE.MathUtils.lerp(-1.0, 0, surge);
      } else {
        this.airplane.position.z = 0;
      }

      const turbulencePitch = Math.sin(this.time * 6.5) * 0.04 + Math.sin(this.time * 14.0) * 0.015;
      const turbulenceRoll = Math.cos(this.time * 4.8) * 0.06 + Math.sin(this.time * 11.5) * 0.02;
      const turbulenceYaw = Math.sin(this.time * 3.2) * 0.02;

      // Event: Left engine flameout after 3.8 seconds of flight
      if (flightTime > 3.8 && !this.hasFailed) {
        this.hasFailed = true;
        this.createEngineFailureSparks();
        if (this.game && this.game.ui) {
          this.game.ui.showToast('WARNING: LEFT TURBINE BREACH &bull; HYDRAULIC PRESSURE LOSS');
        }
      }

      // If engine has failed, plane banks steeply and pitches down
      if (this.hasFailed) {
        const failProgress = Math.min(1.0, (flightTime - 3.8) / 3.4);
        this.airplane.rotation.x = turbulencePitch + failProgress * 0.45; // pitch nose down
        this.airplane.rotation.z = turbulenceRoll + failProgress * 0.65;  // bank hard left
        this.airplane.position.y -= failProgress * 12.0 * deltaTime;
      } else {
        this.airplane.rotation.set(turbulencePitch, turbulenceYaw, turbulenceRoll);
      }

      // 6. Dynamic Camera Orbit & Shake
      const camAngle = -Math.PI * 0.65 + flightTime * 0.09;
      const camDist = 18.5 - Math.min(3.5, flightTime * 0.35);
      const shakeX = (Math.random() - 0.5) * (this.hasFailed ? 0.35 : 0.10);
      const shakeY = (Math.random() - 0.5) * (this.hasFailed ? 0.35 : 0.10);

      this.camera.position.set(
        Math.sin(camAngle) * camDist + shakeX,
        3.0 + Math.sin(flightTime * 0.6) * 1.2 + shakeY,
        Math.cos(camAngle) * camDist
      );
      this.camera.lookAt(0, -flightTime * 0.5, 0);

      // 7. Auto-transition at end of flight descent (~8.2 seconds of flight)
      if (flightTime > 8.2 && !this.isTransitioning) {
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

    // 5. Update engine failure sparks (InstancedMesh)
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
    if (this.skipListener) {
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
    this.lightningLight = null;
    this.airplane = null;
    this.airplaneData = null;

    super.dispose();
  }
}

export default SceneIntroFlight;
