/**
 * WorldSeed — Deterministic Seed & Noise Manager for Crash Camp.
 *
 * Provides:
 * 1. Persistent world seed in localStorage ('crash_camp_world_seed').
 * 2. High-speed Mulberry32 seeded pseudo-random number generator (PRNG).
 * 3. Seeded 2D Simplex/Perlin Noise for deterministic terrain heightmaps and biomes.
 */

const STORAGE_KEY = 'crash_camp_world_seed';

export class WorldSeed {
  /**
   * Retrieves the persistent seed from localStorage.
   * If none exists, generates a deterministic 32-bit positive integer and stores it.
   */
  static getSeed() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[WorldSeed] localStorage access failed:', e);
    }

    // Default or fresh seed
    const freshSeed = Math.floor(Math.random() * 0x7fffffff) + 1;
    WorldSeed.setSeed(freshSeed);
    return freshSeed;
  }

  /**
   * Sets and persists a specific seed.
   */
  static setSeed(newSeed) {
    const seedInt = Math.max(1, Math.floor(Math.abs(Number(newSeed)) || 1));
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, String(seedInt));
      }
    } catch (e) {
      console.warn('[WorldSeed] localStorage write failed:', e);
    }
    return seedInt;
  }

  /**
   * Generates a brand new random seed, saves it to localStorage, and returns it.
   */
  static regenerateSeed() {
    const freshSeed = Math.floor(Math.random() * 0x7fffffff) + 1;
    return WorldSeed.setSeed(freshSeed);
  }

  /**
   * Hashes an arbitrary string into a deterministic 32-bit signed integer.
   */
  static hashString(str) {
    if (typeof str !== 'string') return Number(str) | 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash || 123456789;
  }

  /**
   * Mulberry32: Fast, high-quality 32-bit PRNG.
   * Accepts integer or string seeds and returns a function that produces deterministic floats in [0, 1).
   */
  static createPRNG(seed) {
    let s = typeof seed === 'string' ? WorldSeed.hashString(seed) : (seed | 0);
    if (!s) s = 123456789;
    return function mulberry32() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Creates a deterministic 2D Simplex/Perlin noise function initialized by seed.
   * Returns a function noise2D(x, y) that yields continuous values in [-1, 1].
   */
  static createNoise2D(seed = WorldSeed.getSeed()) {
    const rng = WorldSeed.createPRNG(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    // Fisher-Yates shuffle using seeded PRNG
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    // Duplicate permutation table to avoid wrapping bounds
    const perm = new Uint8Array(512);
    const gradP = new Float32Array(512 * 2);

    // 8 Predefined 2D unit gradients
    const grads = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];

    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      const g = grads[perm[i] & 7];
      gradP[i * 2] = g[0];
      gradP[i * 2 + 1] = g[1];
    }

    // Skewing and unskewing factors for 2D Simplex
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    return function noise2D(xin, yin) {
      let n0 = 0;
      let n1 = 0;
      let n2 = 0;

      // Skew the input space to determine which simplex cell we're in
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const X0 = i - t; // Unskew cell origin to (x, y) space
      const Y0 = j - t;
      const x0 = xin - X0; // The x,y distances from the cell origin
      const y0 = yin - Y0;

      // For the 2D case, the simplex shape is an equilateral triangle.
      // Determine which simplex we are in.
      let i1, j1; // Offsets for second (middle) corner of simplex in (i, j) coords
      if (x0 > y0) {
        i1 = 1;
        j1 = 0;
      } else {
        i1 = 0;
        j1 = 1;
      }

      const x1 = x0 - i1 + G2; // Offsets for middle corner in (x, y) unskewed coords
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x, y) unskewed coords
      const y2 = y0 - 1.0 + 2.0 * G2;

      // Work out the hashed gradient indices of the three simplex corners
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = perm[ii + perm[jj]];
      const gi1 = perm[ii + i1 + perm[jj + j1]];
      const gi2 = perm[ii + 1 + perm[jj + 1]];

      // Calculate the contribution from the three corners
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        t0 *= t0;
        n0 = t0 * t0 * (gradP[gi0 * 2] * x0 + gradP[gi0 * 2 + 1] * y0);
      }

      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        t1 *= t1;
        n1 = t1 * t1 * (gradP[gi1 * 2] * x1 + gradP[gi1 * 2 + 1] * y1);
      }

      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        t2 *= t2;
        n2 = t2 * t2 * (gradP[gi2 * 2] * x2 + gradP[gi2 * 2 + 1] * y2);
      }

      // Add contributions from each corner to get the final noise value.
      // The result is scaled to stay within [-1, 1].
      return 70.0 * (n0 + n1 + n2);
    };
  }

  /**
   * Multi-octave fractal noise generator (Fractal Brownian Motion).
   */
  static fbm2D(noiseFn, x, y, octaves = 3, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += noiseFn(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

export default WorldSeed;
