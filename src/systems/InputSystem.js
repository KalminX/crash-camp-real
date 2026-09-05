import { TouchControls } from "./TouchControls.js";

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

    // Mouse orbit
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    // Mouse-wheel zoom
    this.zoomDelta = 0;

    // Camera state
    this.cameraYaw = 0;
    this.orbitPitch = 0.68;
    this.cameraPitch = 0.0;

    this.mouseSensitivity = 0.0035;
    this.zoomStep = 1;

    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.setupListeners();

    this.touchControls = new TouchControls(this);
  }

  setupListeners() {
    this.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    window.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          this.keys.forward = true;
          break;

        case "KeyS":
        case "ArrowDown":
          this.keys.backward = true;
          break;

        case "KeyA":
        case "ArrowLeft":
          this.keys.left = true;
          break;

        case "KeyD":
        case "ArrowRight":
          this.keys.right = true;
          break;

        case "ShiftLeft":
        case "ShiftRight":
          this.keys.sprint = true;
          break;

        case "KeyE":
          this.interactPressed = true;
          break;

        case "KeyQ":
        case "Digit1":
          this.eatPressed = true;
          break;

        case "KeyV":
        case "KeyC":
          this.viewTogglePressed = true;

          if (typeof this.onToggleView === "function") {
            this.onToggleView();
          }

          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          this.keys.forward = false;
          break;

        case "KeyS":
        case "ArrowDown":
          this.keys.backward = false;
          break;

        case "KeyA":
        case "ArrowLeft":
          this.keys.left = false;
          break;

        case "KeyD":
        case "ArrowRight":
          this.keys.right = false;
          break;

        case "ShiftLeft":
        case "ShiftRight":
          this.keys.sprint = false;
          break;
      }
    });

    /*
     * Mouse drag = camera orbit.
     *
     * Moving the mouse does NOT zoom.
     * Zoom is handled exclusively by the wheel listener below.
     */
    window.addEventListener("mousedown", (e) => {
      if (
        e.target &&
        (e.target.closest("button") ||
          e.target.closest(".nav-panel") ||
          e.target.closest(".touch-controls-container"))
      ) {
        return;
      }

      this.isDragging = true;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Left click still performs interaction.
      if (e.button === 0) {
        this.interactPressed = true;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) {
        return;
      }

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.mouseDeltaX += dx;
      this.mouseDeltaY += dy;
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    window.addEventListener("mouseleave", () => {
      this.isDragging = false;
    });

    /*
     * Mouse wheel = ONLY zoom.
     *
     * Positive deltaY = zoom out.
     * Negative deltaY = zoom in.
     */
    window.addEventListener(
      "wheel",
      (e) => {
        this.zoomDelta += Math.sign(e.deltaY) * this.zoomStep;
      },
      { passive: true },
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

    return {
      interact,
      eat,
      toggleView,
    };
  }

  updatePlayerInput(playerInput) {
    if (!playerInput) {
      return;
    }

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

    /*
     * Horizontal mouse movement rotates the camera around
     * the player.
     */
    this.cameraYaw -= dx * this.mouseSensitivity;

    /*
     * Vertical mouse movement changes the orbit angle.
     *
     * It is clamped so the camera cannot flip upside down.
     */
    this.orbitPitch -= dy * this.mouseSensitivity;

    this.orbitPitch = Math.max(0.2, Math.min(1.25, this.orbitPitch));

    /*
     * First-person pitch uses the same physical mouse motion.
     */
    this.cameraPitch -= dy * this.mouseSensitivity;

    this.cameraPitch = Math.max(-1.4, Math.min(1.4, this.cameraPitch));

    playerInput.cameraYaw = this.cameraYaw;
    playerInput.orbitPitch = this.orbitPitch;
    playerInput.cameraPitch = this.cameraPitch;

    /*
     * This value is ONLY populated by the wheel listener.
     * Mouse movement never touches it.
     */
    playerInput.zoomDelta = this.zoomDelta;

    this.zoomDelta = 0;

    playerInput.cameraRoll = 0;
  }
}
