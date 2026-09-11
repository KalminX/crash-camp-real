import * as THREE from 'three';

/**
 * Component definitions & factory helpers for Phase 0.
 * Components contain pure state/data.
 */

export const Components = {
  Transform: (x = 0, y = 0, z = 0, rotY = 0) => ({
    position: new THREE.Vector3(x, y, z),
    rotation: new THREE.Euler(0, rotY, 0),
    scale: new THREE.Vector3(1, 1, 1),
  }),

  Velocity: () => ({
    x: 0,
    y: 0,
    z: 0,
  }),

  PlayerInput: () => ({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    interact: false,
    eat: false,
    toggleView: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    cameraPitch: 0,
    orbitPitch: 0.68,
    cameraYaw: 0,
    cameraRoll: 0,
    zoomDelta: 0,
  }),

  Collider: (radius = 0.5, height = 1.8, isStatic = true) => ({
    radius,
    height,
    isStatic,
  }),

  Interactable: (prompt = 'Interact', actionType = 'pickup_log', maxDistance = 3.2) => {
    if (typeof actionType === 'number' && typeof maxDistance === 'string') {
      const temp = actionType;
      actionType = maxDistance;
      maxDistance = temp;
    }
    return {
      prompt,
      actionType,
      maxDistance,
    };
  },

  Pickup: (resourceType = 'wood', amount = 1) => ({
    resourceType,
    amount,
  }),

  Resource: (type = 'wood', count = 1) => ({
    type,
    count,
  }),

  Inventory: (maxWood = 5, maxFood = 5) => ({
    wood: 0,
    maxWood,
    food: 0,
    maxFood,
  }),

  Health: (current = 100, max = 100) => ({
    current,
    max,
  }),

  Hunger: (current = 100, max = 100, decayRate = 0.5) => ({
    current,
    max,
    decayRate,
  }),

  Thirst: (current = 100, max = 100, decayRate = 0.75) => ({
    current,
    max,
    decayRate,
  }),

  Warmth: (current = 100, max = 100, decayRate = 1.2) => ({
    current,
    max,
    decayRate,
  }),

  Stamina: (current = 100, max = 100, drainRate = 25, regenRate = 18) => ({
    current,
    max,
    drainRate,
    regenRate,
  }),

  TemperatureSource: (radius = 13, heatIntensity = 1.0) => ({
    radius,
    heatIntensity,
  }),

  WaterSource: () => ({
    isFresh: true,
  }),

  FoodSource: (type = 'berries', amount = 1) => ({
    type,
    amount,
    harvested: false,
  }),

  Fire: (initialFuel = 50, maxFuel = 100, burnRate = 0.33) => ({
    fuel: initialFuel,
    maxFuel,
    burnRate, // fuel depleted per second (~5 mins total survival requirement)
    isLit: true,
  }),

  LightSource: (light, baseIntensity = 3.5, baseDistance = 22) => ({
    light,
    baseIntensity,
    baseDistance,
    flickerOffset: Math.random() * 100,
  }),

  MeshComponent: (mesh) => ({
    mesh,
  }),
};
