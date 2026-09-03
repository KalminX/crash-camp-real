/**
 * GameLoop — Encapsulates requestAnimationFrame with variable delta time.
 */
export class GameLoop {
  constructor(time, onUpdate, onRender) {
    this.time = time;
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.isRunning = false;
    this.rafId = null;

    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.time.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick() {
    if (!this.isRunning) return;

    const dt = this.time.update();

    if (this.onUpdate) {
      this.onUpdate(dt);
    }
    if (this.onRender) {
      this.onRender();
    }

    this.rafId = requestAnimationFrame(this.tick);
  }
}
