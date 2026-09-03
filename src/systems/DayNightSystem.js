import * as THREE from 'three';

/**
 * DayNightSystem — Progresses world lighting, sky, and fog from deep midnight to sunrise.
 * 300 seconds (5 minutes) total target duration.
 */
export class DayNightSystem {
  constructor(scene, directionalLight, ambientLight, hud, totalDuration = 60) {
    this.scene = scene;
    this.sunLight = directionalLight;
    this.ambientLight = ambientLight;
    this.hud = hud;
    this.totalDuration = totalDuration;
    this.elapsedTime = 0;

    // Sky and fog color gradients (Clear, atmospheric, comfortably visible night)
    this.midnightSky = new THREE.Color(0x18243b);
    this.twilightSky = new THREE.Color(0x352b4d);
    this.dawnSky = new THREE.Color(0x9a4f32);
    this.sunriseSky = new THREE.Color(0xeb904f);

    this.midnightAmbient = new THREE.Color(0x4a5e7d);
    this.sunriseAmbient = new THREE.Color(0xffd5b0);

    this.midnightSun = new THREE.Color(0x84a4d6);
    this.sunriseSun = new THREE.Color(0xfff0cc);
  }

  reset() {
    this.elapsedTime = 0;
  }

  update(world, dt) {
    this.elapsedTime += dt;
    const progress = Math.min(1.0, this.elapsedTime / this.totalDuration); // 0.0 to 1.0

    // Update HUD timer
    const remaining = Math.max(0, this.totalDuration - this.elapsedTime);
    this.hud.updateTimer(remaining, this.totalDuration);

    // Color and light interpolations across 3 stages
    let skyColor = new THREE.Color();
    let ambientColor = new THREE.Color();
    let sunColor = new THREE.Color();
    let sunIntensity = 0.75;
    let ambientIntensity = 0.55;
    let fogFar = 80;

    if (progress < 0.6) {
      // Stage 1: Moonlit Night (0% to 60% = 0 to 3 mins)
      const subT = progress / 0.6;
      skyColor.copy(this.midnightSky).lerp(this.twilightSky, subT);
      ambientColor.copy(this.midnightAmbient);
      sunColor.copy(this.midnightSun);
      sunIntensity = 0.75 + subT * 0.15;
      ambientIntensity = 0.55 + subT * 0.15;
      fogFar = 80 + subT * 10;
    } else if (progress < 0.85) {
      // Stage 2: Twilight / Pre-dawn (60% to 85% = 3 to 4.25 mins)
      const subT = (progress - 0.6) / 0.25;
      skyColor.copy(this.twilightSky).lerp(this.dawnSky, subT);
      ambientColor.copy(this.midnightAmbient).lerp(this.sunriseAmbient, subT * 0.5);
      sunColor.copy(this.midnightSun).lerp(this.sunriseSun, subT);
      sunIntensity = 0.9 + subT * 0.35;
      ambientIntensity = 0.7 + subT * 0.25;
      fogFar = 90 + subT * 15;
    } else {
      // Stage 3: Sunrise / Golden Dawn (85% to 100% = 4.25 to 5 mins)
      const subT = (progress - 0.85) / 0.15;
      skyColor.copy(this.dawnSky).lerp(this.sunriseSky, subT);
      ambientColor.copy(this.midnightAmbient).lerp(this.sunriseAmbient, 0.5 + subT * 0.5);
      sunColor.copy(this.sunriseSun);
      sunIntensity = 1.25 + subT * 0.55; // Bright golden morning light
      ambientIntensity = 0.95 + subT * 0.35;
      fogFar = 105 + subT * 25;
    }

    // Apply to scene
    if (this.scene.background) {
      this.scene.background.copy(skyColor);
    }
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
      this.scene.fog.far = fogFar;
    }

    if (this.ambientLight) {
      this.ambientLight.color.copy(ambientColor);
      this.ambientLight.intensity = ambientIntensity;
    }

    if (this.sunLight) {
      this.sunLight.color.copy(sunColor);
      this.sunLight.intensity = sunIntensity;

      // Sun rises from horizon in the east (X positive)
      const sunAngle = progress * Math.PI * 0.55; // 0 to ~100 deg elevation
      this.sunLight.position.set(
        Math.cos(sunAngle) * 35,
        Math.max(4, Math.sin(sunAngle) * 45),
        -25
      );
    }
  }

  isSunriseReached() {
    return this.elapsedTime >= this.totalDuration;
  }
}
