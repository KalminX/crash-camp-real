/**
 * SurvivalSystem — Manages Hunger, Thirst, Stamina, and Health regeneration/decay.
 */
export class SurvivalSystem {
  constructor(hud, audioSystem, sessionStats) {
    this.hud = hud;
    this.audioSystem = audioSystem;
    this.sessionStats = sessionStats;
    this.damageAlertCooldown = 0;
  }

  update(world, dt) {
    const players = world.query('PlayerInput', 'Health', 'Hunger', 'Thirst', 'Warmth', 'Stamina');
    if (players.length === 0) return;

    const playerId = players[0];
    const input = world.getComponent(playerId, 'PlayerInput');
    const health = world.getComponent(playerId, 'Health');
    const hunger = world.getComponent(playerId, 'Hunger');
    const thirst = world.getComponent(playerId, 'Thirst');
    const warmth = world.getComponent(playerId, 'Warmth');
    const stamina = world.getComponent(playerId, 'Stamina');

    // 1. Stamina & Sprinting
    const isTryingToSprint = input.sprint && (input.forward || input.backward || input.left || input.right);

    if (isTryingToSprint && stamina.current > 2) {
      stamina.current = Math.max(0, stamina.current - stamina.drainRate * dt);
    } else {
      if (stamina.current < stamina.max) {
        stamina.current = Math.min(stamina.max, stamina.current + stamina.regenRate * dt);
      }
      if (stamina.current < 15) {
        // Exhausted: prevent sprinting until recovered slightly
        input.sprint = false;
      }
    }

    // 2. Hunger decay
    hunger.current = Math.max(0, hunger.current - hunger.decayRate * dt);

    // 3. Thirst decay (Sprinting causes accelerated dehydration)
    const thirstMultiplier = isTryingToSprint ? 1.6 : 1.0;
    thirst.current = Math.max(0, thirst.current - thirst.decayRate * thirstMultiplier * dt);

    // 4. Damage & Health Regeneration
    let takingDamage = false;

    // Starvation
    if (hunger.current <= 0) {
      health.current = Math.max(0, health.current - 2.2 * dt);
      takingDamage = true;
    }

    // Dehydration
    if (thirst.current <= 0) {
      health.current = Math.max(0, health.current - 3.2 * dt);
      takingDamage = true;
    }

    // Hypothermia
    if (warmth.current <= 0) {
      takingDamage = true;
    }

    // Well-fed regeneration
    if (!takingDamage && hunger.current > 65 && thirst.current > 65 && warmth.current > 60) {
      if (health.current < health.max) {
        health.current = Math.min(health.max, health.current + 1.6 * dt);
      }
    }

    // Audio cue when taking critical damage
    if (takingDamage) {
      this.damageAlertCooldown += dt;
      if (this.damageAlertCooldown > 2.5) {
        this.damageAlertCooldown = 0;
        this.audioSystem.playHurt();
      }
    } else {
      this.damageAlertCooldown = 1.8;
    }

    // 5. Update HUD Vitals
    this.hud.updateSurvivalStats({
      health: health.current,
      maxHealth: health.max,
      hunger: hunger.current,
      maxHunger: hunger.max,
      thirst: thirst.current,
      maxThirst: thirst.max,
      stamina: stamina.current,
      maxStamina: stamina.max,
      takingDamage,
    });
  }
}
