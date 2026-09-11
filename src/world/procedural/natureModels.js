import * as THREE from 'three';
import {
  barkMaterial,
  needleMaterialDark,
  needleMaterialLight,
  logBarkMaterial,
  logCoreMaterial,
} from './materials.js';

/**
 * Procedural Pine Tree with 3-tier Level of Detail (LOD).
 * Automatically switches between detailed mesh, mid-poly, and far silhouette based on camera distance.
 */
export function createTreeLOD(heightScale = 1) {
  const lod = new THREE.LOD();

  const trunkHeight = 2.4 * heightScale;
  const trunkRadius = 0.28 * heightScale;
  const baseRadius = 1.6 * heightScale;
  const layerHeight = 2.0 * heightScale;
  const foliageMat = Math.random() > 0.5 ? needleMaterialDark : needleMaterialLight;

  // --- LEVEL 0 (Near: 0m - 18m) ---
  const groupL0 = new THREE.Group();
  const trunkGeo0 = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6);
  const trunk0 = new THREE.Mesh(trunkGeo0, barkMaterial);
  trunk0.position.y = trunkHeight / 2;
  trunk0.castShadow = true;
  trunk0.receiveShadow = true;
  groupL0.add(trunk0);

  for (let i = 0; i < 3; i++) {
    const radius = baseRadius * (1 - i * 0.25);
    const coneGeo = new THREE.ConeGeometry(radius, layerHeight, 7);
    const cone = new THREE.Mesh(coneGeo, foliageMat);
    cone.position.y = trunkHeight * 0.75 + i * (layerHeight * 0.55);
    cone.rotation.x = (Math.random() - 0.5) * 0.08;
    cone.rotation.z = (Math.random() - 0.5) * 0.08;
    cone.castShadow = true;
    cone.receiveShadow = true;
    groupL0.add(cone);
  }
  lod.addLevel(groupL0, 0);

  // --- LEVEL 1 (Mid: 18m - 36m) ---
  const groupL1 = new THREE.Group();
  const trunkGeo1 = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 5);
  const trunk1 = new THREE.Mesh(trunkGeo1, barkMaterial);
  trunk1.position.y = trunkHeight / 2;
  trunk1.receiveShadow = true;
  groupL1.add(trunk1);

  for (let i = 0; i < 2; i++) {
    const radius = baseRadius * (1 - i * 0.3);
    const coneGeo = new THREE.ConeGeometry(radius, layerHeight * 1.3, 5);
    const cone = new THREE.Mesh(coneGeo, foliageMat);
    cone.position.y = trunkHeight * 0.75 + i * (layerHeight * 0.75);
    cone.receiveShadow = true;
    groupL1.add(cone);
  }
  lod.addLevel(groupL1, 18);

  // --- LEVEL 2 (Far: > 36m) ---
  const groupL2 = new THREE.Group();
  const coneGeo2 = new THREE.ConeGeometry(baseRadius * 0.9, layerHeight * 2.2, 4);
  const cone2 = new THREE.Mesh(coneGeo2, foliageMat);
  cone2.position.y = trunkHeight * 0.75 + layerHeight;
  groupL2.add(cone2);

  const trunkGeo2 = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 4);
  const trunk2 = new THREE.Mesh(trunkGeo2, barkMaterial);
  trunk2.position.y = trunkHeight / 2;
  groupL2.add(trunk2);

  lod.addLevel(groupL2, 36);

  return lod;
}

/**
 * Procedural Craggy Rock with 2-tier Level of Detail (LOD).
 */
export function createRockLOD(scale = 1) {
  const lod = new THREE.LOD();
  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.05, 0.25 + Math.random() * 0.12),
    roughness: 0.95,
    flatShading: true,
  });

  // --- LEVEL 0 (Near: 0m - 15m) ---
  const geo0 = new THREE.DodecahedronGeometry(1.2 * scale, 1);
  const pos = geo0.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const jitter = 0.85 + Math.random() * 0.3;
    pos.setXYZ(i, vx * jitter, vy * jitter * 0.8, vz * jitter);
  }
  geo0.computeVertexNormals();

  const mesh0 = new THREE.Mesh(geo0, rockMat);
  mesh0.position.y = (1.2 * scale) * 0.4;
  mesh0.castShadow = true;
  mesh0.receiveShadow = true;
  lod.addLevel(mesh0, 0);

  // --- LEVEL 1 (Far: > 15m) ---
  const geo1 = new THREE.OctahedronGeometry(1.15 * scale, 0);
  const mesh1 = new THREE.Mesh(geo1, rockMat);
  mesh1.position.y = (1.2 * scale) * 0.4;
  mesh1.receiveShadow = true;
  lod.addLevel(mesh1, 15);

  return lod;
}

/**
 * High-Performance Instanced Pine Forest.
 * Renders dozens or hundreds of pine trees in just 2 draw calls (1 trunk batch + 1 foliage batch).
 */
export function createInstancedPineForest(instances = []) {
  const count = instances.length;
  if (count === 0) return new THREE.Group();

  const group = new THREE.Group();
  group.name = 'instancedPineForest';

  // 1. Shared Trunk InstancedMesh (1 draw call for all trunks; casts ground shadows)
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 2.4, 6);
  trunkGeo.translate(0, 1.2, 0); // Base at y=0
  const trunkInst = new THREE.InstancedMesh(trunkGeo, barkMaterial, count);
  trunkInst.castShadow = true;
  trunkInst.receiveShadow = false;
  trunkInst.matrixAutoUpdate = false;

  // 2. Shared Foliage Cones InstancedMesh (3 cones per tree, 1 draw call for all foliage)
  // Disabled shadow casting/receiving on 1,500+ foliage cones for massive 60 FPS GPU gain
  const coneGeo = new THREE.ConeGeometry(1.6, 2.0, 7);
  coneGeo.translate(0, 1.0, 0); // Base at y=0
  const foliageInst = new THREE.InstancedMesh(coneGeo, needleMaterialDark, count * 3);
  foliageInst.castShadow = false;
  foliageInst.receiveShadow = false;
  foliageInst.matrixAutoUpdate = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const { x, y = 0, z, scale = 1 } = instances[i];

    // Trunk
    dummy.position.set(x, y, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, (i * 1.618) % (Math.PI * 2), 0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    // 3 Foliage Cone layers
    const trunkHeight = 2.4 * scale;
    const layerHeight = 2.0 * scale;
    for (let layer = 0; layer < 3; layer++) {
      const layerScale = scale * (1 - layer * 0.22);
      const coneY = y + trunkHeight * 0.72 + layer * (layerHeight * 0.52);
      dummy.position.set(x, coneY, z);
      dummy.scale.set(layerScale, scale, layerScale);
      dummy.rotation.set(
        Math.sin(i + layer) * 0.04,
        (i * 2.3 + layer * 1.7) % (Math.PI * 2),
        Math.cos(i + layer) * 0.04
      );
      dummy.updateMatrix();
      foliageInst.setMatrixAt(i * 3 + layer, dummy.matrix);
    }
  }

  trunkInst.instanceMatrix.needsUpdate = true;
  foliageInst.instanceMatrix.needsUpdate = true;
  group.matrixAutoUpdate = false;
  group.add(trunkInst);
  group.add(foliageInst);

  return group;
}

/**
 * High-Performance Instanced Rock Field.
 * Renders all rocks in 1 single draw call.
 */
export function createInstancedRockField(instances = []) {
  const count = instances.length;
  if (count === 0) return new THREE.Group();

  const group = new THREE.Group();
  group.name = 'instancedRockField';

  const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const jitter = 0.88 + ((i * 13) % 100) * 0.0024;
    pos.setXYZ(i, vx * jitter, vy * jitter * 0.75, vz * jitter);
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x484643,
    roughness: 0.95,
    flatShading: true,
  });

  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, count);
  rockInst.castShadow = true;
  rockInst.receiveShadow = false;
  rockInst.matrixAutoUpdate = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const { x, y = 0, z, scale = 1 } = instances[i];
    dummy.position.set(x, y + 1.2 * scale * 0.4, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(
      ((i * 17) % 10) * 0.1,
      (i * 2.1) % (Math.PI * 2),
      ((i * 23) % 10) * 0.1
    );
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
  }

  rockInst.instanceMatrix.needsUpdate = true;
  group.matrixAutoUpdate = false;
  group.add(rockInst);

  return group;
}

/**
 * Procedural Pine Tree (Cylinder trunk + stacked cones)
 */
export function createTree(heightScale = 1) {
  const group = new THREE.Group();

  const trunkHeight = 2.4 * heightScale;
  const trunkRadius = 0.28 * heightScale;
  const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6);
  const trunk = new THREE.Mesh(trunkGeo, barkMaterial);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Foliage cones
  const layers = 3;
  const baseRadius = 1.6 * heightScale;
  const layerHeight = 2.0 * heightScale;
  const foliageMat = Math.random() > 0.5 ? needleMaterialDark : needleMaterialLight;

  for (let i = 0; i < layers; i++) {
    const radius = baseRadius * (1 - i * 0.25);
    const coneGeo = new THREE.ConeGeometry(radius, layerHeight, 7);
    const cone = new THREE.Mesh(coneGeo, foliageMat);
    cone.position.y = trunkHeight * 0.75 + i * (layerHeight * 0.55);
    cone.rotation.x = (Math.random() - 0.5) * 0.08;
    cone.rotation.z = (Math.random() - 0.5) * 0.08;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  }

  return group;
}

/**
 * Procedural Craggy Rock (Deformed Dodecahedron)
 */
export function createRock(scale = 1) {
  const geo = new THREE.DodecahedronGeometry(1.2 * scale, 1);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const jitter = 0.85 + Math.random() * 0.3;
    pos.setXYZ(i, vx * jitter, vy * jitter * 0.8, vz * jitter);
  }
  geo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.05, 0.25 + Math.random() * 0.12),
    roughness: 0.95,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, rockMat);
  mesh.position.y = (1.2 * scale) * 0.4;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Procedural Collectible Log (Cylinder bark + end caps)
 */
export function createLog() {
  const group = new THREE.Group();

  const length = 1.1;
  const radius = 0.16;

  // Outer bark cylinder (aligned along X axis)
  const logGeo = new THREE.CylinderGeometry(radius, radius, length, 8, 1, true);
  const barkMesh = new THREE.Mesh(logGeo, logBarkMaterial);
  barkMesh.rotation.z = Math.PI / 2;
  barkMesh.castShadow = true;
  barkMesh.receiveShadow = true;
  group.add(barkMesh);

  // End caps
  const capGeo = new THREE.CircleGeometry(radius, 8);
  const cap1 = new THREE.Mesh(capGeo, logCoreMaterial);
  cap1.rotation.y = -Math.PI / 2;
  cap1.position.x = -length / 2;
  group.add(cap1);

  const cap2 = new THREE.Mesh(capGeo, logCoreMaterial);
  cap2.rotation.y = Math.PI / 2;
  cap2.position.x = length / 2;
  group.add(cap2);

  // Subtle warm highlight ring to make logs discoverable in the dark forest
  const highlightGeo = new THREE.RingGeometry(radius * 1.05, radius * 1.3, 16);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.rotation.x = Math.PI / 2;
  highlight.position.y = 0.02;
  group.add(highlight);

  group.position.y = radius;
  return group;
}

/**
 * Procedural Clearing Ground (Completely flat terrain, guaranteed y = 0)
 */
export function createClearingGround(radius = 65) {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, 2, 2);
  geo.rotateX(-Math.PI / 2);

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x485854,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, groundMat);
  mesh.position.y = 0;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Procedural Freshwater Stream (Curving sparkling water strip with river stones)
 */
export function createStream() {
  const group = new THREE.Group();

  const streamLength = 48;
  const streamWidth = 3.2;
  const waterGeo = new THREE.PlaneGeometry(streamWidth, streamLength, 12, 32);
  waterGeo.rotateX(-Math.PI / 2);

  const pos = waterGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const curveX = Math.sin(z * 0.12) * 2.2;
    pos.setX(i, pos.getX(i) + curveX);
    pos.setY(i, 0.08 + Math.sin(z * 0.3) * 0.03);
  }
  waterGeo.computeVertexNormals();

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 0.3,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // Riverbank stones along edges
  const pebbleCount = 28;
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.8,
    flatShading: true,
  });

  for (let i = 0; i < pebbleCount; i++) {
    const z = -streamLength / 2 + (i / pebbleCount) * streamLength;
    const curveX = Math.sin(z * 0.12) * 2.2;
    const side = (i % 2 === 0 ? 1 : -1) * (streamWidth * 0.52 + Math.random() * 0.3);
    const pebbleGeo = new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.2, 0);
    const pebble = new THREE.Mesh(pebbleGeo, stoneMat);
    pebble.position.set(curveX + side, 0.1, z);
    pebble.castShadow = true;
    pebble.receiveShadow = true;
    group.add(pebble);
  }

  return group;
}

/**
 * Procedural Berry Bush (Dense foliage cluster with ripe harvestable berries)
 */
export function createBerryBush() {
  const group = new THREE.Group();

  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a24,
    roughness: 0.85,
    flatShading: true,
  });

  const lobeOffsets = [
    { x: 0, y: 0.5, z: 0, r: 0.65 },
    { x: 0.35, y: 0.45, z: 0.2, r: 0.5 },
    { x: -0.3, y: 0.4, z: -0.25, r: 0.52 },
    { x: 0.1, y: 0.65, z: -0.2, r: 0.45 },
  ];

  lobeOffsets.forEach((lobe) => {
    const geo = new THREE.DodecahedronGeometry(lobe.r, 1);
    const mesh = new THREE.Mesh(geo, bushMat);
    mesh.position.set(lobe.x, lobe.y, lobe.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  const berryGeo = new THREE.SphereGeometry(0.08, 5, 4);
  const berryMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const berries = [];
  const berryPositions = [
    { x: 0.35, y: 0.7, z: 0.3 },
    { x: -0.3, y: 0.65, z: 0.35 },
    { x: 0.5, y: 0.5, z: -0.1 },
    { x: -0.45, y: 0.52, z: -0.2 },
    { x: 0.15, y: 0.85, z: 0.05 },
    { x: -0.1, y: 0.75, z: -0.35 },
    { x: 0.4, y: 0.4, z: 0.45 },
  ];

  berryPositions.forEach((pos) => {
    const b = new THREE.Mesh(berryGeo, berryMat);
    b.position.set(pos.x, pos.y, pos.z);
    b.castShadow = true;
    group.add(b);
    berries.push(b);
  });

  group.userData.berries = berries;
  return group;
}
