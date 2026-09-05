import * as THREE from 'three';
import { Components } from '../ecs/Components.js';
import { ProceduralModels } from './ProceduralModels.js';

/**
 * MapLoader — Loads and parses grid-based scene maps from JSON asset definitions.
 * Maps ASCII tokens and entity names to 3D models and ECS components.
 * Allows easy editing of scene layouts without code changes.
 */
export class MapLoader {
  constructor() {
    this.modelRegistry = new Map();
    this.registerDefaults();
  }

  /**
   * Register a model generator function for a given name.
   * Enables seamless swapping from procedural models to GLTF or custom assets.
   */
  registerModel(name, factory) {
    this.modelRegistry.set(name, factory);
  }

  registerDefaults() {
    this.registerModel('tree_pine', (def) => ({
      mesh: ProceduralModels.createTree(def.args?.[0] || 1.2),
      collider: def.collider,
    }));

    this.registerModel('tree_pine_small', (def) => ({
      mesh: ProceduralModels.createTree(def.args?.[0] || 0.8),
      collider: def.collider,
    }));

    this.registerModel('rock_boulder', (def) => ({
      mesh: ProceduralModels.createRock(def.args?.[0] || 1.3),
      collider: def.collider,
    }));

    this.registerModel('rock_small', (def) => ({
      mesh: ProceduralModels.createRock(def.args?.[0] || 0.65),
      collider: def.collider,
    }));

    this.registerModel('fuselage_wreckage', (def) => ({
      mesh: ProceduralModels.createPlaneWreckage(),
      collider: def.collider,
    }));

    this.registerModel('engine_turbine', (def) => ({
      mesh: ProceduralModels.createEngineTurbine(),
      collider: def.collider,
    }));

    this.registerModel('emergency_beacon', (def) => ({
      mesh: ProceduralModels.createEmergencyBeacon(),
      collider: def.collider,
      interactable: def.interactable,
    }));

    this.registerModel('first_aid_kit', (def) => ({
      mesh: ProceduralModels.createFirstAidKit(),
      collider: def.collider,
      interactable: def.interactable,
    }));

    this.registerModel('rations_crate', (def) => ({
      mesh: ProceduralModels.createRationBox(),
      collider: def.collider,
      interactable: def.interactable,
    }));

    this.registerModel('flight_documents', (def) => ({
      mesh: ProceduralModels.createFlightDocuments(),
      interactable: def.interactable,
    }));

    this.registerModel('furrow_impact', () => ({
      mesh: ProceduralModels.createImpactFurrow(),
    }));
  }

  /**
   * Parses the grid map JSON and instantiates entities into ECS World and Three.js Scene.
   *
   * @param {Object} mapData - Parsed JSON map definition
   * @param {World} ecsWorld - ECS World
   * @param {THREE.Scene} threeScene - Three.js Scene
   * @returns {Object} Map loading summary { playerSpawn, specialEntities, entities }
   */
  load(mapData, ecsWorld, threeScene) {
    const { gridConfig, legend, grid, modelRegistry: jsonDefs = {} } = mapData;
    const { cols, rows, cellSize = 2.5, originX = 0, originZ = 0 } = gridConfig;

    const result = {
      playerSpawn: { x: 0, y: 0, z: 8 },
      specialEntities: new Map(),
      entities: [],
    };

    // Ground plane covering the grid bounds
    const groundRadius = Math.max(cols, rows) * cellSize * 0.75;
    const ground = ProceduralModels.createClearingGround(groundRadius);
    threeScene.add(ground);

    for (let r = 0; r < grid.length && r < rows; r++) {
      const rowStr = grid[r];
      for (let c = 0; c < rowStr.length && c < cols; c++) {
        const char = rowStr[c];
        const token = legend[char];

        if (!token) continue;

        // Compute world coordinates (centered in cell)
        const wx = originX + c * cellSize + cellSize * 0.5;
        const wz = originZ + r * cellSize + cellSize * 0.5;

        // Player spawn token check
        if (token === 'player_spawn') {
          result.playerSpawn = { x: wx, y: 0, z: wz };
          continue;
        }

        // Get factory from registry or JSON definition
        const factory = this.modelRegistry.get(token);
        const def = jsonDefs[token] || {};

        if (!factory) {
          console.warn(`[MapLoader] No model factory registered for token "${token}" (char: "${char}")`);
          continue;
        }

        const modelData = factory(def);
        if (!modelData || !modelData.mesh) continue;

        const { mesh, collider, interactable } = modelData;

        // Set mesh position
        mesh.position.set(wx, mesh.position.y || 0, wz);
        threeScene.add(mesh);

        // Create ECS Entity
        const entityId = ecsWorld.createEntity();
        ecsWorld.addComponent(entityId, 'Transform', Components.Transform(wx, mesh.position.y || 0, wz));
        ecsWorld.addComponent(entityId, 'MeshComponent', Components.MeshComponent(mesh));

        if (collider) {
          ecsWorld.addComponent(
            entityId,
            'Collider',
            Components.Collider(collider.radius || 0.6, collider.height || 2.0, collider.isStatic !== false)
          );
        }

        if (interactable) {
          ecsWorld.addComponent(
            entityId,
            'Interactable',
            Components.Interactable(interactable.prompt, interactable.actionType, interactable.maxDistance || 3.0)
          );
        }

        result.entities.push({ id: entityId, token, mesh });

        // Save reference if it is a key gameplay item
        if (token === 'emergency_beacon' || token === 'engine_turbine') {
          result.specialEntities.set(token, { id: entityId, mesh, def });
        }
      }
    }

    return result;
  }
}
