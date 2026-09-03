/**
 * Input — Centralized global input manager.
 * Captures mouse look, keyboard movement, and action keys.
 */
export class Input {
  constructor(domElement) {
    this.domElement = domElement || document.body;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      interact: false,
      eat: false,
    };

    this.interactPressed = false;
    this.eatPressed = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isLocked = false;

    this.setupListeners();
  }

  setupListeners() {
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
          this.interactPressed = true;
          break;
        case 'KeyQ':
        case 'Digit1':
          this.eatPressed = true;
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

    document.addEventListener('mousemove', (e) => {
      if (this.isLocked) {
        this.mouseDeltaX += e.movementX || 0;
        this.mouseDeltaY += e.movementY || 0;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (this.isLocked && e.button === 0) {
        this.interactPressed = true;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });
  }

  requestLock() {
    if (this.domElement && this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
    }
  }

  unlock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  consumeMouseDeltas() {
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  consumeActions() {
    const interact = this.interactPressed;
    const eat = this.eatPressed;
    this.interactPressed = false;
    this.eatPressed = false;
    return { interact, eat };
  }

  /**
   * Applies current frame inputs directly to an ECS PlayerInput component.
   */
  updatePlayerInput(playerInput) {
    if (!playerInput) return;

    playerInput.forward = this.keys.forward;
    playerInput.backward = this.keys.backward;
    playerInput.left = this.keys.left;
    playerInput.right = this.keys.right;
    playerInput.sprint = this.keys.sprint;

    const { interact, eat } = this.consumeActions();
    playerInput.interact = interact;
    playerInput.eat = eat;

    const { dx, dy } = this.consumeMouseDeltas();
    const mouseSens = 0.0022;
    playerInput.cameraYaw -= dx * mouseSens;
    playerInput.cameraPitch -= dy * mouseSens;

    const maxPitch = (Math.PI / 2) * 0.94;
    playerInput.cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, playerInput.cameraPitch));
  }
}
