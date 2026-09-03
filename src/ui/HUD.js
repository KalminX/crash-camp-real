/**
 * HUD & UI overlay manager for Phase 1 — Stranded.
 * Handles DOM updates for Survival Vitals, Inventory, Fire, and Overlays.
 */
export class HUD {
  constructor() {
    this.hudElement = document.getElementById('hud');
    this.reticle = document.getElementById('reticle');
    this.promptEl = document.getElementById('interaction-prompt');

    // Timer & Objectives
    this.timerEl = document.getElementById('countdown-timer');
    this.progressFillEl = document.getElementById('time-progress-fill');

    // Fire Status
    this.fireFuelFill = document.getElementById('fire-fuel-fill');
    this.firePercentEl = document.getElementById('fire-percent');
    this.fireWarningEl = document.getElementById('fire-warning');

    // Vitals
    this.healthFill = document.getElementById('health-fill');
    this.healthVal = document.getElementById('health-val');
    this.hungerFill = document.getElementById('hunger-fill');
    this.hungerVal = document.getElementById('hunger-val');
    this.thirstFill = document.getElementById('thirst-fill');
    this.thirstVal = document.getElementById('thirst-val');
    this.warmthFill = document.getElementById('warmth-fill');
    this.warmthVal = document.getElementById('warmth-val');
    this.warmthIcon = document.getElementById('warmth-icon');
    this.staminaFill = document.getElementById('stamina-fill');
    this.staminaVal = document.getElementById('stamina-val');

    // Inventory
    this.woodCountEl = document.getElementById('wood-count');
    this.foodCountEl = document.getElementById('food-count');
    this.woodSlots = document.querySelectorAll('#wood-slots .slot');
    this.foodSlots = document.querySelectorAll('#food-slots .slot');

    // Vignettes
    this.damageVignette = document.getElementById('damage-vignette');
    this.freezeVignette = document.getElementById('freeze-vignette');

    // Overlays
    this.startScreen = document.getElementById('start-screen');
    this.loseScreen = document.getElementById('lose-screen');
    this.winScreen = document.getElementById('win-screen');
    this.pauseScreen = document.getElementById('pause-screen');

    this.loseTitle = document.getElementById('lose-title');
    this.loseReason = document.getElementById('lose-reason');

    this.startBtn = document.getElementById('start-btn');
    this.restartLoseBtn = document.getElementById('restart-lose-btn');
    this.restartWinBtn = document.getElementById('restart-win-btn');

    this.loseStatsEl = document.getElementById('lose-stats');
    this.winStatsEl = document.getElementById('win-stats');
    this.toastContainer = document.getElementById('toast-container');
  }

  showHUD() {
    if (this.hudElement) this.hudElement.classList.remove('hidden');
  }

  hideHUD() {
    if (this.hudElement) this.hudElement.classList.add('hidden');
  }

  updateTimer(secondsRemaining, totalSeconds = 60) {
    const mins = Math.floor(Math.max(0, secondsRemaining) / 60);
    const secs = Math.floor(Math.max(0, secondsRemaining) % 60);
    if (this.timerEl) {
      this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (this.progressFillEl) {
      const elapsed = totalSeconds - secondsRemaining;
      const pct = Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
      this.progressFillEl.style.width = `${pct}%`;
    }
  }

  updateFire(fuel, maxFuel = 100) {
    const pct = Math.min(100, Math.max(0, (fuel / maxFuel) * 100));
    if (this.firePercentEl) {
      this.firePercentEl.textContent = `${Math.round(pct)}%`;
    }

    if (this.fireFuelFill) {
      this.fireFuelFill.style.width = `${pct}%`;
      if (pct < 25) {
        this.fireFuelFill.classList.add('low');
        if (this.fireWarningEl) this.fireWarningEl.classList.remove('hidden');
      } else {
        this.fireFuelFill.classList.remove('low');
        if (this.fireWarningEl) this.fireWarningEl.classList.add('hidden');
      }
    }
  }

  updateSurvivalStats({ health, maxHealth, hunger, maxHunger, thirst, maxThirst, stamina, maxStamina, takingDamage }) {
    // Health
    const hpPct = Math.min(100, Math.max(0, (health / maxHealth) * 100));
    if (this.healthFill) this.healthFill.style.width = `${hpPct}%`;
    if (this.healthVal) this.healthVal.textContent = Math.round(health);

    // Hunger
    const hungerPct = Math.min(100, Math.max(0, (hunger / maxHunger) * 100));
    if (this.hungerFill) this.hungerFill.style.width = `${hungerPct}%`;
    if (this.hungerVal) this.hungerVal.textContent = Math.round(hunger);

    // Thirst
    const thirstPct = Math.min(100, Math.max(0, (thirst / maxThirst) * 100));
    if (this.thirstFill) this.thirstFill.style.width = `${thirstPct}%`;
    if (this.thirstVal) this.thirstVal.textContent = Math.round(thirst);

    // Stamina
    const stamPct = Math.min(100, Math.max(0, (stamina / maxStamina) * 100));
    if (this.staminaFill) this.staminaFill.style.width = `${stamPct}%`;
    if (this.staminaVal) this.staminaVal.textContent = Math.round(stamina);

    // Damage vignette
    if (this.damageVignette) {
      if (takingDamage || health < 30) {
        this.damageVignette.classList.remove('hidden');
      } else {
        this.damageVignette.classList.add('hidden');
      }
    }
  }

  updateWarmth(currentWarmth, maxWarmth = 100, isNearHeat = false) {
    const warmthPct = Math.min(100, Math.max(0, (currentWarmth / maxWarmth) * 100));
    if (this.warmthFill) {
      this.warmthFill.style.width = `${warmthPct}%`;
      if (warmthPct < 30) {
        this.warmthFill.classList.add('cold');
      } else {
        this.warmthFill.classList.remove('cold');
      }
    }
    if (this.warmthVal) {
      this.warmthVal.textContent = Math.round(currentWarmth);
    }
    if (this.warmthIcon) {
      this.warmthIcon.textContent = isNearHeat ? '🔥' : (warmthPct < 30 ? '❄️' : '🌡️');
    }

    // Freeze vignette
    if (this.freezeVignette) {
      if (warmthPct < 25) {
        this.freezeVignette.classList.remove('hidden');
      } else {
        this.freezeVignette.classList.add('hidden');
      }
    }
  }

  updateInventory(woodCount = 0, maxWood = 5, foodCount = 0, maxFood = 5) {
    if (this.woodCountEl) {
      this.woodCountEl.textContent = `${woodCount}/${maxWood}`;
    }
    if (this.foodCountEl) {
      this.foodCountEl.textContent = `${foodCount}/${maxFood}`;
    }

    if (this.woodSlots) {
      this.woodSlots.forEach((slot, index) => {
        if (index < woodCount) {
          slot.classList.add('filled');
        } else {
          slot.classList.remove('filled');
        }
      });
    }

    if (this.foodSlots) {
      this.foodSlots.forEach((slot, index) => {
        if (index < foodCount) {
          slot.classList.add('filled');
        } else {
          slot.classList.remove('filled');
        }
      });
    }
  }

  setInteractionPrompt(promptText = null) {
    if (promptText) {
      this.promptEl.textContent = promptText;
      this.promptEl.classList.remove('hidden');
      this.reticle.classList.add('active');
    } else {
      this.promptEl.classList.add('hidden');
      this.reticle.classList.remove('active');
    }
  }

  showToast(message) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2200);
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
    this.loseScreen.classList.add('hidden');
    this.winScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.hideHUD();
  }

  hideStartScreen() {
    this.startScreen.classList.add('hidden');
    this.showHUD();
  }

  showPauseScreen() {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePauseScreen() {
    this.pauseScreen.classList.add('hidden');
  }

  showLoseScreen(stats, cause = 'THE FIRE WENT OUT') {
    this.hideHUD();
    if (this.damageVignette) this.damageVignette.classList.add('hidden');
    if (this.freezeVignette) this.freezeVignette.classList.add('hidden');

    this.loseScreen.classList.remove('hidden');

    if (this.loseTitle) this.loseTitle.textContent = cause;
    if (this.loseReason) {
      if (cause.includes('FREEZING') || cause.includes('COLD')) {
        this.loseReason.textContent = 'Hypothermia claimed you in the sub-zero darkness.';
      } else if (cause.includes('THIRST')) {
        this.loseReason.textContent = 'Severe dehydration overcame you before dawn.';
      } else if (cause.includes('STARVED')) {
        this.loseReason.textContent = 'You starved to death in the wilderness.';
      } else {
        this.loseReason.textContent = 'The campfire died and the freezing dark engulfed the camp.';
      }
    }

    if (this.loseStatsEl) {
      this.loseStatsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Time Survived</span>
          <span class="stat-number">${stats.timeFormatted}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Wood Collected</span>
          <span class="stat-number">${stats.logsCollected}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Fire Stoked</span>
          <span class="stat-number">${stats.logsBurned}x</span>
        </div>
      `;
    }
  }

  showWinScreen(stats) {
    this.hideHUD();
    if (this.damageVignette) this.damageVignette.classList.add('hidden');
    if (this.freezeVignette) this.freezeVignette.classList.add('hidden');

    this.winScreen.classList.remove('hidden');
    if (this.winStatsEl) {
      this.winStatsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Time Survived</span>
          <span class="stat-number">01:00</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Wood Collected</span>
          <span class="stat-number">${stats.logsCollected}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Fire Stoked</span>
          <span class="stat-number">${stats.logsBurned}x</span>
        </div>
      `;
    }
  }
}
