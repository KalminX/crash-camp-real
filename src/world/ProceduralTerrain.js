import * as THREE from 'three';
import { WorldSeed } from './WorldSeed.js';
import { ProceduralModels } from './ProceduralModels.js';
import { Components } from '../ecs/Components.js';
import { CrashSiteHeights } from './CrashSiteHeights.js';

/**
 * ProceduralTerrain — 220m x 220m Themed Landscape with Biomes & Edge Interpolation.
 *
 * Supported Themes:
 * 1. 'the-crash' (Act 1 Scene 1):
 *    - Core leveled at d < 27.5m for authentic crash_site.glb.
 *    - Seamless Hermite blend into alpine ridges, pine forests, and frozen hollows.
 *    - Matching authentic grass and soil vertex palette.
 * 2. 'pristine-crash-valley' (Act 0 Scene 0 Intro Flight):
 *    - Exact topological twin of Scene 1, but PRISTINE without the crash site.
 *    - Unbroken snow and standing pine trees for the aircraft to crash into.
 * 3. 'the-last-fire' (Act 1 Scene 2):
 *    - Sheltered midnight blizzard bowl with central campfire clearing.
 *    - Deep midnight snowdrifts, protective pine groves, and abundant collectible firewood logs.
 * 4. 'morning-after' (Act 2 Scene 3):
 *    - Golden dawn river valley with a winding frozen creek.
 *    - Shimmering frost peaks and clear banks for the survivor tracks leading North.
 */
export class ProceduralTerrain {
  constructor(options = {}) {
    this.seed = options.seed || WorldSeed.getSeed();
    this.theme = options.theme || 'the-crash';
    this.size = options.size || 220;
    this.segments = options.segments || 88;

    // Seeded noise generators
    const baseSeed = typeof this.seed === 'string' ? WorldSeed.hashString(this.seed) : (this.seed | 0);
    this.noise1 = WorldSeed.createNoise2D(baseSeed);
    this.noise2 = WorldSeed.createNoise2D(baseSeed + 1013);
    this.noise3 = WorldSeed.createNoise2D(baseSeed + 2039);
    this.biomeNoise = WorldSeed.createNoise2D(baseSeed + 3067);
    this.rng = WorldSeed.createPRNG(baseSeed + 4099);
  }

  /**
   * Computes elevation at any (x, z) coordinate according to the active scene theme.
   */
  getHeight(x, z) {
    if (this.theme === 'the-crash') {
      const d = Math.max(Math.abs(x), Math.abs(z));

      // Zone 1: Inside authored crash_site.glb footprint (d <= 27.5m)
      if (d <= 27.5) {
        const crashH = CrashSiteHeights.getHeight(x, z);
        const authH = crashH !== null ? crashH : 0.0;
        // In the procedural mesh, we set this slightly below (-0.12m)
        // so the procedural backing geometry doesn't z-fight with Terrain_CrashSite
        return authH - 0.12;
      }

      // Zone 2: Hermite blend zone (27.5m to 38.0m)
      const edgeX = Math.min(27.5, Math.max(-27.5, x));
      const edgeZ = Math.min(27.5, Math.max(-27.5, z));
      const edgeH = CrashSiteHeights.getHeight(edgeX, edgeZ) || 0.0;

      // Fractal Perlin noise
      const n1 = this.noise1(x * 0.012, z * 0.012) * 8.5;
      const n2 = this.noise2(x * 0.032 + 4.1, z * 0.032 - 2.7) * 3.8;
      const n3 = this.noise3(x * 0.078 - 1.5, z * 0.078 + 3.2) * 1.2;
      const rawHeight = Math.max(-0.1, n1 + n2 + n3);

      if (d <= 38.0) {
        const t = (d - 27.5) / 10.5;
        const w = t * t * (3.0 - 2.0 * t);
        return edgeH * (1.0 - w) + rawHeight * w;
      }
      return rawHeight;
    }

    if (this.theme === 'pristine-crash-valley') {
      const d = Math.max(Math.abs(x), Math.abs(z));

      // Continuous pristine clearing with subtle natural slope (NO trench or depression)
      const n1 = this.noise1(x * 0.012, z * 0.012) * 8.5;
      const n2 = this.noise2(x * 0.032 + 4.1, z * 0.032 - 2.7) * 3.8;
      const n3 = this.noise3(x * 0.078 - 1.5, z * 0.078 + 3.2) * 1.2;
      const rawHeight = Math.max(-0.1, n1 + n2 + n3);

      if (d <= 27.5) {
        // Pristine flat clearing
        return 0.0;
      }
      if (d <= 38.0) {
        const t = (d - 27.5) / 10.5;
        const w = t * t * (3.0 - 2.0 * t);
        return rawHeight * w;
      }
      return rawHeight;
    }

    if (this.theme === 'the-last-fire') {
      // Sheltered mountain bowl around campfire at (0, 0)
      const d = Math.hypot(x, z);

      if (d < 9.0) {
        // Flat campfire hearth
        return 0.0;
      }

      // Surrounding sheltered bowl
      const n1 = this.noise1(x * 0.014, z * 0.014) * 6.5;
      const n2 = this.noise2(x * 0.036 + 2.4, z * 0.036 - 1.8) * 3.0;
      const rawHeight = Math.max(0.1, n1 + n2);

      if (d <= 24.0) {
        const t = (d - 9.0) / 15.0;
        const w = t * t * (3.0 - 2.0 * t);
        return rawHeight * w + Math.sin(t * Math.PI) * 0.8;
      }
      return rawHeight;
    }

    if (this.theme === 'morning-after') {
      // Dawn river valley: frozen creek bed cutting south to north
      const creekCenter = Math.sin(z * 0.04) * 6.5;
      const distFromCreek = Math.abs(x - creekCenter);

      const n1 = this.noise1(x * 0.015 + 1.2, z * 0.015 - 3.4) * 6.2;
      const n2 = this.noise2(x * 0.042 - 2.1, z * 0.042 + 1.6) * 2.6;
      let rawHeight = Math.max(0.1, n1 + n2);

      if (distFromCreek < 4.8) {
        // Depressed frozen creek channel
        const creekFactor = distFromCreek / 4.8;
        return -0.65 + creekFactor * (rawHeight * 0.4 + 0.65);
      }
      return rawHeight;
    }

    return 0.0;
  }

  /**
   * Computes the exact ground surface elevation at (x, z).
   */
  getWalkableHeight(x, z) {
    if (this.theme === 'the-crash' || this.theme === 'morning-after') {
      const d = Math.max(Math.abs(x), Math.abs(z));
      if (d <= 27.5) {
        const crashH = CrashSiteHeights.getHeight(x, z);
        if (crashH !== null) {
          return crashH;
        }
      }
      if (d <= 36.0) {
        const edgeX = Math.min(27.5, Math.max(-27.5, x));
        const edgeZ = Math.min(27.5, Math.max(-27.5, z));
        const edgeH = CrashSiteHeights.getHeight(edgeX, edgeZ) || 0.0;
        const outerH = this.getHeight(x, z);
        const t = (d - 27.5) / 8.5;
        const w = t * t * (3.0 - 2.0 * t);
        return edgeH * (1.0 - w) + outerH * w;
      }
    }
    return this.getHeight(x, z);
  }

  /**
   * Evaluates the walkable surface elevation for character navigation.
   * Samples the foot footprint (center and cardinal offsets) to ensure the character
   * accurately climbs slopes and ridges without boots ever sinking into ascending inclines.
   */
  getWalkableSurfaceElevation(x, z) {
    const h0 = this.getWalkableHeight(x, z);
    const h1 = this.getWalkableHeight(x + 0.14, z);
    const h2 = this.getWalkableHeight(x - 0.14, z);
    const h3 = this.getWalkableHeight(x, z + 0.14);
    const h4 = this.getWalkableHeight(x, z - 0.14);
    return Math.max(h0, h1, h2, h3, h4);
  }

  /**
   * Evaluates biome at (x, z) coordinate.
   */
  getBiome(x, z) {
    const d = Math.max(Math.abs(x), Math.abs(z));

    if (this.theme === 'the-crash') {
      if (d < 28.0) return 'crash_trench';
      const h = this.getHeight(x, z);
      if (h > 4.2) return 'rocky_crags';
      if (h < 0.5 && d > 32.0) return 'frozen_hollow';
      const b = this.biomeNoise(x * 0.018, z * 0.018);
      if (b > -0.15 && h > 0.6) return 'pine_ridge';
      return 'alpine_slope';
    }

    if (this.theme === 'pristine-crash-valley') {
      if (d < 20.0) return 'pristine_clearing';
      const h = this.getHeight(x, z);
      if (h > 4.2) return 'rocky_crags';
      const b = this.biomeNoise(x * 0.018, z * 0.018);
      if (b > -0.2) return 'pine_ridge';
      return 'alpine_slope';
    }

    if (this.theme === 'the-last-fire') {
      const dist = Math.hypot(x, z);
      if (dist < 10.0) return 'campfire_hearth';
      const h = this.getHeight(x, z);
      if (h > 4.5) return 'blizzard_ridge';
      if (h < 1.0 && dist > 18.0) return 'frozen_hollow';
      return 'sheltered_pines';
    }

    if (this.theme === 'morning-after') {
      const creekCenter = Math.sin(z * 0.04) * 6.5;
      if (Math.abs(x - creekCenter) < 5.0) return 'frozen_creek';
      const h = this.getHeight(x, z);
      if (h > 4.5) return 'dawn_crags';
      return 'dawn_pines';
    }

    return 'alpine_slope';
  }

  /**
   * Generates the complete themed terrain mesh and populates all instanced props.
   */
  build(ecsWorld = null) {
    const group = new THREE.Group();
    group.name = `proceduralTerrain_${this.theme}`;

    // 1. Create Subdivided Plane Geometry
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const count = posAttr.count;

    // Allocate vertex color buffer
    const colAttr = new Float32Array(count * 3);
    const tempCol = new THREE.Color();

    // Themed color palettes
    // 'the-crash' & 'pristine-crash-valley': Authentic clearing grass, soil, granite
    const colCrashGrass = new THREE.Color(0.22, 0.35, 0.15); // Exact crash_site.glb edge grass
    const colCrashSoil = new THREE.Color(0.28, 0.22, 0.14);
    const colCrashRock = new THREE.Color(0.42, 0.40, 0.36);
    const colCrashSnow = new THREE.Color(0.85, 0.88, 0.92);

    // 'the-last-fire': Deep midnight forest & cold moonlit snowdrifts
    const colFireClearing = new THREE.Color(0.18, 0.22, 0.18);
    const colFireSnow = new THREE.Color(0.24, 0.33, 0.45);
    const colFirePine = new THREE.Color(0.13, 0.20, 0.14);
    const colFireRock = new THREE.Color(0.18, 0.21, 0.26);

    // 'morning-after': Warm golden dawn-tinted snow & rose-gold rock
    const colDawnSnow = new THREE.Color(0.74, 0.68, 0.62);
    const colDawnCreek = new THREE.Color(0.48, 0.60, 0.72);
    const colDawnPine = new THREE.Color(0.16, 0.24, 0.16);
    const colDawnRock = new THREE.Color(0.38, 0.32, 0.28);

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.getHeight(x, z);
      posAttr.setY(i, y);

      // Color computation based on theme and altitude/biome
      if (this.theme === 'the-crash') {
        const d = Math.max(Math.abs(x), Math.abs(z));
        if (d < 27.5) {
          const blend = Math.min(1.0, d / 27.5);
          tempCol.copy(colCrashGrass).lerp(colCrashGrass, blend);
        } else if (y > 4.5) {
          const snowBlend = Math.min(1.0, (y - 4.5) / 4.0);
          tempCol.copy(colCrashRock).lerp(colCrashSnow, snowBlend);
        } else if (y > 1.8) {
          const slopeBlend = Math.min(1.0, (y - 1.8) / 2.7);
          tempCol.copy(colCrashGrass).lerp(colCrashRock, slopeBlend);
        } else {
          const soilBlend = Math.min(1.0, Math.abs(this.noise3(x * 0.05, z * 0.05)));
          tempCol.copy(colCrashGrass).lerp(colCrashSoil, soilBlend * 0.4);
        }
      } else if (this.theme === 'pristine-crash-valley') {
        const d = Math.max(Math.abs(x), Math.abs(z));
        if (d < 22.0) {
          // Untouched alpine snow clearing before the crash occurred
          const snowRipple = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.03;
          tempCol.copy(colCrashSnow).offsetHSL(0, 0, snowRipple);
        } else if (y > 4.0) {
          const snowBlend = Math.min(1.0, (y - 4.0) / 4.0);
          tempCol.copy(colCrashRock).lerp(colCrashSnow, snowBlend);
        } else {
          const rockBlend = Math.min(1.0, (d - 22.0) / 12.0);
          tempCol.copy(colCrashSnow).lerp(colCrashRock, rockBlend * 0.4);
        }
      } else if (this.theme === 'the-last-fire') {
        const dist = Math.hypot(x, z);
        if (dist < 12.0) {
          tempCol.copy(colFireClearing);
        } else if (y > 4.0) {
          tempCol.copy(colFireRock);
        } else {
          const snowBlend = Math.min(1.0, dist / 40.0);
          tempCol.copy(colFirePine).lerp(colFireSnow, snowBlend);
        }
      } else if (this.theme === 'morning-after') {
        const creekCenter = Math.sin(z * 0.04) * 6.5;
        const distFromCreek = Math.abs(x - creekCenter);
        if (distFromCreek < 4.2) {
          tempCol.copy(colDawnCreek);
        } else if (y > 4.2) {
          tempCol.copy(colDawnRock);
        } else {
          const slopeBlend = Math.min(1.0, (distFromCreek - 4.2) / 25.0);
          tempCol.copy(colDawnSnow).lerp(colDawnPine, slopeBlend * 0.4);
        }
      }

      colAttr[i * 3] = tempCol.r;
      colAttr[i * 3 + 1] = tempCol.g;
      colAttr[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colAttr, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
    });

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.name = `terrainMesh_${this.theme}`;
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 2. Procedural Prop Scatter (Pine Trees, Boulders, Logs)
    const pineInstances = [];
    const rockInstances = [];
    const firewoodSpawns = [];
    const colliders = [];

    const propStep = 6.0;
    const halfBound = this.size * 0.46;

    for (let gx = -halfBound; gx <= halfBound; gx += propStep) {
      for (let gz = -halfBound; gz <= halfBound; gz += propStep) {
        const jx = gx + (this.rng() - 0.5) * propStep * 0.85;
        const jz = gz + (this.rng() - 0.5) * propStep * 0.85;
        const d = Math.max(Math.abs(jx), Math.abs(jz));
        const dist = Math.hypot(jx, jz);

        const y = this.getHeight(jx, jz);
        const biome = this.getBiome(jx, jz);

        // Scene-specific exclusions
        if (this.theme === 'the-crash' && d < 28.5) continue;
        if (this.theme === 'the-last-fire' && dist < 11.0) continue;
        if (this.theme === 'morning-after') {
          const creekCenter = Math.sin(jz * 0.04) * 6.5;
          if (Math.abs(jx - creekCenter) < 4.5) continue; // Keep creek channel open
          if (dist < 12.0) continue; // Keep crash wreckage site open
        }

        if ((biome.includes('pine') || biome.includes('pines')) && this.rng() > 0.40) {
          const scale = 0.85 + this.rng() * 0.55;
          pineInstances.push({ x: jx, y, z: jz, scale });

          if (d <= 95.0) {
            colliders.push({
              x: jx,
              y: y + 1.2,
              z: jz,
              radius: 0.32 * scale,
              height: 3.5,
              type: 'tree',
            });
          }
        } else if (biome.includes('crags') || biome.includes('ridge')) {
          if (this.rng() > 0.45) {
            const scale = 0.75 + this.rng() * 0.9;
            rockInstances.push({ x: jx, y: y + 0.3, z: jz, scale });

            if (d <= 95.0) {
              colliders.push({
                x: jx,
                y,
                z: jz,
                radius: 0.75 * scale,
                height: 1.8,
                type: 'boulder',
              });
            }
          }
        } else if (biome.includes('hollow') || this.theme === 'the-last-fire') {
          // Collectible fallen firewood logs
          const maxLogs = this.theme === 'the-last-fire' ? 10 : 6;
          if (firewoodSpawns.length < maxLogs && this.rng() > 0.60 && d <= 70.0 && dist > 9.0) {
            firewoodSpawns.push({ x: jx, y: y + 0.1, z: jz });
          }
        }
      }
    }

    // 3. Batch Pine Forest
    const pineForest = ProceduralModels.createInstancedPineForest(pineInstances);
    group.add(pineForest);

    // 4. Batch Rock Field
    const rockField = ProceduralModels.createInstancedRockField(rockInstances);
    group.add(rockField);

    // 5. Firewood Entities (ECS Collectibles)
    const firewoodEntities = [];
    if (ecsWorld) {
      firewoodSpawns.forEach((pos, idx) => {
        const logEntity = ecsWorld.createEntity();
        const logMesh = ProceduralModels.createLog();
        logMesh.position.set(pos.x, pos.y, pos.z);
        logMesh.rotation.y = (idx * 1.8) % (Math.PI * 2);
        group.add(logMesh);

        ecsWorld.addComponent(logEntity, 'Transform', Components.Transform(pos.x, pos.y, pos.z));
        ecsWorld.addComponent(logEntity, 'MeshComponent', Components.MeshComponent(logMesh));
        ecsWorld.addComponent(logEntity, 'Collider', Components.Collider(0.6, 0.4, true));
        ecsWorld.addComponent(
          logEntity,
          'Interactable',
          Components.Interactable('Salvage Firewood (+1 Wood)', 'salvage_wood', 2.4)
        );

        firewoodEntities.push({ entityId: logEntity, mesh: logMesh, position: pos });
      });
    }

    return {
      group,
      terrainMesh,
      pineForest,
      rockField,
      colliders,
      firewoodEntities,
      pineCount: pineInstances.length,
      rockCount: rockInstances.length,
      getHeight: (x, z) => this.getHeight(x, z),
      getWalkableHeight: (x, z) => this.getWalkableHeight(x, z),
      getWalkableSurfaceElevation: (x, z) => this.getWalkableSurfaceElevation(x, z),
      getBiome: (x, z) => this.getBiome(x, z),
    };
  }
}

export default ProceduralTerrain;
