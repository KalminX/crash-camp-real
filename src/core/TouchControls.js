/**
 * TouchControls — Faint, responsive on-screen virtual controllers for mobile & touch devices.
 * Features:
 * - Analog-style virtual joystick on the lower left for fluid movement (WASD)
 * - Touch camera pan zone on the right for free look (yaw & pitch)
 * - Faint PlayStation-style action cluster on the lower right:
 *   - ✕ (Cross): Interact / Action [E]
 *   - △ (Triangle): Sprint toggle [Shift]
 *   - ▢ (Square): Use / Eat [Q]
 * - Contextual mobile indications and responsive design.
 */
export class TouchControls {
  constructor(inputManager) {
    this.input = inputManager;
    this.container = null;
    this.enabled = false;

    // Joystick state
    this.joystickTouchId = null;
    this.joystickBasePos = { x: 0, y: 0 };
    this.joystickRadius = 52;
    this.thumbEl = null;
    this.baseEl = null;

    // Camera look touch state
    this.lookTouchId = null;
    this.lookLastPos = { x: 0, y: 0 };
    this.lookSens = 1.35;

    // Sprint toggle state
    this.sprintToggled = false;

    this.init();
  }

  static isMobileDevice() {
    if (typeof window === 'undefined') return false;
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    return Boolean((isCoarse && hasTouch) || (isMobileUA && hasTouch));
  }

  init() {
    // Controls should strictly only instantiate and work on mobile versions
    if (!TouchControls.isMobileDevice()) {
      return;
    }

    this.createDOM();
    this.bindEvents();
    this.setEnabled(true);

    window.addEventListener('resize', () => {
      const isMobile = TouchControls.isMobileDevice();
      if (!this.container && isMobile) {
        this.createDOM();
        this.bindEvents();
      }
      this.setEnabled(isMobile);
    });
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'touch-controls-container';
    this.container.className = 'touch-controls-container hidden';

    this.container.innerHTML = `
      <!-- Touch Camera Look Zone (Covers Right Screen Area) -->
      <div id="touch-look-zone" class="touch-look-zone">
        <div class="touch-look-hint">DRAG TO LOOK</div>
      </div>

      <!-- Virtual Joystick Zone (Bottom Left) -->
      <div id="touch-joystick-zone" class="touch-joystick-zone">
        <div id="touch-joystick-base" class="touch-joystick-base">
          <span class="joy-cardinal joy-n">▲</span>
          <span class="joy-cardinal joy-s">▼</span>
          <span class="joy-cardinal joy-w">◄</span>
          <span class="joy-cardinal joy-e">►</span>
          <div id="touch-joystick-thumb" class="touch-joystick-thumb"></div>
        </div>
        <div class="touch-label">MOVE</div>
      </div>

      <!-- PlayStation-Style Action Button Cluster (Bottom Right) -->
      <div id="touch-action-cluster" class="touch-action-cluster">
        <!-- Triangle / Sprint (Top) -->
        <button type="button" class="ps-btn ps-triangle" id="ps-btn-sprint" aria-label="Sprint">
          <span class="ps-glyph">△</span>
          <span class="ps-tag">RUN</span>
        </button>

        <!-- Square / Eat & Use (Left) -->
        <button type="button" class="ps-btn ps-square" id="ps-btn-use" aria-label="Use Item">
          <span class="ps-glyph">▢</span>
          <span class="ps-tag">USE</span>
        </button>

        <!-- Cross / Primary Interact (Bottom / Main) -->
        <button type="button" class="ps-btn ps-cross" id="ps-btn-interact" aria-label="Interact">
          <span class="ps-glyph">✕</span>
          <span class="ps-tag">ACT</span>
        </button>
      </div>

      <!-- Quick Toggle for Desktop / Mobile preference -->
      <div class="touch-top-badges">
        <button type="button" id="touch-toggle-badge" class="touch-toggle-badge" title="Toggle On-Screen Touch Controls">
          TOUCH: ON
        </button>
        <button type="button" id="touch-view-badge" class="touch-toggle-badge touch-view-badge" title="Switch Camera View [V]">
          VIEW: BIRD
        </button>
      </div>
    `;

    document.body.appendChild(this.container);

    this.baseEl = document.getElementById('touch-joystick-base');
    this.thumbEl = document.getElementById('touch-joystick-thumb');
  }

  bindEvents() {
    const joyZone = document.getElementById('touch-joystick-zone');
    const lookZone = document.getElementById('touch-look-zone');
    const btnInteract = document.getElementById('ps-btn-interact');
    const btnSprint = document.getElementById('ps-btn-sprint');
    const btnUse = document.getElementById('ps-btn-use');
    const toggleBadge = document.getElementById('touch-toggle-badge');

    // 1. Joystick Touch Tracking
    if (joyZone) {
      joyZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const touch = e.changedTouches[0];
          this.joystickTouchId = touch.identifier;

          const rect = this.baseEl.getBoundingClientRect();
          this.joystickBasePos = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };

          this.updateJoystick(touch.clientX, touch.clientY);
        },
        { passive: false }
      );

      joyZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.joystickTouchId) {
              this.updateJoystick(touch.clientX, touch.clientY);
              break;
            }
          }
        },
        { passive: false }
      );

      const resetJoy = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            this.joystickTouchId = null;
            this.resetJoystick();
            break;
          }
        }
      };

      joyZone.addEventListener('touchend', resetJoy, { passive: false });
      joyZone.addEventListener('touchcancel', resetJoy, { passive: false });
    }

    // 2. Camera Look Touch Tracking (Right Screen Zone)
    if (lookZone) {
      lookZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const touch = e.changedTouches[0];
          this.lookTouchId = touch.identifier;
          this.lookLastPos = { x: touch.clientX, y: touch.clientY };
        },
        { passive: false }
      );

      lookZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.lookTouchId) {
              const dx = (touch.clientX - this.lookLastPos.x) * this.lookSens;
              const dy = (touch.clientY - this.lookLastPos.y) * this.lookSens;
              this.lookLastPos = { x: touch.clientX, y: touch.clientY };

              // Feed camera delta into Input manager
              this.input.mouseDeltaX += dx;
              this.input.mouseDeltaY += dy;
              break;
            }
          }
        },
        { passive: false }
      );

      const resetLook = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            this.lookTouchId = null;
            break;
          }
        }
      };

      lookZone.addEventListener('touchend', resetLook, { passive: false });
      lookZone.addEventListener('touchcancel', resetLook, { passive: false });
    }

    // 3. PS-Style Action Buttons
    // Cross (✕) -> Interact [E]
    if (btnInteract) {
      const triggerInteract = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.input.interactPressed = true;
        btnInteract.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(25);
      };
      const releaseInteract = () => {
        btnInteract.classList.remove('active');
      };

      btnInteract.addEventListener('touchstart', triggerInteract, { passive: false });
      btnInteract.addEventListener('touchend', releaseInteract, { passive: false });
      btnInteract.addEventListener('mousedown', triggerInteract);
      btnInteract.addEventListener('mouseup', releaseInteract);
    }

    // Triangle (△) -> Sprint [Shift]
    if (btnSprint) {
      const toggleSprint = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sprintToggled = !this.sprintToggled;
        this.input.keys.sprint = this.sprintToggled;
        btnSprint.classList.toggle('active', this.sprintToggled);
        if (navigator.vibrate) navigator.vibrate(20);
      };

      btnSprint.addEventListener('touchstart', toggleSprint, { passive: false });
      btnSprint.addEventListener('click', toggleSprint);
    }

    // Square (▢) -> Use / Eat [Q]
    if (btnUse) {
      const triggerUse = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.input.eatPressed = true;
        btnUse.classList.add('active');
        if (navigator.vibrate) navigator.vibrate(25);
      };
      const releaseUse = () => {
        btnUse.classList.remove('active');
      };

      btnUse.addEventListener('touchstart', triggerUse, { passive: false });
      btnUse.addEventListener('touchend', releaseUse, { passive: false });
      btnUse.addEventListener('mousedown', triggerUse);
      btnUse.addEventListener('mouseup', releaseUse);
    }

    // Toggle button for testing or hiding
    if (toggleBadge) {
      toggleBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setEnabled(!this.enabled);
      });
    }

    const viewBadge = document.getElementById('touch-view-badge');
    if (viewBadge) {
      viewBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.input.viewTogglePressed = true;
        if (typeof this.input.onToggleView === 'function') {
          this.input.onToggleView();
        }
      });
    }
  }

  updateJoystick(clientX, clientY) {
    let dx = clientX - this.joystickBasePos.x;
    let dy = clientY - this.joystickBasePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.joystickRadius) {
      dx = (dx / distance) * this.joystickRadius;
      dy = (dy / distance) * this.joystickRadius;
    }

    if (this.thumbEl) {
      this.thumbEl.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // Deadzone threshold of 12px
    const deadzone = 12;
    this.input.keys.forward = dy < -deadzone;
    this.input.keys.backward = dy > deadzone;
    this.input.keys.left = dx < -deadzone;
    this.input.keys.right = dx > deadzone;
  }

  resetJoystick() {
    if (this.thumbEl) {
      this.thumbEl.style.transform = 'translate(0px, 0px)';
    }
    this.input.keys.forward = false;
    this.input.keys.backward = false;
    this.input.keys.left = false;
    this.input.keys.right = false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.container) {
      this.container.classList.toggle('hidden', !enabled);
    }
    const badge = document.getElementById('touch-toggle-badge');
    if (badge) {
      badge.classList.toggle('active', enabled);
      badge.textContent = enabled ? 'TOUCH: ON' : 'TOUCH: OFF';
    }
  }
}
