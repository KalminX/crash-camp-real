import * as THREE from 'three';
import { BaseScene } from '../../BaseScene.js';
import { ProceduralModels } from '../../../world/ProceduralModels.js';
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

    // High-performance instanced particle streams
    this.cloudEmitter = null;
    this.needleEmitter = null;
    this.sparkEmitter = null;

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

    // 3. Create Procedural Airliner
    this.airplaneData = ProceduralModels.createFlightAirplane();
    this.airplane = this.airplaneData.group;
    this.airplane.position.set(0, 0, 0);
    this.threeScene.add(this.airplane);

    // 4. High-Speed Cloud & Snow Stream Particles (Giving illusion of forward speed)
    this.createSpeedStreams();

    // 5. Setup Camera initial framing
    this.camera.position.set(-14, 3.5, -16);
    this.camera.lookAt(0, 0, 0);

    // 6. Skip listener [SPACE] or Click
    this.skipListener = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.finishIntro();
      }
    };
    window.addEventListener('keydown', this.skipListener);
    this.addCleanup(() => window.removeEventListener('keydown', this.skipListener));

    if (this.game.ui) {
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
    const leftEnginePos = new THREE.Vector3(-3.8, -1.0, 2.0);
    const sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sparkEmitter = new InstancedParticleEmitter({
      count: 28,
      geometry: sparkGeo,
      material: sparkMat,
      onInit: (p) => {
        p.x = leftEnginePos.x;
        p.y = leftEnginePos.y;
        p.z = leftEnginePos.z;
        p.vx = (Math.random() - 0.5) * 2.2;
        p.vy = (Math.random() - 0.5) * 2.2;
        p.vz = 18 + Math.random() * 26;
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
        p.x = leftEnginePos.x + (Math.random() - 0.5) * 0.4;
        p.y = leftEnginePos.y + (Math.random() - 0.5) * 0.4;
        p.z = leftEnginePos.z;
        p.vx = (Math.random() - 0.5) * 2.2;
        p.vy = (Math.random() - 0.5) * 2.2;
        p.vz = 18 + Math.random() * 26;
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

    // 4. Airplane Turbulence Motion
    if (this.airplane) {
      const turbulencePitch = Math.sin(this.time * 6.5) * 0.04 + Math.sin(this.time * 14.0) * 0.015;
      const turbulenceRoll = Math.cos(this.time * 4.8) * 0.06 + Math.sin(this.time * 11.5) * 0.02;
      const turbulenceYaw = Math.sin(this.time * 3.2) * 0.02;

      // Event: After 4.2 seconds, left engine suffers failure
      if (this.time > 4.2 && !this.hasFailed) {
        this.hasFailed = true;
        this.createEngineFailureSparks();
        if (this.game.ui) {
          this.game.ui.showToast('WARNING: LEFT TURBINE BREACH &bull; HYDRAULIC PRESSURE LOSS');
        }
      }

      // If engine has failed, plane banks steeply and pitches down
      if (this.hasFailed) {
        const failProgress = Math.min(1.0, (this.time - 4.2) / 3.8);
        this.airplane.rotation.x = turbulencePitch + failProgress * 0.45; // pitch nose down
        this.airplane.rotation.z = turbulenceRoll + failProgress * 0.65;  // bank hard left
        this.airplane.position.y -= failProgress * 12.0 * deltaTime;
      } else {
        this.airplane.rotation.set(turbulencePitch, turbulenceYaw, turbulenceRoll);
      }
    }

    // 5. Update engine failure sparks (InstancedMesh)
    if (this.sparkEmitter) {
      this.sparkEmitter.update(deltaTime, this.time);
    }

    // 6. Camera Orbit & Shake
    const camAngle = -Math.PI * 0.65 + this.time * 0.08;
    const camDist = 20 - Math.min(4.0, this.time * 0.4);
    const shakeX = (Math.random() - 0.5) * (this.hasFailed ? 0.35 : 0.12);
    const shakeY = (Math.random() - 0.5) * (this.hasFailed ? 0.35 : 0.12);

    this.camera.position.set(
      Math.sin(camAngle) * camDist + shakeX,
      3.0 + Math.sin(this.time * 0.6) * 1.5 + shakeY,
      Math.cos(camAngle) * camDist
    );
    this.camera.lookAt(0, -this.time * 0.6, 0);

    // 7. Auto-transition at end of sequence (~8.8 seconds)
    if (this.time > 8.8 && !this.isTransitioning) {
      this.finishIntro();
    }

    super.update(deltaTime);
  }

  triggerLightning() {
    if (this.lightningLight) {
      this.lightningLight.intensity = 7.5;
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

    if (this.game && this.game.sceneManager) {
      this.game.sceneManager.goTo('scene-01-the-crash', true, true);
    }
  }

  exit() {
    if (this.skipListener) {
      window.removeEventListener('keydown', this.skipListener);
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
