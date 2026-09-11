import * as THREE from 'three';

/**
 * Procedural Humanoid Character (Composite shapes: parka, cargo pants, boots, backpack, beanie)
 * With modular articulated pivots for legs, arms, head, and torso.
 */
export function createHumanoidCharacter() {
  const characterGroup = new THREE.Group();
  characterGroup.name = 'HumanoidSurvivor';

  // Materials (Vibrant, high-contrast alpine survival palette for crisp visibility)
  const parkaMat = new THREE.MeshStandardMaterial({
    color: 0x486455,
    roughness: 0.75,
    metalness: 0.1,
    flatShading: true,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x3a4248,
    roughness: 0.8,
    flatShading: true,
  });
  const bootsMat = new THREE.MeshStandardMaterial({
    color: 0x222528,
    roughness: 0.75,
    flatShading: true,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x363432,
    roughness: 0.7,
    flatShading: true,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xedba93,
    roughness: 0.55,
    flatShading: true,
  });
  const hoodMat = new THREE.MeshStandardMaterial({
    color: 0x786a5e,
    roughness: 0.85,
    flatShading: true,
  });
  const backpackMat = new THREE.MeshStandardMaterial({
    color: 0x7d5b3d,
    roughness: 0.8,
    flatShading: true,
  });
  const bedrollMat = new THREE.MeshStandardMaterial({
    color: 0x4d755e,
    roughness: 0.85,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xe5ded3,
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

        leftArmGroup.rotation.x = -legAngle * 0.75;
        rightArmGroup.rotation.x = legAngle * 0.75;

        torso.rotation.y = Math.sin(this.walkPhase * 0.5) * 0.08;
        headGroup.rotation.y = -torso.rotation.y * 0.5;
      } else {
        leftLegGroup.rotation.x *= 0.82;
        rightLegGroup.rotation.x *= 0.82;
        leftArmGroup.rotation.x *= 0.82;
        rightArmGroup.rotation.x *= 0.82;
        torso.rotation.y *= 0.82;
        headGroup.rotation.y *= 0.82;

        this.idlePhase += dt * 2.2;
        torso.scale.y = 1.0 + Math.sin(this.idlePhase) * 0.015;
      }
    },
  };

  return characterGroup;
}
