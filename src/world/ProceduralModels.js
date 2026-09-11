/**
 * ProceduralModels — Aggregator for procedural 3D model factories.
 * Modularized into domain-specific modules under src/world/procedural/.
 * Provides 100% backward compatibility for all existing imports across the project.
 */

import * as materials from './procedural/materials.js';
import * as nature from './procedural/natureModels.js';
import * as survival from './procedural/survivalModels.js';
import * as aircraft from './procedural/aircraftModels.js';
import * as character from './procedural/characterModels.js';

// Re-export individual modules for modular imports
export { materials, nature, survival, aircraft, character };

// Re-export all model factories directly
export * from './procedural/materials.js';
export * from './procedural/natureModels.js';
export * from './procedural/survivalModels.js';
export * from './procedural/aircraftModels.js';
export * from './procedural/characterModels.js';

// Aggregated ProceduralModels namespace for backward compatibility
export const ProceduralModels = {
  ...materials,
  ...nature,
  ...survival,
  ...aircraft,
  ...character,
};

export default ProceduralModels;
