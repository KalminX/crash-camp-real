import * as THREE from 'three';

/**
 * FireSystem — Depletes campfire fuel, controls procedural flame particles,
 * flickers dynamic lighting, and triggers periodic log respawns if needed.
 */
export class FireSystem {
  constructor(hud, audioSystem, worldGenerator) {
    this.hud = hud;
    this.audioSystem = audioSystem;
    this.worldGenerator = worldGenerator;
    this.timeAccumulator = 0;
    this.respawnTimer = 0;
  }

  update(world, dt) {
    const fires = world.query('Fire', 'Transform', 'LightSource');
    const players = world.query('PlayerInput', 'Transform');

    let playerPos = null;
    if (players.length > 0) {
      playerPos = world.getComponent(players[0], 'Transform').position;
    }

    this.timeAccumulator += dt;

    for (const id of fires) {
      const fire = world.getComponent(id, 'Fire');
      const transform = world.getComponent(id, 'Transform');
      const lightSource = world.getComponent(id, 'LightSource');

      // 1. Burn fuel
      if (fire.isLit && fire.fuel > 0) {
        fire.fuel -= fire.burnRate * dt;
        if (fire.fuel <= 0) {
          fire.fuel = 0;
          fire.isLit = false;
        }
      }

      const fuelRatio = Math.max(0, fire.fuel / fire.maxFuel);
      this.hud.updateFire(fire.fuel, fire.maxFuel);

      // 2. Audio update
      let distToFire = 5;
      if (playerPos) {
        distToFire = playerPos.distanceTo(transform.position);
      }
      this.audioSystem.updateFireSound(fuelRatio * 100, distToFire);

      // 3. Dynamic Light Flicker
      if (lightSource && lightSource.light) {
        if (fire.isLit && fuelRatio > 0) {
          // Complex organic flicker with multi-frequency sines
          const flicker =
            Math.sin(this.timeAccumulator * 12.0 + lightSource.flickerOffset) * 0.25 +
            Math.sin(this.timeAccumulator * 23.0) * 0.15 +
            (Math.random() - 0.5) * 0.1;

          const targetIntensity = Math.max(
            0.2,
            lightSource.baseIntensity * (0.3 + 0.7 * fuelRatio) + flicker
          );
          lightSource.light.intensity = targetIntensity;
          lightSource.light.distance = lightSource.baseDistance * (0.4 + 0.6 * fuelRatio);
        } else {
          lightSource.light.intensity = 0;
        }
      }

      // 4. Procedural Flame Particles & Embers
      if (this.worldGenerator.campfireData) {
        const { particles, ember } = this.worldGenerator.campfireData;

        // Ember glow
        if (ember && ember.material) {
          ember.material.emissiveIntensity = fuelRatio > 0 ? 0.3 + 1.6 * fuelRatio : 0.05;
        }

        // Flame particles
        if (particles) {
          const flameScale = fuelRatio > 0 ? 0.3 + 0.7 * fuelRatio : 0;
          particles.forEach((p, idx) => {
            if (flameScale <= 0.01) {
              p.visible = false;
              return;
            }
            p.visible = true;

            const data = p.userData;
            data.life += dt * data.speed;

            if (data.life > data.maxLife) {
              data.life = 0;
              data.angle = Math.random() * Math.PI * 2;
              data.radius = Math.random() * 0.38 * flameScale;
            }

            const progress = data.life / data.maxLife; // 0 to 1
            const height = data.baseY + progress * (1.6 * flameScale);
            const driftRadius = data.radius * (1 - progress * 0.5);

            // Slight wind drift
            const windDriftX = Math.sin(this.timeAccumulator * 1.5 + idx) * 0.08 * progress;

            p.position.set(
              Math.cos(data.angle) * driftRadius + windDriftX,
              height,
              Math.sin(data.angle) * driftRadius
            );

            // Scale shrinks as particle reaches top
            const pScale = (1 - progress * 0.8) * flameScale * 0.85;
            p.scale.set(pScale, pScale * 1.3, pScale);

            // Color shifts from yellow/orange at bottom to red at top
            if (p.material) {
              if (progress < 0.4) {
                p.material.color.setHex(0xffbb22); // yellow core
                p.material.opacity = 0.9;
              } else if (progress < 0.75) {
                p.material.color.setHex(0xff5511); // orange-red
                p.material.opacity = 0.7;
              } else {
                p.material.color.setHex(0xaa2200); // deep ember red / smoke
                p.material.opacity = 0.35 * (1 - progress);
              }
            }
          });
        }
      }
    }

    // 5. Periodic fallen log replenishment (so clearing has plenty of wood in 1-min round)
    this.respawnTimer += dt;
    if (this.respawnTimer > 10) {
      this.respawnTimer = 0;
      if (this.worldGenerator.getActiveLogCount() < 8) {
        this.worldGenerator.spawnRandomLog(10, 28);
      }
    }
  }
}
