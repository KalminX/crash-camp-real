/**
 * TemperatureSystem — Simulates environmental cold and campfire warmth.
 * Manages player warmth and applies freezing damage during hypothermia.
 */
export class TemperatureSystem {
  constructor(hud, audioSystem) {
    this.hud = hud;
    this.audioSystem = audioSystem;
    this.shiverCooldown = 0;
  }

  update(world, dt) {
    const players = world.query('PlayerInput', 'Transform', 'Warmth', 'Health');
    if (players.length === 0) return;

    const playerId = players[0];
    const pTransform = world.getComponent(playerId, 'Transform');
    const warmth = world.getComponent(playerId, 'Warmth');
    const health = world.getComponent(playerId, 'Health');

    // Check distance to active heat sources
    const heatSources = world.query('TemperatureSource', 'Fire', 'Transform');
    let isNearHeat = false;

    for (const sId of heatSources) {
      const sTransform = world.getComponent(sId, 'Transform');
      const tempSource = world.getComponent(sId, 'TemperatureSource');
      const fire = world.getComponent(sId, 'Fire');

      if (fire.isLit && fire.fuel > 0) {
        const dist = pTransform.position.distanceTo(sTransform.position);
        if (dist <= tempSource.radius) {
          isNearHeat = true;
          break;
        }
      }
    }

    if (isNearHeat) {
      // Regain warmth rapidly near fire
      warmth.current = Math.min(warmth.max, warmth.current + 8.0 * dt);
    } else {
      // Freeze in the cold wilderness
      warmth.current = Math.max(0, warmth.current - warmth.decayRate * dt);
    }

    // Hypothermia damage
    if (warmth.current <= 0) {
      health.current = Math.max(0, health.current - 3.8 * dt);

      this.shiverCooldown += dt;
      if (this.shiverCooldown > 3.0) {
        this.shiverCooldown = 0;
        this.audioSystem.playColdShiver();
        this.hud.showToast('❄️ Freezing cold! Return to the campfire!');
      }
    } else {
      this.shiverCooldown = 2.0;
    }

    // Update HUD
    this.hud.updateWarmth(warmth.current, warmth.max, isNearHeat);
  }
}
