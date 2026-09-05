import { TouchControls } from './TouchControls.js';

/**
 * Input — Centralized global input manager.
 * Captures free mouse drag orbit (Pitch & Yaw) without capturing/locking the mouse cursor.
 * Tracks WASD movement, action keys, and mobile touch controls.
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
    this.viewTogglePressed = false;
    this.onToggleView = null;

    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.zoomDelta = 0;

    // Yaw: horizontal orbit angle (0 = camera behind player looking North towards wreckage)
    this.cameraYaw = 0;
    // Orbit Pitch: elevation angle for bird's-eye view (~39° default overhead)
    this.orbitPitch = 0.68;
    // Camera Pitch: eye-level look angle for first-person view (0 = level horizon)
    this.cameraPitch = 0.0;

    // Mouse drag state without capturing pointer lock
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.setupListeners();
    this.touchControls = new TouchControls(this);
  }

  setupListeners() {
    // Prevent default context menu on right click so right-drag orbit is smooth
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // 1. Keyboard Controls
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
        case 'KeyV':
        case 'KeyC':
          this.viewTogglePressed = true;
          if (typeof this.onToggleView === 'function') {
            this.onToggleView();
          }
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

    // 2. Free Mouse Drag Orbit (No pointer capture)
    window.addEventListener('mousedown', (e) => {
      // Don't start camera orbit if clicking on UI buttons or panels
      if (e.target && (e.target.closest('button') || e.target.closest('.nav-panel') || e.target.closest('.touch-controls-container'))) {
        return;
      }

      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (e.button === 0) {
        this.interactPressed = true;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.mouseDeltaX += dx;
        this.mouseDeltaY += dy;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // 3. Camera Zoom via Mouse Scroll
    window.addEventListener(
      'wheel',
      (e) => {
        this.zoomDelta += Math.sign(e.deltaY);
      },
      { passive: true }
    );
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
    const toggleView = this.viewTogglePressed;
    this.interactPressed = false;
    this.eatPressed = false;
    this.viewTogglePressed = false;
    return { interact, eat, toggleView };
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

    const { interact, eat, toggleView } = this.consumeActions();
    playerInput.interact = interact;
    playerInput.eat = eat;
    playerInput.toggleView = toggleView;

    const { dx, dy } = this.consumeMouseDeltas();
    const mouseSens = 0.0035;

    // Orbit Yaw (horizontal revolution around character)
    this.cameraYaw -= dx * mouseSens;
    playerInput.cameraYaw = this.cameraYaw;

    // Orbit Pitch (vertical elevation in bird's-eye view, safely limited to avoid overhead turntable spin)
    this.orbitPitch -= dy * mouseSens;
    this.orbitPitch = Math.max(0.20, Math.min(1.25, this.orbitPitch));
    playerInput.orbitPitch = this.orbitPitch;

    // Look Pitch (vertical look angle in first-person view)
    this.cameraPitch -= dy * mouseSens;
    this.cameraPitch = Math.max(-1.40, Math.min(1.40, this.cameraPitch));
    playerInput.cameraPitch = this.cameraPitch;

    // Zoom
    playerInput.zoomDelta = this.zoomDelta;
    this.zoomDelta = 0;

    // No roll
    playerInput.cameraRoll = 0;
  }
}
