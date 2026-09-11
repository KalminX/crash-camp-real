import * as THREE from 'three';

/**
 * Shared PBR materials and color palettes for procedural models.
 * Reused across instanced and individual composite meshes to minimize draw calls and shader state changes.
 */

export const barkMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d2817,
  roughness: 0.9,
  flatShading: true,
});

export const needleMaterialDark = new THREE.MeshStandardMaterial({
  color: 0x19331e,
  roughness: 0.8,
  flatShading: true,
});

export const needleMaterialLight = new THREE.MeshStandardMaterial({
  color: 0x22482c,
  roughness: 0.8,
  flatShading: true,
});

export const logBarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a4825,
  roughness: 0.8,
  flatShading: true,
});

export const logCoreMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5d09f,
  roughness: 0.6,
  flatShading: true,
});

export const metalPanelMaterial = new THREE.MeshStandardMaterial({
  color: 0x88929a,
  roughness: 0.4,
  metalness: 0.7,
  flatShading: true,
});

export const metalDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f3438,
  roughness: 0.6,
  metalness: 0.8,
  flatShading: true,
});

export const charcoalMaterial = new THREE.MeshStandardMaterial({
  color: 0x1c1917,
  roughness: 0.95,
  flatShading: true,
});
