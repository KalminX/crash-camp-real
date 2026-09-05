import * as THREE from "three";

export class RenderSystem {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.cameraMode = "birds-eye";

    // Third-person orbit camera
    this.camDistance = 8.5;
    this.minDistance = 3.2;
    this.maxDistance = 18.0;
    this.zoomSpeed = 0.75;
    this.cameraLookHeight = 1.65;

    // First-person camera
    this.firstPersonEyeHeight = 1.55;

    this.activePlayerMesh = null;

    // Reusable vectors
    this._targetCamPos = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
  }

  setCameraMode(mode) {
    if (mode !== "birds-eye" && mode !== "first-person") {
      return;
    }

    this.cameraMode = mode;

    if (this.activePlayerMesh) {
      this.activePlayerMesh.visible = mode === "birds-eye";
    }
  }

  toggleCameraMode() {
    this.setCameraMode(
      this.cameraMode === "birds-eye"
        ? "first-person"
        : "birds-eye",
    );
  }

  getCameraMode() {
    return this.cameraMode;
  }

  update(world, deltaTime) {
    const players = world.query(
      "Transform",
      "PlayerInput",
    );

    if (players.length === 0) {
      return;
    }

    const playerId = players[0];

    const transform = world.getComponent(
      playerId,
      "Transform",
    );

    const input = world.getComponent(
      playerId,
      "PlayerInput",
    );

    if (!transform || !input) {
      return;
    }

    /*
     * ---------------------------------------------------------
     * PLAYER MESH + ANIMATION
     * ---------------------------------------------------------
     *
     * The ECS Transform controls the player's world position.
     * The GLB model is a separate Three.js object, so it must
     * be synchronized with the ECS transform every frame.
     *
     * CharacterLoader attaches the animation function to:
     *
     *     mesh.userData.animate(...)
     *
     * We call that here so Idle / Walk / Run continue playing.
     */
    const meshComponent = world.getComponent(
      playerId,
      "MeshComponent",
    );

    const velocity = world.getComponent(
      playerId,
      "Velocity",
    );

    if (meshComponent && meshComponent.mesh) {
      this.setPlayerMesh(meshComponent.mesh);

      const mesh = meshComponent.mesh;

      // Synchronize GLB position with ECS player position.
      mesh.position.copy(transform.position);

      // Synchronize GLB rotation with movement direction.
      if (transform.facingAngle !== undefined) {
        mesh.rotation.y = transform.facingAngle;
      }

      /*
       * Drive the GLB animation system.
       *
       * CharacterLoader decides whether this is:
       * - Idle
       * - Walk
       * - Run
       * - Defeated
       */
      if (typeof mesh.userData?.animate === "function") {
        const speed = velocity
          ? Math.sqrt(
              velocity.x * velocity.x +
              velocity.z * velocity.z,
            )
          : 0;

        const isMoving = speed > 0.05;
        const isSprinting = Boolean(input.sprint);

        mesh.userData.animate(
          speed,
          deltaTime,
          isMoving,
          isSprinting,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * ZOOM
     * ---------------------------------------------------------
     *
     * Zoom ONLY comes from mouse-wheel input.
     *
     * Mouse movement never changes camera distance.
     */
    if (input.zoomDelta !== 0) {
      if (this.cameraMode === "birds-eye") {
        this.camDistance = THREE.MathUtils.clamp(
          this.camDistance +
            input.zoomDelta * this.zoomSpeed,
          this.minDistance,
          this.maxDistance,
        );
      } else if (this.cameraMode === "first-person") {
        this.camera.fov = THREE.MathUtils.clamp(
          this.camera.fov + input.zoomDelta * 2.5,
          40,
          85,
        );
        this.camera.updateProjectionMatrix();
      }
    }

    /*
     * ---------------------------------------------------------
     * CAMERA
     * ---------------------------------------------------------
     */
    if (this.cameraMode === "first-person") {
      this.updateFirstPersonCamera(
        transform,
        input,
      );
    } else {
      this.updateBirdsEyeCamera(
        transform,
        input,
      );
    }

    /*
     * Rendering itself is handled by Game.render().
     */
  }

  updateBirdsEyeCamera(transform, input) {
    const px = transform.position.x;
    const py = transform.position.y;
    const pz = transform.position.z;

    /*
     * Horizontal mouse movement controls orbit yaw.
     */
    const yaw = input.cameraYaw || 0;

    /*
     * Vertical mouse movement controls orbit pitch.
     *
     * 0.20 = shallow
     * 0.68 = default bird's-eye angle
     * 1.25 = steep
     */
    const pitch = THREE.MathUtils.clamp(
      input.orbitPitch !== undefined
        ? input.orbitPitch
        : 0.68,
      0.20,
      1.25,
    );

    /*
     * Look slightly above the character.
     *
     * This keeps the character slightly below screen
     * center and gives the player more visibility ahead.
     */
    const lookY = py + this.cameraLookHeight;

    const horizontalDistance =
      Math.cos(pitch) * this.camDistance;

    const verticalDistance =
      Math.sin(pitch) * this.camDistance;

    /*
     * Camera target.
     */
    this._lookTarget.set(
      px,
      lookY,
      pz,
    );

    /*
     * Orbit around the player.
     *
     * yaw = 0:
     * camera sits behind the player on +Z
     * and looks toward -Z.
     */
    this._targetCamPos.set(
      px +
        Math.sin(yaw) *
        horizontalDistance,

      lookY +
        verticalDistance,

      pz +
        Math.cos(yaw) *
        horizontalDistance,
    );

    this.camera.position.copy(
      this._targetCamPos,
    );

    this.camera.up.set(
      0,
      1,
      0,
    );

    this.camera.lookAt(
      this._lookTarget,
    );
  }

  updateFirstPersonCamera(transform, input) {
    const px = transform.position.x;
    const py = transform.position.y;
    const pz = transform.position.z;

    const yaw = input.cameraYaw || 0;

    const pitch = THREE.MathUtils.clamp(
      input.cameraPitch || 0,
      -1.40,
      1.40,
    );

    this.camera.position.set(
      px,
      py + this.firstPersonEyeHeight,
      pz,
    );

    /*
     * YXZ prevents unwanted roll when using
     * separate yaw and pitch values.
     */
    this.camera.rotation.order = "YXZ";

    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;
    this.camera.rotation.z = 0;

    this.camera.up.set(
      0,
      1,
      0,
    );
  }

  setPlayerMesh(mesh) {
    if (!mesh) {
      return;
    }

    if (this.activePlayerMesh !== mesh) {
      this.activePlayerMesh = mesh;
    }

    /*
     * Character is visible in Bird's-Eye View.
     * Hide it in first-person so the body does not obstruct
     * the camera.
     */
    this.activePlayerMesh.visible =
      this.cameraMode === "birds-eye";
  }

  dispose() {
    this.activePlayerMesh = null;
  }
}
