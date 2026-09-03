/**
 * Time — Centralized delta time and game clock tracking.
 */
export class Time {
  constructor() {
    this.lastTime = performance.now();
    this.delta = 0;
    this.elapsed = 0;
    this.frameCount = 0;
  }

  update() {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp dt to avoid physics jumps when pausing or switching tabs
    if (dt > 0.1) dt = 0.1;

    this.delta = dt;
    this.elapsed += dt;
    this.frameCount++;
    return this.delta;
  }
}
