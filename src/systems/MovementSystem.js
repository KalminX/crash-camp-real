import * as THREE from 'three';

/**
 * MovementSystem — Updates player position, velocity, and character facing.
 *
 * Responsibilities:
 * - Camera-relative player movement.
 * - Sprint movement.
 * - Smooth character rotation toward movement direction.
 * - Footstep timing.
 *
 * Camera/head-bob motion is intentionally NOT handled here.
 * The player's Transform should remain a stable representation of
 * the actual world position so the camera does not inherit artificial
 * movement from the movement system.
 */
export class MovementSystem {
  constructor(audioSystem) {
    this.audioSystem = audioSystem;

    this.stepTimer = 0;

    // Preallocated vectors to avoid allocations in the game loop.
    this._moveDir = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  update(world, dt) {
    const players = world.query(
      'PlayerInput',
      'Transform',
      'Velocity'
    );

    for (const id of players) {
      const input = world.getComponent(
        id,
        'PlayerInput'
      );

      const transform = world.getComponent(
        id,
        'Transform'
      );

      const vel = world.getComponent(
        id,
        'Velocity'
      );

      // ---------------------------------------------------------
      // Movement speed
      // ---------------------------------------------------------

      const moveSpeed = input.sprint
        ? 7.2
        : 4.4;

      // Reset movement direction.
      this._moveDir.set(0, 0, 0);

      // ---------------------------------------------------------
      // Keyboard movement
      // ---------------------------------------------------------

      if (input.forward) {
        this._moveDir.z -= 1;
      }

      if (input.backward) {
        this._moveDir.z += 1;
      }

      if (input.left) {
        this._moveDir.x -= 1;
      }

      if (input.right) {
        this._moveDir.x += 1;
      }

      const isMoving =
        this._moveDir.lengthSq() > 0.001;

      // ---------------------------------------------------------
      // Moving
      // ---------------------------------------------------------

      if (isMoving) {
        // Normalize so diagonal movement isn't faster.
        this._moveDir.normalize();

        // Convert local movement direction into world space
        // using the camera's horizontal yaw.
        this._moveDir.applyAxisAngle(
          this._up,
          input.cameraYaw
        );

        // -------------------------------------------------------
        // Velocity
        // -------------------------------------------------------

        vel.x =
          this._moveDir.x * moveSpeed;

        vel.z =
          this._moveDir.z * moveSpeed;

        // -------------------------------------------------------
        // Position
        // -------------------------------------------------------

        transform.position.x +=
          vel.x * dt;

        transform.position.z +=
          vel.z * dt;

        // -------------------------------------------------------
        // Character facing
        // -------------------------------------------------------

        const targetAngle = Math.atan2(
          this._moveDir.x,
          this._moveDir.z
        );

        if (
          transform.facingAngle === undefined
        ) {
          transform.facingAngle =
            targetAngle;
        } else {
          let diff =
            targetAngle -
            transform.facingAngle;

          // Normalize angular difference to [-PI, PI].
          while (diff < -Math.PI) {
            diff += Math.PI * 2;
          }

          while (diff > Math.PI) {
            diff -= Math.PI * 2;
          }

          // Frame-rate independent smooth rotation.
          const rotationSmoothing =
            1 - Math.exp(-14 * dt);

          transform.facingAngle +=
            diff * rotationSmoothing;
        }

        // -------------------------------------------------------
        // Footsteps
        // -------------------------------------------------------

        const stepRate = input.sprint
          ? 0.32
          : 0.46;

        this.stepTimer += dt;

        if (this.stepTimer >= stepRate) {
          this.stepTimer = 0;

          if (this.audioSystem) {
            this.audioSystem.playFootstep(
              input.sprint
            );
          }
        }
      } else {
        // -------------------------------------------------------
        // Stopped
        // -------------------------------------------------------

        vel.x = 0;
        vel.z = 0;

        // Prevent a footstep from immediately triggering when
        // movement resumes.
        this.stepTimer = 0.2;
      }

      // ---------------------------------------------------------
      // IMPORTANT:
      //
      // Do NOT modify transform.headBobY here.
      //
      // The player's Transform represents the actual world
      // position. Artificial camera motion belongs in the
      // RenderSystem so it cannot introduce movement jitter.
      // ---------------------------------------------------------

      transform.headBobY = 0;
    }
  }
}
