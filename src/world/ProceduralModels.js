import * as THREE from 'three';

/**
 * Procedural composite 3D models using Three.js primitives.
 * Fast, self-contained, no external asset dependencies.
 */

// Shared materials and palettes for efficiency
const barkMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d2817,
  roughness: 0.9,
  flatShading: true,
});

const needleMaterialDark = new THREE.MeshStandardMaterial({
  color: 0x19331e,
  roughness: 0.8,
  flatShading: true,
});

const needleMaterialLight = new THREE.MeshStandardMaterial({
  color: 0x22482c,
  roughness: 0.8,
  flatShading: true,
});

const logBarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a4825,
  roughness: 0.8,
  flatShading: true,
});

const logCoreMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5d09f,
  roughness: 0.6,
  flatShading: true,
});

const metalPanelMaterial = new THREE.MeshStandardMaterial({
  color: 0x88929a,
  roughness: 0.4,
  metalness: 0.7,
  flatShading: true,
});

const metalDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f3438,
  roughness: 0.6,
  metalness: 0.8,
  flatShading: true,
});

const charcoalMaterial = new THREE.MeshStandardMaterial({
  color: 0x1c1917,
  roughness: 0.95,
  flatShading: true,
});

export const ProceduralModels = {
  /**
   * Procedural Pine Tree (Cylinder trunk + stacked cones)
   */
  createTree(heightScale = 1) {
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
      // Slight random tilt for natural variety
      cone.rotation.x = (Math.random() - 0.5) * 0.08;
      cone.rotation.z = (Math.random() - 0.5) * 0.08;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    }

    return group;
  },

  /**
   * Procedural Craggy Rock (Deformed Dodecahedron)
   */
  createRock(scale = 1) {
    const geo = new THREE.DodecahedronGeometry(1.2 * scale, 1);
    const pos = geo.attributes.position;

    // Randomize vertices slightly to create unique crags
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
  },

  /**
   * Procedural Collectible Log (Cylinder bark + end caps)
   */
  createLog() {
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
  },

  /**
   * Procedural Campfire (Stone ring + crossed charcoal logs + glowing embers + flame particle system)
   */
  createCampfire() {
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

    // 4. Point Light for illumination (Warm, radiant campfire glow)
    const fireLight = new THREE.PointLight(0xff7a18, 5.5, 32, 1.1);
    fireLight.position.set(0, 1.2, 0);
    fireLight.castShadow = true;
    fireLight.shadow.bias = -0.002;
    fireLight.shadow.mapSize.width = 1024;
    fireLight.shadow.mapSize.height = 1024;
    group.add(fireLight);

    // 5. Procedural flame particles (InstancedMesh or Particle Group)
    const particleCount = 36;
    const particleGeo = new THREE.SphereGeometry(0.14, 5, 4);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffaa11,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const flameGroup = new THREE.Group();
    flameGroup.name = 'flameParticles';

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat.clone());
      p.userData = {
        baseY: 0.15,
        speed: 1.2 + Math.random() * 1.5,
        radius: Math.random() * 0.45,
        angle: Math.random() * Math.PI * 2,
        life: Math.random(),
        maxLife: 0.8 + Math.random() * 0.6,
      };
      flameGroup.add(p);
      particles.push(p);
    }
    group.add(flameGroup);

    return {
      group,
      fireLight,
      particles,
      ember,
    };
  },

  /**
   * Procedural Plane Wreckage (Cylindrical broken fuselage, sheared wings, metal plates, luggage debris)
   */
  createPlaneWreckage() {
    const group = new THREE.Group();

    // 1. Broken fuselage cylinder (sheared open)
    const fuselageLength = 7.5;
    const fuselageRadius = 1.8;
    const fuselageGeo = new THREE.CylinderGeometry(
      fuselageRadius,
      fuselageRadius,
      fuselageLength,
      12,
      1,
      true,
      0,
      Math.PI * 1.4 // open ripped section
    );
    const fuselage = new THREE.Mesh(fuselageGeo, metalPanelMaterial);
    fuselage.rotation.z = Math.PI / 2 + 0.15; // tilted in the snow/dirt
    fuselage.rotation.y = 0.35;
    fuselage.position.set(0, fuselageRadius * 0.75, 0);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    group.add(fuselage);

    // Rib frames inside fuselage
    for (let i = -3; i <= 3; i += 1.5) {
      const ribGeo = new THREE.TorusGeometry(fuselageRadius * 0.98, 0.08, 6, 12, Math.PI * 1.4);
      const rib = new THREE.Mesh(ribGeo, metalDarkMaterial);
      rib.rotation.y = Math.PI / 2 + 0.35;
      rib.position.set(i * Math.cos(0.35), fuselageRadius * 0.75, i * Math.sin(0.35));
      group.add(rib);
    }

    // 2. Large Broken Wing buried into ground
    const wingGeo = new THREE.BoxGeometry(6.5, 0.25, 2.2);
    const wing = new THREE.Mesh(wingGeo, metalPanelMaterial);
    wing.rotation.set(0.3, 0.4, 0.45);
    wing.position.set(4.8, 1.2, -1.8);
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);

    // Wing stripe / airline livery
    const stripeGeo = new THREE.BoxGeometry(6.52, 0.26, 0.35);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0, 0.4);
    wing.add(stripe);

    // 3. Jet Engine Turbine wreckage
    const turbineGeo = new THREE.CylinderGeometry(0.75, 0.85, 2.0, 10);
    const turbine = new THREE.Mesh(turbineGeo, metalDarkMaterial);
    turbine.rotation.set(1.4, 0.2, 0.8);
    turbine.position.set(-3.8, 0.6, 2.5);
    turbine.castShadow = true;
    turbine.receiveShadow = true;
    group.add(turbine);

    // 4. Scattered metal plates & crates
    for (let i = 0; i < 6; i++) {
      const plateGeo = new THREE.BoxGeometry(1.2 + Math.random() * 0.8, 0.05, 0.9 + Math.random() * 0.6);
      const plate = new THREE.Mesh(plateGeo, metalPanelMaterial);
      plate.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      const dist = 3.5 + Math.random() * 3.5;
      const ang = Math.random() * Math.PI * 2;
      plate.position.set(Math.cos(ang) * dist, 0.05, Math.sin(ang) * dist);
      plate.castShadow = true;
      group.add(plate);
    }

    return group;
  },

  /**
   * Procedural Clearing Ground (Completely flat terrain, guaranteed y = 0)
   */
  createClearingGround(radius = 65) {
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, 2, 2);
    geo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x485854, // Soft frosted forest floor with clear visibility
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, groundMat);
    mesh.position.y = 0;
    mesh.receiveShadow = true;
    return mesh;
  },

  /**
   * Procedural Freshwater Stream (Curving sparkling water strip with river stones)
   */
  createStream() {
    const group = new THREE.Group();

    // Water strip running north-south in eastern sector
    const streamLength = 48;
    const streamWidth = 3.2;
    const waterGeo = new THREE.PlaneGeometry(streamWidth, streamLength, 12, 32);
    waterGeo.rotateX(-Math.PI / 2);

    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      // Gentle S-curve meander
      const curveX = Math.sin(z * 0.12) * 2.2;
      pos.setX(i, pos.getX(i) + curveX);
      // Slight elevation ripple
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
  },

  /**
   * Procedural Berry Bush (Dense foliage cluster with ripe harvestable berries)
   */
  createBerryBush() {
    const group = new THREE.Group();

    // 1. Shrub foliage spheres
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

    // 2. Bright red harvestable berries
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
  },

  /**
   * Procedural Emergency Ration Crate (Crash supply container)
   */
  createRationBox() {
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
  },

  /**
   * Procedural Humanoid Character (Composite shapes: parka, cargo pants, boots, backpack, beanie)
   * With modular articulated pivots for legs, arms, head, and torso.
   */
  createHumanoidCharacter() {
    const characterGroup = new THREE.Group();
    characterGroup.name = 'HumanoidSurvivor';

    // Materials (Vibrant, high-contrast alpine survival palette for crisp visibility)
    const parkaMat = new THREE.MeshStandardMaterial({
      color: 0x486455, // Clear alpine slate green
      roughness: 0.75,
      metalness: 0.1,
      flatShading: true,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x3a4248, // Defined charcoal winter cargo trousers
      roughness: 0.8,
      flatShading: true,
    });
    const bootsMat = new THREE.MeshStandardMaterial({
      color: 0x222528, // Rugged sub-zero snow boots
      roughness: 0.75,
      flatShading: true,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x363432, // Insulated leather mittens/gloves
      roughness: 0.7,
      flatShading: true,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xedba93, // Warm exposed face
      roughness: 0.55,
      flatShading: true,
    });
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x786a5e, // Warm knit beanie / fur-lined hood
      roughness: 0.85,
      flatShading: true,
    });
    const backpackMat = new THREE.MeshStandardMaterial({
      color: 0x7d5b3d, // High-visibility weathered canvas pack
      roughness: 0.8,
      flatShading: true,
    });
    const bedrollMat = new THREE.MeshStandardMaterial({
      color: 0x4d755e, // Rolled foam/tarp bedroll
      roughness: 0.85,
      flatShading: true,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xe5ded3, // Crisp fleece/fur collar trim
      roughness: 0.9,
      flatShading: true,
    });

    // 1. Pelvis / Hips
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.28), pantsMat);
    pelvis.position.y = 0.88;
    pelvis.castShadow = true;
    pelvis.receiveShadow = true;
    characterGroup.add(pelvis);

    // 2. Torso (Parka jacket)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.34), parkaMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    torso.receiveShadow = true;
    characterGroup.add(torso);

    // Fleece / Fur trim collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.36), trimMat);
    collar.position.y = 1.54;
    collar.castShadow = true;
    characterGroup.add(collar);

    // 3. Survival Backpack & Bedroll on back
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.22), backpackMat);
    backpack.position.set(0, 1.25, -0.24);
    backpack.castShadow = true;
    characterGroup.add(backpack);

    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 8), bedrollMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 1.51, -0.24);
    bedroll.castShadow = true;
    characterGroup.add(bedroll);

    // 4. Head Group (Head, face, beanie)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.68, 0);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), skinMat);
    face.position.y = 0;
    face.castShadow = true;
    headGroup.add(face);

    const beanie = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), hoodMat);
    beanie.position.y = 0.08;
    beanie.castShadow = true;
    headGroup.add(beanie);

    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.12), trimMat);
    scarf.position.set(0, -0.08, 0.12);
    headGroup.add(scarf);

    characterGroup.add(headGroup);

    // 5. Left Leg (Hip pivot)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.14, 0.85, 0);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), pantsMat);
    leftLeg.position.y = -0.32;
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLegGroup.add(leftLeg);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.32), bootsMat);
    leftBoot.position.set(0, -0.68, 0.05);
    leftBoot.castShadow = true;
    leftBoot.receiveShadow = true;
    leftLegGroup.add(leftBoot);

    characterGroup.add(leftLegGroup);

    // 6. Right Leg (Hip pivot)
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.14, 0.85, 0);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), pantsMat);
    rightLeg.position.y = -0.32;
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLegGroup.add(rightLeg);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.32), bootsMat);
    rightBoot.position.set(0, -0.68, 0.05);
    rightBoot.castShadow = true;
    rightBoot.receiveShadow = true;
    rightLegGroup.add(rightBoot);

    characterGroup.add(rightLegGroup);

    // 7. Left Arm (Shoulder pivot)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.33, 1.48, 0);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), parkaMat);
    leftArm.position.y = -0.26;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);

    const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), gloveMat);
    leftGlove.position.y = -0.56;
    leftGlove.castShadow = true;
    leftArmGroup.add(leftGlove);

    characterGroup.add(leftArmGroup);

    // 8. Right Arm (Shoulder pivot)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.33, 1.48, 0);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), parkaMat);
    rightArm.position.y = -0.26;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);

    const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), gloveMat);
    rightGlove.position.y = -0.56;
    rightGlove.castShadow = true;
    rightArmGroup.add(rightGlove);

    characterGroup.add(rightArmGroup);

    // Animation controller on userData
    characterGroup.userData = {
      walkPhase: 0,
      idlePhase: 0,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      torso,
      head: headGroup,
      animate(speed, dt, isMoving) {
        if (isMoving) {
          const strideFreq = speed > 5 ? 13 : 9;
          this.walkPhase += dt * strideFreq;

          const legAngle = Math.sin(this.walkPhase) * (speed > 5 ? 0.65 : 0.45);
          leftLegGroup.rotation.x = legAngle;
          rightLegGroup.rotation.x = -legAngle;

          // Arms swing counter to legs
          leftArmGroup.rotation.x = -legAngle * 0.75;
          rightArmGroup.rotation.x = legAngle * 0.75;

          // Subtle torso twist and head compensation
          torso.rotation.y = Math.sin(this.walkPhase * 0.5) * 0.08;
          headGroup.rotation.y = -torso.rotation.y * 0.5;
        } else {
          // Smooth return to idle rest pose
          leftLegGroup.rotation.x *= 0.82;
          rightLegGroup.rotation.x *= 0.82;
          leftArmGroup.rotation.x *= 0.82;
          rightArmGroup.rotation.x *= 0.82;
          torso.rotation.y *= 0.82;
          headGroup.rotation.y *= 0.82;

          // Subtle breathing cycle
          this.idlePhase += dt * 2.2;
          torso.scale.y = 1.0 + Math.sin(this.idlePhase) * 0.015;
        }
      },
    };

    return characterGroup;
  },

  /**
   * Procedural Engine Turbine (standalone model for grid map)
   */
  createEngineTurbine() {
    const group = new THREE.Group();
    const turbineGeo = new THREE.CylinderGeometry(0.75, 0.85, 2.0, 10);
    const turbine = new THREE.Mesh(turbineGeo, metalDarkMaterial);
    turbine.rotation.set(1.4, 0.2, 0.8);
    turbine.position.y = 0.6;
    turbine.castShadow = true;
    turbine.receiveShadow = true;
    group.add(turbine);
    return group;
  },

  /**
   * Procedural Emergency Beacon (transponder mast + base)
   */
  createEmergencyBeacon() {
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
  },

  /**
   * Procedural First Aid Kit
   */
  createFirstAidKit() {
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
  },

  /**
   * Procedural Flight Documents (Clipboard & manifest paper)
   */
  createFlightDocuments() {
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
  },

  /**
   * Procedural Impact Furrow (scorched trench in snow)
   */
  createImpactFurrow() {
    const furrowGeo = new THREE.PlaneGeometry(6, 18, 6, 12);
    furrowGeo.rotateX(-Math.PI / 2);
    const furrowMat = new THREE.MeshStandardMaterial({
      color: 0x221a14,
      roughness: 0.95,
      metalness: 0.05,
    });
    const furrow = new THREE.Mesh(furrowGeo, furrowMat);
    furrow.position.y = 0.02;
    furrow.receiveShadow = true;
    return furrow;
  },
};
