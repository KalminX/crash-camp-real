import * as THREE from 'three';

/**
 * ParticleSystem — High-performance GPU-friendly particle emitters using THREE.InstancedMesh.
 * Replaces CPU-heavy multi-mesh arrays with single-draw-call instanced rendering.
 */

const _dummy = new THREE.Object3D();

export class InstancedParticleEmitter {
  constructor({
    count = 32,
    geometry,
    material,
    onInit,
    onUpdate,
    onReset,
  }) {
    this.count = count;
    this.geometry = geometry;
    this.material = material;
    this.onInit = onInit;
    this.onUpdate = onUpdate;
    this.onReset = onReset;

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    this.particles = [];
    for (let i = 0; i < this.count; i++) {
      const p = {
        index: i,
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        life: 0,
        maxLife: 1,
        active: true,
        userData: {},
      };
      if (this.onInit) {
        this.onInit(p, i);
      }
      this.particles.push(p);

      // Initial matrix
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.set(p.scale, p.scale, p.scale);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt, time = 0) {
    let anyActive = false;
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        _dummy.position.set(0, -9999, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      anyActive = true;
      if (this.onUpdate) {
        this.onUpdate(p, dt, time, i);
      }

      if (p.life >= p.maxLife) {
        if (this.onReset) {
          this.onReset(p, i);
        } else {
          p.life = 0;
        }
      }

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.set(p.scale, p.scale, p.scale);
      if (p.rotationX || p.rotationY || p.rotationZ) {
        _dummy.rotation.set(p.rotationX || 0, p.rotationY || 0, p.rotationZ || 0);
      }
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }

    if (anyActive) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.particles = [];
  }
}

export const ParticleFactory = {
  /**
   * Rising smoke plume from plane wreckage or campfire (Instanced Dodecahedrons).
   */
  createSmokePlume(basePos, count = 28) {
    const geo = new THREE.DodecahedronGeometry(0.35, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3d4148,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    return new InstancedParticleEmitter({
      count,
      geometry: geo,
      material: mat,
      onInit: (p, i) => {
        p.baseX = basePos.x;
        p.baseY = basePos.y;
        p.baseZ = basePos.z;
        p.swayPhase = Math.random() * Math.PI * 2;
        p.speed = 0.6 + Math.random() * 0.6;
        p.maxLife = 3.6 + Math.random() * 1.2;
        p.life = (i / count) * p.maxLife; // Staggered warm start
        p.x = p.baseX;
        p.y = p.baseY;
        p.z = p.baseZ;
        p.scale = 0.5;
      },
      onUpdate: (p, dt, time) => {
        p.life += dt * p.speed;
        const progress = Math.min(1, p.life / p.maxLife);
        const driftX = Math.sin(p.swayPhase + time * 0.9) * 0.6 + progress * 1.1;
        const driftZ = Math.cos(p.swayPhase + time * 0.9) * 0.5 + progress * 1.4;

        p.x = p.baseX + driftX;
        p.y = p.baseY + progress * 5.5;
        p.z = p.baseZ + driftZ;
        p.scale = (0.6 + progress * 2.4) * (progress > 0.85 ? (1 - progress) / 0.15 : 1);
      },
      onReset: (p) => {
        p.life = 0;
        p.swayPhase = Math.random() * Math.PI * 2;
      },
    });
  },

  /**
   * Turbine spark embers / campfire sparks (Instanced glowing Spheres).
   */
  createSparks(basePos, count = 22) {
    const geo = new THREE.SphereGeometry(0.04, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new InstancedParticleEmitter({
      count,
      geometry: geo,
      material: mat,
      onInit: (p) => {
        p.baseX = basePos.x;
        p.baseY = basePos.y;
        p.baseZ = basePos.z;
        p.maxLife = 1.4 + Math.random() * 1.0;
        p.life = Math.random() * p.maxLife;
        p.vx = (Math.random() - 0.25) * 1.2;
        p.vy = 1.0 + Math.random() * 1.8;
        p.vz = 0.4 + Math.random() * 1.1;
        p.x = p.baseX;
        p.y = p.baseY;
        p.z = p.baseZ;
        p.scale = 1.0;
      },
      onUpdate: (p, dt) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 0.45 * dt; // Gravity
        const lifeRatio = p.life / p.maxLife;
        p.scale = Math.max(0.01, 1.2 * (1.0 - lifeRatio));
      },
      onReset: (p) => {
        p.life = 0;
        p.x = p.baseX + (Math.random() - 0.5) * 0.3;
        p.y = p.baseY;
        p.z = p.baseZ + (Math.random() - 0.5) * 0.3;
        p.vx = (Math.random() - 0.25) * 1.2;
        p.vy = 1.0 + Math.random() * 1.8;
        p.vz = 0.4 + Math.random() * 1.1;
      },
    });
  },

  /**
   * Midnight Blizzard Snow Swirls for Scene 2 (The Last Fire).
   * Instanced icy snow crystals swirling in wind around the camp clearing.
   */
  createBlizzardSwirl(center = { x: 0, y: 0, z: 0 }, radius = 24, count = 160) {
    const geo = new THREE.DodecahedronGeometry(0.07, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc8ddf0,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new InstancedParticleEmitter({
      count,
      geometry: geo,
      material: mat,
      onInit: (p) => {
        p.angle = Math.random() * Math.PI * 2;
        p.dist = 2.5 + Math.random() * radius;
        p.orbitSpeed = 0.8 + Math.random() * 1.2;
        p.fallSpeed = 1.5 + Math.random() * 2.2;
        p.windSpeedX = 4.0 + Math.random() * 3.0;
        p.x = center.x + Math.cos(p.angle) * p.dist;
        p.y = 0.2 + Math.random() * 6.5;
        p.z = center.z + Math.sin(p.angle) * p.dist;
        p.scale = 0.6 + Math.random() * 0.8;
        p.maxLife = 4.0 + Math.random() * 3.0;
        p.life = Math.random() * p.maxLife;
      },
      onUpdate: (p, dt, time) => {
        p.life += dt;
        p.angle += p.orbitSpeed * dt * 0.5;
        p.x += p.windSpeedX * dt * 0.8;
        p.y -= p.fallSpeed * dt;
        p.z += Math.sin(p.angle + time * 1.5) * 1.2 * dt;

        if (p.y <= 0.1 || p.x > center.x + radius) {
          p.x = center.x - radius * 0.9 + (Math.random() - 0.5) * 8;
          p.y = 4.0 + Math.random() * 3.5;
          p.z = center.z + (Math.random() - 0.5) * radius * 1.8;
          p.life = 0;
        }
      },
    });
  },

  /**
   * Morning Dawn Frost Dust Shimmer for Scene 3 (Morning After).
   * Low-angle golden atmospheric dust motes floating gently over the survivor footprints.
   */
  createDawnFrostShimmer(center = { x: 0, y: 0, z: -6 }, radius = 18, count = 120) {
    const geo = new THREE.SphereGeometry(0.045, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe2b8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new InstancedParticleEmitter({
      count,
      geometry: geo,
      material: mat,
      onInit: (p) => {
        p.baseX = center.x + (Math.random() - 0.5) * radius;
        p.baseY = 0.2 + Math.random() * 2.8;
        p.baseZ = center.z + (Math.random() - 0.5) * radius;
        p.driftPhase = Math.random() * Math.PI * 2;
        p.driftSpeed = 0.25 + Math.random() * 0.35;
        p.scale = 0.5 + Math.random() * 0.7;
        p.x = p.baseX;
        p.y = p.baseY;
        p.z = p.baseZ;
        p.maxLife = 6.0 + Math.random() * 4.0;
        p.life = Math.random() * p.maxLife;
      },
      onUpdate: (p, dt, time) => {
        p.life += dt;
        const progress = (p.life % p.maxLife) / p.maxLife;
        p.x = p.baseX + Math.sin(p.driftPhase + time * p.driftSpeed) * 0.6;
        p.y = p.baseY + Math.sin(p.driftPhase * 1.4 + time * 0.5) * 0.3;
        p.z = p.baseZ + Math.cos(p.driftPhase + time * p.driftSpeed) * 0.6;
        const twinkle = Math.sin(time * 3.0 + p.driftPhase) * 0.3 + 0.7;
        p.scale = (0.5 + Math.sin(progress * Math.PI) * 0.7) * twinkle;
      },
    });
  },

  /**
   * High-Speed Storm Clouds & Snow Needle Streams for Prologue (SceneIntroFlight).
   */
  createIntroStormStream(countClouds = 36, countNeedles = 64) {
    const cloudGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    const cloudEmitter = new InstancedParticleEmitter({
      count: countClouds,
      geometry: cloudGeo,
      material: cloudMat,
      onInit: (p) => {
        p.x = (Math.random() - 0.5) * 45;
        p.y = (Math.random() - 0.5) * 25;
        p.z = -100 + Math.random() * 180;
        p.speed = 65 + Math.random() * 35;
        p.resetZ = -90 - Math.random() * 40;
        p.maxZ = 70;
        p.scale = 1.0 + Math.random() * 2.4;
      },
      onUpdate: (p, dt) => {
        p.z += p.speed * dt;
        if (p.z > p.maxZ) {
          p.z = p.resetZ;
          p.x = (Math.random() - 0.5) * 45;
          p.y = (Math.random() - 0.5) * 25;
        }
      },
    });

    const needleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4);
    needleGeo.rotateX(Math.PI / 2);
    const needleMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.45,
    });

    const needleEmitter = new InstancedParticleEmitter({
      count: countNeedles,
      geometry: needleGeo,
      material: needleMat,
      onInit: (p) => {
        p.x = (Math.random() - 0.5) * 32;
        p.y = (Math.random() - 0.5) * 18;
        p.z = -70 + Math.random() * 140;
        p.speed = 90 + Math.random() * 40;
        p.resetZ = -70 - Math.random() * 30;
        p.maxZ = 50;
        p.scale = 1.0;
      },
      onUpdate: (p, dt) => {
        p.z += p.speed * dt;
        if (p.z > p.maxZ) {
          p.z = p.resetZ;
          p.x = (Math.random() - 0.5) * 32;
          p.y = (Math.random() - 0.5) * 18;
        }
      },
    });

    return { cloudEmitter, needleEmitter };
  },
};
