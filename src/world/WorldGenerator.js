import * as THREE from 'three';
import { Components } from '../ecs/Components.js';
import { ProceduralModels } from './ProceduralModels.js';

/**
 * WorldGenerator creates the environment, instantiates procedural models,
 * and sets up ECS entities for Phase 0.
 */
export class WorldGenerator {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.fireEntityId = null;
    this.campfireData = null;
    this.activeLogs = new Set();
    this.clearingRadius = 38;
  }

  generate() {
    // 1. Ground Terrain
    const groundMesh = ProceduralModels.createClearingGround(45);
    this.scene.add(groundMesh);

    // 2. Central Campfire Entity (Heat & Light)
    this.createCampfireEntity(0, 0, 0);

    // 3. Freshwater Stream (Hydration source)
    this.createStreamEntity(17, 0, 0);

    // 4. Food Supplies: Berry Bushes & Crash Ration Boxes
    this.createBerryBushes();
    this.createRationCrates();

    // 5. Plane Wreckage Entity (Crash Site landmark)
    this.createPlaneWreckageEntity(-9, 0, -11);

    // 6. Hill & Cave Landmark
    this.createCaveAndHill(-22, 0, 16);

    // 7. Perimeter Dense Forest & Boundary Rocks
    this.createForestPerimeter();

    // 8. Interior Clearing Trees & Rocks (Landmarks)
    this.createInteriorLandmarks();

    // 9. Initial Collectible Logs (scattered throughout the clearing)
    this.spawnInitialLogs(12);
  }

  createCampfireEntity(x, y, z) {
    const campfireData = ProceduralModels.createCampfire();
    campfireData.group.position.set(x, y, z);
    this.scene.add(campfireData.group);
    this.campfireData = campfireData;

    const fireEntity = this.world.createEntity();
    this.fireEntityId = fireEntity;

    this.world.addComponent(fireEntity, 'Transform', Components.Transform(x, y, z));
    // Initial fuel 45/100, burnRate 1.25 (~36s duration without wood replenishment)
    this.world.addComponent(fireEntity, 'Fire', Components.Fire(45, 100, 1.25));
    this.world.addComponent(fireEntity, 'LightSource', Components.LightSource(campfireData.fireLight, 5.5, 32));
    this.world.addComponent(fireEntity, 'TemperatureSource', Components.TemperatureSource(13, 1.0));
    this.world.addComponent(
      fireEntity,
      'Interactable',
      Components.Interactable('Add Wood to Fire', 'fuel_fire', 3.0)
    );
    this.world.addComponent(fireEntity, 'Collider', Components.Collider(1.3, 1.0, true));
    this.world.addComponent(fireEntity, 'MeshComponent', Components.MeshComponent(campfireData.group));

    return fireEntity;
  }

  createPlaneWreckageEntity(x, y, z) {
    const wreckageMesh = ProceduralModels.createPlaneWreckage();
    wreckageMesh.position.set(x, y, z);
    this.scene.add(wreckageMesh);

    const wreckageEntity = this.world.createEntity();
    this.world.addComponent(wreckageEntity, 'Transform', Components.Transform(x, y, z));
    // Collider for the main fuselage block
    this.world.addComponent(wreckageEntity, 'Collider', Components.Collider(3.2, 3.5, true));
    this.world.addComponent(wreckageEntity, 'MeshComponent', Components.MeshComponent(wreckageMesh));
    return wreckageEntity;
  }

  createForestPerimeter() {
    // Dense ring of trees around perimeter (radius 26m to 38m)
    const treeCount = 95;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const dist = 24 + Math.random() * 14;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const scale = 0.9 + Math.random() * 0.6;
      const treeMesh = ProceduralModels.createTree(scale);
      treeMesh.position.set(x, 0, z);
      this.scene.add(treeMesh);

      const treeEntity = this.world.createEntity();
      this.world.addComponent(treeEntity, 'Transform', Components.Transform(x, 0, z));
      this.world.addComponent(treeEntity, 'Collider', Components.Collider(0.6 * scale, 4.0, true));
      this.world.addComponent(treeEntity, 'MeshComponent', Components.MeshComponent(treeMesh));
    }

    // Outer rock ring
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 15;
      const scale = 1.0 + Math.random() * 1.5;
      const rockMesh = ProceduralModels.createRock(scale);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      rockMesh.position.set(x, 0, z);
      this.scene.add(rockMesh);

      const rockEntity = this.world.createEntity();
      this.world.addComponent(rockEntity, 'Transform', Components.Transform(x, 0, z));
      this.world.addComponent(rockEntity, 'Collider', Components.Collider(1.1 * scale, 2.0, true));
      this.world.addComponent(rockEntity, 'MeshComponent', Components.MeshComponent(rockMesh));
    }
  }

  createInteriorLandmarks() {
    // Scattered trees inside clearing (not near center campfire)
    const interiorPositions = [
      { x: 12, z: 8, scale: 1.2 },
      { x: -14, z: 10, scale: 1.0 },
      { x: 15, z: -12, scale: 1.1 },
      { x: 5, z: 18, scale: 0.95 },
      { x: -18, z: -4, scale: 1.3 },
      { x: 8, z: -18, scale: 1.05 },
    ];

    for (const pos of interiorPositions) {
      const tree = ProceduralModels.createTree(pos.scale);
      tree.position.set(pos.x, 0, pos.z);
      this.scene.add(tree);

      const entity = this.world.createEntity();
      this.world.addComponent(entity, 'Transform', Components.Transform(pos.x, 0, pos.z));
      this.world.addComponent(entity, 'Collider', Components.Collider(0.6 * pos.scale, 4.0, true));
      this.world.addComponent(entity, 'MeshComponent', Components.MeshComponent(tree));
    }

    // Interior boulders
    const rockPositions = [
      { x: 7, z: 5, scale: 1.1 },
      { x: -6, z: 7, scale: 0.9 },
      { x: 10, z: -6, scale: 1.4 },
      { x: -4, z: -14, scale: 1.2 },
    ];

    for (const pos of rockPositions) {
      const rock = ProceduralModels.createRock(pos.scale);
      rock.position.set(pos.x, 0, pos.z);
      this.scene.add(rock);

      const entity = this.world.createEntity();
      this.world.addComponent(entity, 'Transform', Components.Transform(pos.x, 0, pos.z));
      this.world.addComponent(entity, 'Collider', Components.Collider(pos.scale * 1.0, 1.8, true));
      this.world.addComponent(entity, 'MeshComponent', Components.MeshComponent(rock));
    }
  }

  createStreamEntity(x, y, z) {
    const streamMesh = ProceduralModels.createStream();
    streamMesh.position.set(x, y, z);
    this.scene.add(streamMesh);

    // Create 3 drinking access points along the stream for player convenience
    const streamZOffsets = [-14, 0, 14];
    for (const zOff of streamZOffsets) {
      const pointEntity = this.world.createEntity();
      this.world.addComponent(pointEntity, 'Transform', Components.Transform(x, 0.1, z + zOff));
      this.world.addComponent(pointEntity, 'WaterSource', Components.WaterSource());
      this.world.addComponent(
        pointEntity,
        'Interactable',
        Components.Interactable('Drink Fresh Water', 'drink_water', 3.6)
      );
      this.world.addComponent(pointEntity, 'MeshComponent', Components.MeshComponent(streamMesh));
    }
  }

  createBerryBushes() {
    const bushPositions = [
      { x: 8, z: 12 },
      { x: -12, z: 8 },
      { x: 14, z: -10 },
      { x: -8, z: -16 },
      { x: 6, z: -14 },
    ];

    for (const pos of bushPositions) {
      const bushMesh = ProceduralModels.createBerryBush();
      bushMesh.position.set(pos.x, 0, pos.z);
      this.scene.add(bushMesh);

      const entity = this.world.createEntity();
      this.world.addComponent(entity, 'Transform', Components.Transform(pos.x, 0, pos.z));
      this.world.addComponent(entity, 'FoodSource', Components.FoodSource('berries', 1));
      this.world.addComponent(
        entity,
        'Interactable',
        Components.Interactable('Forage Berries', 'harvest_food', 2.8)
      );
      this.world.addComponent(entity, 'Collider', Components.Collider(0.7, 1.2, true));
      this.world.addComponent(entity, 'MeshComponent', Components.MeshComponent(bushMesh));
    }
  }

  createRationCrates() {
    const cratePositions = [
      { x: -11.5, z: -8.5, rot: 0.4 },
      { x: -7.5, z: -13.5, rot: -0.6 },
    ];

    for (const pos of cratePositions) {
      const crateMesh = ProceduralModels.createRationBox();
      crateMesh.position.set(pos.x, 0, pos.z);
      crateMesh.rotation.y = pos.rot;
      this.scene.add(crateMesh);

      const entity = this.world.createEntity();
      this.world.addComponent(entity, 'Transform', Components.Transform(pos.x, 0, pos.z, pos.rot));
      this.world.addComponent(entity, 'FoodSource', Components.FoodSource('ration', 1));
      this.world.addComponent(
        entity,
        'Interactable',
        Components.Interactable('Salvage Survival Ration', 'harvest_ration', 2.8)
      );
      this.world.addComponent(entity, 'Collider', Components.Collider(0.6, 0.6, true));
      this.world.addComponent(entity, 'MeshComponent', Components.MeshComponent(crateMesh));
    }
  }

  createCaveAndHill(x, y, z) {
    const caveMesh = ProceduralModels.createHillAndCave();
    caveMesh.position.set(x, y, z);
    caveMesh.rotation.y = Math.PI * 0.7;
    this.scene.add(caveMesh);

    const entity = this.world.createEntity();
    this.world.addComponent(entity, 'Transform', Components.Transform(x, y, z, caveMesh.rotation.y));
    this.world.addComponent(entity, 'Collider', Components.Collider(4.2, 3.5, true));
    this.world.addComponent(entity, 'MeshComponent', Components.MeshComponent(caveMesh));
  }

  spawnInitialLogs(count = 12) {
    for (let i = 0; i < count; i++) {
      this.spawnRandomLog();
    }
  }

  spawnRandomLog(minDist = 6, maxDist = 26) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    return this.spawnLogAt(x, z);
  }

  spawnLogAt(x, z) {
    const logMesh = ProceduralModels.createLog();
    logMesh.position.set(x, 0.16, z);
    logMesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(logMesh);

    const logEntity = this.world.createEntity();
    this.world.addComponent(logEntity, 'Transform', Components.Transform(x, 0.16, z, logMesh.rotation.y));
    this.world.addComponent(
      logEntity,
      'Interactable',
      Components.Interactable('Pick up Log', 'pickup_log', 2.8)
    );
    this.world.addComponent(logEntity, 'Pickup', Components.Pickup('wood', 1));
    this.world.addComponent(logEntity, 'Resource', Components.Resource('wood', 1));
    this.world.addComponent(logEntity, 'MeshComponent', Components.MeshComponent(logMesh));

    this.activeLogs.add(logEntity);
    return logEntity;
  }

  removeLog(logEntityId) {
    const meshComp = this.world.getComponent(logEntityId, 'MeshComponent');
    if (meshComp && meshComp.mesh) {
      this.scene.remove(meshComp.mesh);
    }
    this.world.destroyEntity(logEntityId);
    this.activeLogs.delete(logEntityId);
  }

  getActiveLogCount() {
    return this.activeLogs.size;
  }
}
