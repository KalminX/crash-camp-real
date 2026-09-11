import * as THREE from 'three';
import { metalPanelMaterial, metalDarkMaterial } from './materials.js';

/**
 * Procedural In-Flight Commercial Airliner (Flight 402)
 * Fuselage, swept wings, turbofans, tail fin, cabin windows, and nav lights.
 */
export function createFlightAirplane() {
  const group = new THREE.Group();

  const planeMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde4,
    roughness: 0.35,
    metalness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
  });
  const cabinWindowMat = new THREE.MeshBasicMaterial({
    color: 0xffe8b3,
  });

  // 1. Fuselage (Central tube aligned along Z-axis)
  const bodyGeo = new THREE.CylinderGeometry(1.35, 1.35, 12, 16);
  const body = new THREE.Mesh(bodyGeo, planeMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Nose cone (Front, facing -Z)
  const noseGeo = new THREE.ConeGeometry(1.35, 3.2, 16);
  const nose = new THREE.Mesh(noseGeo, planeMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -7.6;
  group.add(nose);

  // Tail cone (Rear, facing +Z)
  const tailConeGeo = new THREE.ConeGeometry(1.35, 4.0, 16);
  const tailCone = new THREE.Mesh(tailConeGeo, planeMat);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 8.0;
  group.add(tailCone);

  // Cockpit windshield
  const windshieldGeo = new THREE.BoxGeometry(1.4, 0.45, 0.9);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 0.75, -6.6);
  windshield.rotation.x = 0.35;
  group.add(windshield);

  // 2. Cabin Windows (Rows on left and right)
  for (let side of [-1, 1]) {
    const windowStripGeo = new THREE.PlaneGeometry(8.5, 0.22);
    const windowStrip = new THREE.Mesh(windowStripGeo, cabinWindowMat);
    windowStrip.position.set(side * 1.36, 0.3, -0.5);
    windowStrip.rotation.y = (side * Math.PI) / 2;
    group.add(windowStrip);
  }

  // 3. Swept-Back Main Wings
  const wingSpan = 18;
  const wingDepth = 3.2;
  const wingGeo = new THREE.BoxGeometry(wingSpan, 0.18, wingDepth);
  const wings = new THREE.Mesh(wingGeo, planeMat);
  wings.position.set(0, -0.2, 0.5);
  group.add(wings);

  // Wingtips (Vertical winglets)
  for (let side of [-1, 1]) {
    const wingletGeo = new THREE.BoxGeometry(0.12, 0.85, 1.4);
    const winglet = new THREE.Mesh(wingletGeo, planeMat);
    winglet.position.set(side * (wingSpan / 2), 0.3, 0.5);
    group.add(winglet);
  }

  // Navigation lights (Red on left port, Green on right starboard)
  const portLightGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const portLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const portLightMesh = new THREE.Mesh(portLightGeo, portLightMat);
  portLightMesh.position.set(-wingSpan / 2 - 0.05, 0.3, 0.5);
  group.add(portLightMesh);

  const portLight = new THREE.PointLight(0xef4444, 2.0, 6);
  portLight.position.copy(portLightMesh.position);
  group.add(portLight);

  const stbdLightGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const stbdLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const stbdLightMesh = new THREE.Mesh(stbdLightGeo, stbdLightMat);
  stbdLightMesh.position.set(wingSpan / 2 + 0.05, 0.3, 0.5);
  group.add(stbdLightMesh);

  const stbdLight = new THREE.PointLight(0x22c55e, 2.0, 6);
  stbdLight.position.copy(stbdLightMesh.position);
  group.add(stbdLight);

  // 4. Turbofan Jet Engines (Hung under wings)
  const engineGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.6, 12);
  const intakeGeo = new THREE.CircleGeometry(0.48, 12);
  const intakeMat = new THREE.MeshBasicMaterial({ color: 0x050508 });

  const leftEngineGroup = new THREE.Group();
  leftEngineGroup.name = 'leftEngine';
  const leftCowl = new THREE.Mesh(engineGeo, planeMat);
  leftCowl.rotation.x = Math.PI / 2;
  leftEngineGroup.add(leftCowl);

  const leftIntake = new THREE.Mesh(intakeGeo, intakeMat);
  leftIntake.rotation.y = Math.PI;
  leftIntake.position.z = -1.31;
  leftEngineGroup.add(leftIntake);

  leftEngineGroup.position.set(-3.8, -1.0, 0.4);
  group.add(leftEngineGroup);

  const rightEngineGroup = new THREE.Group();
  rightEngineGroup.name = 'rightEngine';
  const rightCowl = new THREE.Mesh(engineGeo, planeMat);
  rightCowl.rotation.x = Math.PI / 2;
  rightEngineGroup.add(rightCowl);

  const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
  rightIntake.rotation.y = Math.PI;
  rightIntake.position.z = -1.31;
  rightEngineGroup.add(rightIntake);

  rightEngineGroup.position.set(3.8, -1.0, 0.4);
  group.add(rightEngineGroup);

  // 5. Tail Empennage
  const rudderGeo = new THREE.BoxGeometry(0.18, 3.2, 2.8);
  const rudder = new THREE.Mesh(rudderGeo, planeMat);
  rudder.position.set(0, 2.2, 8.2);
  rudder.rotation.x = -0.35;
  group.add(rudder);

  const strobeLight = new THREE.PointLight(0xffffff, 3.5, 12);
  strobeLight.position.set(0, 3.8, 8.8);
  group.add(strobeLight);

  const hStabGeo = new THREE.BoxGeometry(6.4, 0.12, 1.8);
  const hStab = new THREE.Mesh(hStabGeo, planeMat);
  hStab.position.set(0, 0.6, 8.4);
  group.add(hStab);

  return {
    group,
    leftEngine: leftEngineGroup,
    rightEngine: rightEngineGroup,
    strobeLight,
    portLight,
    stbdLight,
  };
}

/**
 * Procedural Plane Wreckage (Cylindrical broken fuselage, sheared wings, metal plates, luggage debris)
 */
export function createPlaneWreckage() {
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
    Math.PI * 1.4
  );
  const fuselage = new THREE.Mesh(fuselageGeo, metalPanelMaterial);
  fuselage.rotation.z = Math.PI / 2 + 0.15;
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
}

/**
 * Procedural Engine Turbine (standalone model for grid map)
 */
export function createEngineTurbine() {
  const group = new THREE.Group();
  const turbineGeo = new THREE.CylinderGeometry(0.75, 0.85, 2.0, 10);
  const turbine = new THREE.Mesh(turbineGeo, metalDarkMaterial);
  turbine.rotation.set(1.4, 0.2, 0.8);
  turbine.position.y = 0.6;
  turbine.castShadow = true;
  turbine.receiveShadow = true;
  group.add(turbine);
  return group;
}

/**
 * Procedural Impact Furrow (scorched trench in snow)
 */
export function createImpactFurrow() {
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
}
