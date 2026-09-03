/**
 * InputSystem — Captures keyboard and mouse inputs, updates PlayerInput component.
 */
export class InputSystem {
  constructor(domElement) {
    this.domElement = domElement || document.body;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      interact: false,
    };

    this.interactPressedThisFrame = false;
    this.eatPressedThisFrame = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isLocked = false;

    this.setupListeners();
  }

  setupListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'KeyE':
          this.interactPressedThisFrame = true;
          break;
        case 'KeyQ':
        case 'Digit1':
          this.eatPressedThisFrame = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
      }
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (this.isLocked) {
        this.mouseDeltaX += e.movementX || 0;
        this.mouseDeltaY += e.movementY || 0;
      }
    });

    // Left click interaction
    document.addEventListener('mousedown', (e) => {
      if (this.isLocked && e.button === 0) {
        this.interactPressedThisFrame = true;
      }
    });

    // Pointer Lock change
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  update(world, dt) {
    const playerEntities = world.query('PlayerInput');
    for (const id of playerEntities) {
      const input = world.getComponent(id, 'PlayerInput');
      input.forward = this.keys.forward;
      input.backward = this.keys.backward;
      input.left = this.keys.left;
      input.right = this.keys.right;
      input.sprint = this.keys.sprint;
      input.interact = this.interactPressedThisFrame;
      input.eat = this.eatPressedThisFrame;

      // Mouse look update (Euler angles)
      const mouseSens = 0.0022;
      input.cameraYaw -= this.mouseDeltaX * mouseSens;
      input.cameraPitch -= this.mouseDeltaY * mouseSens;

      // Clamp pitch between -85 and +85 degrees
      const maxPitch = (Math.PI / 2) * 0.94;
      input.cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, input.cameraPitch));
    }

    // Reset frame-transient inputs
    this.interactPressedThisFrame = false;
    this.eatPressedThisFrame = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
}
