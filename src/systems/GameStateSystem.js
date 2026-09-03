/**
 * GameStateSystem — Manages game state (START, PLAYING, WON, LOST),
 * monitors Win/Lose conditions, and executes restarts.
 */
export class GameStateSystem {
  constructor(hud, audioSystem, dayNightSystem, inputSystem, worldGenerator, sessionStats) {
    this.hud = hud;
    this.audioSystem = audioSystem;
    this.dayNightSystem = dayNightSystem;
    this.inputSystem = inputSystem;
    this.worldGenerator = worldGenerator;
    this.sessionStats = sessionStats;

    this.state = 'START'; // 'START' | 'PLAYING' | 'WON' | 'LOST'
    this.setupUIHandlers();
  }

  setupUIHandlers() {
    // Start button
    if (this.hud.startBtn) {
      this.hud.startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    // Restart buttons
    if (this.hud.restartLoseBtn) {
      this.hud.restartLoseBtn.addEventListener('click', () => {
        this.restartGame();
      });
    }
    if (this.hud.restartWinBtn) {
      this.hud.restartWinBtn.addEventListener('click', () => {
        this.restartGame();
      });
    }

    // Resume on pause click
    if (this.hud.pauseScreen) {
      this.hud.pauseScreen.addEventListener('click', () => {
        if (this.state === 'PLAYING') {
          this.inputSystem.requestLock();
          this.hud.hidePauseScreen();
        }
      });
    }

    // Pointer lock events
    document.addEventListener('pointerlockchange', () => {
      if (this.state === 'PLAYING') {
        if (!this.inputSystem.isLocked) {
          this.hud.showPauseScreen();
        } else {
          this.hud.hidePauseScreen();
        }
      }
    });
  }

  startGame() {
    this.audioSystem.init();
    this.audioSystem.resume();
    this.state = 'PLAYING';
    this.hud.hideStartScreen();
    this.inputSystem.requestLock();
  }

  restartGame() {
    this.state = 'PLAYING';
    this.dayNightSystem.reset();

    // Reset stats
    this.sessionStats.timeSurvived = 0;
    this.sessionStats.logsCollected = 0;
    this.sessionStats.logsBurned = 0;

    // Reset player position and inventory
    const players = this.worldGenerator.world.query('PlayerInput', 'Transform', 'Inventory');
    if (players.length > 0) {
      const pId = players[0];
      const transform = this.worldGenerator.world.getComponent(pId, 'Transform');
      const inv = this.worldGenerator.world.getComponent(pId, 'Inventory');
      const input = this.worldGenerator.world.getComponent(pId, 'PlayerInput');

      transform.position.set(0, 0, 4);
      inv.wood = 0;
      inv.food = 0;
      input.cameraYaw = Math.PI; // Face north toward campfire
      input.cameraPitch = 0;

      // Reset survival stats
      const health = this.worldGenerator.world.getComponent(pId, 'Health');
      const hunger = this.worldGenerator.world.getComponent(pId, 'Hunger');
      const thirst = this.worldGenerator.world.getComponent(pId, 'Thirst');
      const warmth = this.worldGenerator.world.getComponent(pId, 'Warmth');
      const stamina = this.worldGenerator.world.getComponent(pId, 'Stamina');

      if (health) health.current = health.max;
      if (hunger) hunger.current = hunger.max;
      if (thirst) thirst.current = thirst.max;
      if (warmth) warmth.current = warmth.max;
      if (stamina) stamina.current = stamina.max;

      this.hud.updateInventory(inv.wood, inv.maxWood, inv.food, inv.maxFood);
      if (health && hunger && thirst && stamina) {
        this.hud.updateSurvivalStats({
          health: health.current,
          maxHealth: health.max,
          hunger: hunger.current,
          maxHunger: hunger.max,
          thirst: thirst.current,
          maxThirst: thirst.max,
          stamina: stamina.current,
          maxStamina: stamina.max,
          takingDamage: false,
        });
      }
      if (warmth) this.hud.updateWarmth(warmth.current, warmth.max, true);
    }

    // Reset Fire
    const fires = this.worldGenerator.world.query('Fire');
    if (fires.length > 0) {
      const fire = this.worldGenerator.world.getComponent(fires[0], 'Fire');
      fire.fuel = 45;
      fire.isLit = true;
      this.hud.updateFire(fire.fuel, fire.maxFuel);
    }
    this.hud.updateTimer(60, 60);

    // Ensure logs are replenished
    if (this.worldGenerator.getActiveLogCount() < 10) {
      this.worldGenerator.spawnInitialLogs(10 - this.worldGenerator.getActiveLogCount());
    }

    this.hud.loseScreen.classList.add('hidden');
    this.hud.winScreen.classList.add('hidden');
    this.hud.showHUD();
    this.inputSystem.requestLock();
  }

  formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  update(world, dt) {
    if (this.state !== 'PLAYING') return;

    this.sessionStats.timeSurvived += dt;

    // 1. Check Player Health <= 0 (Freezing, Dehydration, Starvation)
    const players = world.query('Health', 'Warmth', 'Hunger', 'Thirst');
    if (players.length > 0) {
      const pId = players[0];
      const health = world.getComponent(pId, 'Health');
      const warmth = world.getComponent(pId, 'Warmth');
      const thirst = world.getComponent(pId, 'Thirst');
      const hunger = world.getComponent(pId, 'Hunger');

      if (health && health.current <= 0) {
        this.state = 'LOST';
        this.inputSystem.unlock();
        this.audioSystem.playLose();

        let cause = 'SURVIVAL FAILED';
        if (warmth && warmth.current <= 0) {
          cause = 'FROZE TO DEATH';
        } else if (thirst && thirst.current <= 0) {
          cause = 'DIED OF THIRST';
        } else if (hunger && hunger.current <= 0) {
          cause = 'STARVED TO DEATH';
        }

        this.hud.showLoseScreen(
          {
            timeFormatted: this.formatTime(this.sessionStats.timeSurvived),
            logsCollected: this.sessionStats.logsCollected,
            logsBurned: this.sessionStats.logsBurned,
          },
          cause
        );
        return;
      }
    }

    // 2. Check Lose condition: Fire fuel reaches 0
    const fires = world.query('Fire');
    if (fires.length > 0) {
      const fire = world.getComponent(fires[0], 'Fire');
      if (fire.fuel <= 0) {
        this.state = 'LOST';
        this.inputSystem.unlock();
        this.audioSystem.playLose();
        this.hud.showLoseScreen(
          {
            timeFormatted: this.formatTime(this.sessionStats.timeSurvived),
            logsCollected: this.sessionStats.logsCollected,
            logsBurned: this.sessionStats.logsBurned,
          },
          'THE FIRE WENT OUT'
        );
        return;
      }
    }

    // 3. Check Win condition: Survived until Sunrise with health and fire intact
    if (this.dayNightSystem.isSunriseReached()) {
      this.state = 'WON';
      this.inputSystem.unlock();
      this.audioSystem.playWin();
      this.hud.showWinScreen({
        logsCollected: this.sessionStats.logsCollected,
        logsBurned: this.sessionStats.logsBurned,
      });
    }
  }
}
