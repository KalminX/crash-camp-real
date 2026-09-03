import * as THREE from 'three';

/**
 * RenderSystem — Presentation layer.
 * Synchronizes ECS Transforms to Three.js Object3D meshes and positions the FPS camera.
 */
export class RenderSystem {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.playerEyeHeight = 1.68;
  }

  update(world, dt) {
    // 1. Sync FPS camera to player entity
    const players = world.query('PlayerInput', 'Transform');
    if (players.length > 0) {
      const playerId = players[0];
      const transform = world.getComponent(playerId, 'Transform');
      const input = world.getComponent(playerId, 'PlayerInput');

      // Camera position = Player foot position + eye height + dynamic head bob
      const bobY = transform.headBobY || 0;
      this.camera.position.set(
        transform.position.x,
        transform.position.y + this.playerEyeHeight + bobY,
        transform.position.z
      );

      // Camera orientation (First-person Euler YXZ order)
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = input.cameraYaw;
      this.camera.rotation.x = input.cameraPitch;
    }

    // 2. Sync all non-player mesh entities
    const renderables = world.query('Transform', 'MeshComponent');
    for (const id of renderables) {
      // Don't reposition if it's the player (camera handles player)
      if (world.hasComponent(id, 'PlayerInput')) continue;

      const transform = world.getComponent(id, 'Transform');
      const meshComp = world.getComponent(id, 'MeshComponent');

      if (meshComp && meshComp.mesh) {
        meshComp.mesh.position.copy(transform.position);
        meshComp.mesh.rotation.copy(transform.rotation);
        meshComp.mesh.scale.copy(transform.scale);
      }
    }

    // 3. Render Three.js frame
    this.renderer.render(this.scene, this.camera);
  }
}
