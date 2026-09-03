import * as THREE from 'three';

/**
 * MovementSystem — Updates player position and velocity from input and camera orientation.
 */
export class MovementSystem {
  constructor(audioSystem) {
    this.audioSystem = audioSystem;
    this.stepTimer = 0;
    this.bobTimer = 0;
  }

  update(world, dt) {
    const players = world.query('PlayerInput', 'Transform', 'Velocity');

    for (const id of players) {
      const input = world.getComponent(id, 'PlayerInput');
      const transform = world.getComponent(id, 'Transform');
      const vel = world.getComponent(id, 'Velocity');

      const moveSpeed = input.sprint ? 7.2 : 4.4;
      const moveDir = new THREE.Vector3();

      if (input.forward) moveDir.z -= 1;
      if (input.backward) moveDir.z += 1;
      if (input.left) moveDir.x -= 1;
      if (input.right) moveDir.x += 1;

      const isMoving = moveDir.lengthSq() > 0.001;

      if (isMoving) {
        moveDir.normalize();
        // Rotate direction vector by camera yaw
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), input.cameraYaw);

        vel.x = moveDir.x * moveSpeed;
        vel.z = moveDir.z * moveSpeed;

        // Apply movement displacement
        transform.position.x += vel.x * dt;
        transform.position.z += vel.z * dt;

        // Head bobbing & footsteps
        const stepRate = input.sprint ? 0.32 : 0.46;
        this.stepTimer += dt;
        this.bobTimer += dt * (input.sprint ? 14 : 9);

        if (this.stepTimer >= stepRate) {
          this.stepTimer = 0;
          if (this.audioSystem) {
            this.audioSystem.playFootstep(input.sprint);
          }
        }
      } else {
        vel.x = 0;
        vel.z = 0;
        this.stepTimer = 0.2;
      }

      // Store head bob offset in transform for the camera
      transform.headBobY = isMoving ? Math.sin(this.bobTimer) * (input.sprint ? 0.07 : 0.04) : 0;
    }
  }
}
