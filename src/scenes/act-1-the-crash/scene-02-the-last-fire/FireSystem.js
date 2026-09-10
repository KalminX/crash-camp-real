import * as THREE from 'three';

const _flameDummy = new THREE.Object3D();

export class FireSystem {
  constructor(campfireMesh, fireLight, particles, audioSystem, instancedFlames = null, particlesData = null) {
    this.campfireMesh = campfireMesh;
    this.fireLight = fireLight;
    this.particles = particles || [];
    this.audioSystem = audioSystem;
    this.instancedFlames = instancedFlames;
    this.particlesData = particlesData || (Array.isArray(particles) ? particles : []);

    this.fuel = 65; // Current fuel (0 - 100)
    this.maxFuel = 100;
    this.burnRate = 0.75; // Depletes over ~80 seconds without fuel
    this.timeAccumulator = 0;
    this.flare = 0; // Temporary flare boost on refueling
  }

  addFuel(amount = 25) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
    this.flare = 1.2; // Trigger spark/flame flare
    if (this.audioSystem && typeof this.audioSystem.playAddFuel === 'function') {
      this.audioSystem.playAddFuel();
    }
  }

  getFuelRatio() {
    return Math.max(0, this.fuel / this.maxFuel);
  }

  update(dt, playerPosition = null) {
    this.timeAccumulator += dt;

    // 1. Burn fuel & decay flare
    if (this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - this.burnRate * dt);
    }
    if (this.flare > 0) {
      this.flare = Math.max(0, this.flare - dt * 1.5);
    }

    const baseRatio = this.getFuelRatio();
    const effectiveRatio = Math.min(1.4, baseRatio + this.flare * 0.4);

    // 2. Light flicker
    if (this.fireLight) {
      if (effectiveRatio > 0.05) {
        const flicker =
          Math.sin(this.timeAccumulator * 12.0) * 0.35 +
          Math.sin(this.timeAccumulator * 21.0) * 0.2 +
          (Math.random() - 0.5) * 0.15;
        this.fireLight.intensity = Math.max(0.6, (3.5 + flicker) * effectiveRatio);
        this.fireLight.distance = 14 + 18 * effectiveRatio;
      } else {
        this.fireLight.intensity = 0.2; // Glowing embers only
      }
    }

    // 3. High-Performance Instanced Flame Particles Update (Single Draw Call)
    if (this.instancedFlames && this.particlesData && this.particlesData.length > 0) {
      for (let i = 0; i < this.particlesData.length; i++) {
        const p = this.particlesData[i];
        p.life += dt * p.speed;
        if (p.life > p.maxLife) {
          p.life = 0;
        }

        const lifeRatio = p.life / p.maxLife;
        const radius = p.radius * (1.0 - lifeRatio * 0.5) * Math.max(0.2, effectiveRatio);
        const angle = p.angle + this.timeAccumulator * 1.1;

        _flameDummy.position.set(
          Math.cos(angle) * radius,
          p.baseY + lifeRatio * (0.8 + effectiveRatio * 0.9),
          Math.sin(angle) * radius
        );

        const scale = (1.0 - lifeRatio * 0.65) * (0.25 + effectiveRatio * 0.85);
        _flameDummy.scale.set(scale, scale, scale);
        _flameDummy.updateMatrix();
        this.instancedFlames.setMatrixAt(i, _flameDummy.matrix);
      }
      this.instancedFlames.instanceMatrix.needsUpdate = true;
    } else if (this.particles.length > 0) {
      // Fallback for non-instanced meshes
      for (const p of this.particles) {
        if (!p.userData) continue;
        p.userData.life += dt * p.userData.speed;
        if (p.userData.life > p.userData.maxLife) {
          p.userData.life = 0;
        }

        const lifeRatio = p.userData.life / p.userData.maxLife;
        const radius = p.userData.radius * (1.0 - lifeRatio * 0.5) * Math.max(0.2, effectiveRatio);
        const angle = p.userData.angle + this.timeAccumulator * 0.8;

        p.position.set(
          Math.cos(angle) * radius,
          p.userData.baseY + lifeRatio * (0.8 + effectiveRatio * 0.8),
          Math.sin(angle) * radius
        );

        const scale = (1.0 - lifeRatio * 0.7) * (0.3 + effectiveRatio * 0.7);
        p.scale.set(scale, scale, scale);
        if (p.material) {
          p.material.opacity = (1.0 - lifeRatio) * Math.min(1.0, effectiveRatio * 1.4);
        }
      }
    }

    // 4. Update spatial sound if player is near
    if (this.audioSystem && playerPosition && this.campfireMesh) {
      const dist = playerPosition.distanceTo(this.campfireMesh.position);
      if (typeof this.audioSystem.updateFireSound === 'function') {
        this.audioSystem.updateFireSound(baseRatio * 100, dist);
      }
    }
  }

  dispose() {
    this.particles = [];
    this.fireLight = null;
    this.campfireMesh = null;
  }
}
