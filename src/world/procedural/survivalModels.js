import * as THREE from 'three';
import { charcoalMaterial } from './materials.js';

/**
 * Procedural Campfire (Stone ring + crossed charcoal logs + glowing embers + flame particle system)
 */
export function createCampfire() {
  const group = new THREE.Group();

  // 1. Stone ring (8-10 rocks around perimeter)
  const stoneCount = 10;
  const ringRadius = 1.25;
  for (let i = 0; i < stoneCount; i++) {
    const angle = (i / stoneCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const stoneScale = 0.22 + Math.random() * 0.08;
    const stoneGeo = new THREE.DodecahedronGeometry(stoneScale, 0);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      flatShading: true,
    });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(
      Math.cos(angle) * ringRadius,
      stoneScale * 0.7,
      Math.sin(angle) * ringRadius
    );
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }

  // 2. Crossed charred logs inside
  const crossedLogCount = 5;
  for (let i = 0; i < crossedLogCount; i++) {
    const angle = (i / crossedLogCount) * Math.PI;
    const cLogGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6);
    const cLog = new THREE.Mesh(cLogGeo, charcoalMaterial);
    cLog.rotation.z = Math.PI / 2;
    cLog.rotation.y = angle;
    cLog.rotation.x = (Math.random() - 0.5) * 0.3;
    cLog.position.y = 0.12;
    cLog.castShadow = true;
    group.add(cLog);
  }

  // 3. Glowing central ember bed
  const emberGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.12, 8);
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    emissive: 0xff4500,
    emissiveIntensity: 1.8,
    roughness: 0.5,
  });
  const ember = new THREE.Mesh(emberGeo, emberMat);
  ember.position.y = 0.08;
  group.add(ember);

  // 4. Point Light for illumination (Warm, radiant campfire glow without heavy 6-pass cubemap shadows)
  const fireLight = new THREE.PointLight(0xff7a18, 5.5, 32, 1.1);
  fireLight.position.set(0, 1.2, 0);
  fireLight.castShadow = false;
  group.add(fireLight);

  // 5. Procedural flame particles (InstancedMesh — 1 single draw call)
  const particleCount = 36;
  const particleGeo = new THREE.SphereGeometry(0.14, 5, 4);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xffaa11,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const instancedFlames = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
  instancedFlames.name = 'instancedFlameParticles';
  instancedFlames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(instancedFlames);

  const particlesData = [];
  const _dummyMat = new THREE.Object3D();
  for (let i = 0; i < particleCount; i++) {
    const data = {
      baseY: 0.15,
      speed: 1.2 + Math.random() * 1.5,
      radius: Math.random() * 0.45,
      angle: Math.random() * Math.PI * 2,
      life: Math.random(),
      maxLife: 0.8 + Math.random() * 0.6,
    };
    particlesData.push(data);
    _dummyMat.position.set(0, data.baseY, 0);
    _dummyMat.updateMatrix();
    instancedFlames.setMatrixAt(i, _dummyMat.matrix);
  }
  instancedFlames.instanceMatrix.needsUpdate = true;

  const campfireData = {
    group,
    fireLight,
    instancedFlames,
    particlesData,
    particles: particlesData,
    ember,
  };
  group.userData.campfireData = campfireData;
  group.fireLight = fireLight;
  group.instancedFlames = instancedFlames;
  group.particlesData = particlesData;
  group.particles = particlesData;
  group.ember = ember;
  group.group = group;

  return group;
}

/**
 * Procedural Emergency Ration Crate (Crash supply container)
 */
export function createRationBox() {
  const group = new THREE.Group();

  // Main crate body
  const boxGeo = new THREE.BoxGeometry(0.85, 0.48, 0.6);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x524738,
    roughness: 0.75,
    flatShading: true,
  });
  const boxMesh = new THREE.Mesh(boxGeo, boxMat);
  boxMesh.position.y = 0.24;
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  group.add(boxMesh);

  // Medical / survival cross decal on top
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.5,
  });
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.1), crossMat);
  bar1.position.set(0, 0.49, 0);
  group.add(bar1);

  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.35), crossMat);
  bar2.position.set(0, 0.49, 0);
  group.add(bar2);

  return group;
}

/**
 * Procedural Emergency Beacon (transponder mast + base)
 */
export function createEmergencyBeacon() {
  const beaconGroup = new THREE.Group();

  // Metal tripod base
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x33363d, roughness: 0.6, metalness: 0.7, flatShading: true });
  const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 0.6, 6), baseMat);
  tripod.position.y = 0.3;
  tripod.castShadow = true;
  beaconGroup.add(tripod);

  // International Orange transponder chassis
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xd96b32,
    roughness: 0.4,
    metalness: 0.3,
    flatShading: true,
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.45), chassisMat);
  chassis.position.y = 0.85;
  chassis.castShadow = true;
  beaconGroup.add(chassis);

  // Antenna mast
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xb8b4a8, metalness: 0.9, roughness: 0.2 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.4, 8), mastMat);
  mast.position.set(0, 1.7, 0);
  beaconGroup.add(mast);

  // Tip indicator bulb
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bulbMat);
  bulb.position.set(0, 2.4, 0);
  beaconGroup.add(bulb);

  const beaconLight = new THREE.PointLight(0xffaa22, 1.4, 8, 1.8);
  beaconLight.position.set(0, 2.4, 0);
  beaconGroup.add(beaconLight);

  beaconGroup.userData.beaconLight = beaconLight;
  beaconGroup.userData.bulb = bulb;

  return beaconGroup;
}

/**
 * Procedural First Aid Kit
 */
export function createFirstAidKit() {
  const medKitGroup = new THREE.Group();
  const medBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.24, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.4, flatShading: true })
  );
  medBox.position.y = 0.12;
  medBox.castShadow = true;
  medKitGroup.add(medBox);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.01, 0.08), new THREE.MeshBasicMaterial({ color: 0xa83e32 }));
  crossH.position.y = 0.245;
  medKitGroup.add(crossH);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.24), new THREE.MeshBasicMaterial({ color: 0xa83e32 }));
  crossV.position.y = 0.245;
  medKitGroup.add(crossV);

  return medKitGroup;
}

/**
 * Procedural Flight Documents (Clipboard & manifest paper)
 */
export function createFlightDocuments() {
  const docGroup = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8, flatShading: true })
  );
  board.position.y = 0.02;
  board.castShadow = true;
  docGroup.add(board);

  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.01, 0.52),
    new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.9 })
  );
  paper.position.y = 0.045;
  docGroup.add(paper);

  return docGroup;
}
