/**
 * Time — Centralized delta time and game clock tracking.
 */
export class Time {
  constructor() {
    this.lastTime = performance.now();
    this.delta = 0;
    this.elapsed = 0;
    this.frameCount = 0;

    // Real-time FPS metrics
    this.fps = 60;
    this.frameTimeMs = 16.6;
    this._fpsFrameCounter = 0;
    this._fpsTimeAccumulator = 0;
    this._fpsSampleInterval = 0.2; // Sample every 200ms for smooth, responsive metrics
  }

  update() {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp dt to avoid physics jumps when pausing or switching tabs
    let dt = rawDt;
    if (dt > 0.1) dt = 0.1;

    this.delta = dt;
    this.elapsed += dt;
    this.frameCount++;

    // Calculate real-time FPS & frame duration
    this._fpsFrameCounter++;
    this._fpsTimeAccumulator += rawDt;

    if (this._fpsTimeAccumulator >= this._fpsSampleInterval) {
      this.fps = Math.round(this._fpsFrameCounter / this._fpsTimeAccumulator);
      this.frameTimeMs = parseFloat(((this._fpsTimeAccumulator / this._fpsFrameCounter) * 1000).toFixed(1));
      this._fpsFrameCounter = 0;
      this._fpsTimeAccumulator = 0;
    }

    return this.delta;
  }
}
