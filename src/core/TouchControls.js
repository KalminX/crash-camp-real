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

    // Pinch-to-zoom touch state
    this.isPinching = false;
    this.pinchLastDist = 0;

    // Sprint toggle state
    this.sprintToggled = false;

    this.init();
  }

  static isMobileDevice() {
    if (typeof window === 'undefined') return false;
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const hasTouchParam = typeof window.location !== 'undefined' && window.location.search.includes('touch=1');
    return Boolean((isCoarse && hasTouch) || (isMobileUA && hasTouch) || hasTouchParam);
  }

  init() {
    if (!TouchControls.isMobileDevice()) {
      return;
    }

    this.createDOM();
    this.bindEvents();
    this.setEnabled(true);
    this.startStateObservers();

    window.addEventListener('resize', () => {
      const isMobile = TouchControls.isMobileDevice();
      if (!this.container && isMobile) {
        this.createDOM();
        this.bindEvents();
        this.startStateObservers();
      }
      this.setEnabled(isMobile);
    });
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'touch-controls-container';
    this.container.className = 'touch-controls-container hidden';

    this.container.innerHTML = `
      <!-- Segregated Camera Look & Pinch-to-Zoom Zone (Upper-Right) -->
      <div id="touch-look-zone" class="touch-look-zone">
        <div class="touch-look-hint">DRAG TO LOOK • PINCH TO ZOOM</div>
      </div>

      <!-- Dynamic Floating Virtual Joystick Area (Bottom-Left Quadrant) -->
      <div id="touch-joystick-toucharea" class="touch-joystick-toucharea"></div>

      <!-- Virtual Joystick Visual Base -->
      <div id="touch-joystick-base" class="touch-joystick-base dynamic faint">
        <span class="joy-cardinal joy-n" id="joy-n">▲</span>
        <span class="joy-cardinal joy-s" id="joy-s">▼</span>
        <span class="joy-cardinal joy-w" id="joy-w">◄</span>
        <span class="joy-cardinal joy-e" id="joy-e">►</span>
        <div id="touch-joystick-thumb" class="touch-joystick-thumb"></div>
      </div>

      <!-- Unambiguous Physical Tactile Action Cluster (Bottom Right) -->
      <div id="touch-action-cluster" class="touch-tactile-cluster">
        <div class="touch-row-top">
          <!-- Sprint Toggle Button with explicit LED indicator -->
          <button type="button" class="touch-btn touch-btn-sprint" id="touch-btn-sprint" aria-label="Toggle Sprint">
            <span class="sprint-led" id="touch-sprint-led"></span>
            <span class="btn-main-label" id="touch-sprint-label">SPRINT [OFF]</span>
          </button>
        </div>

        <div class="touch-row-bottom">
          <!-- Eat / Use Consumable Button -->
          <button type="button" class="touch-btn touch-btn-eat" id="touch-btn-eat" aria-label="Eat / Use Item">
            <span class="btn-main-label">EAT [Q]</span>
            <span class="food-badge" id="touch-food-badge">(x0)</span>
          </button>

          <!-- Primary Interact Action Button -->
          <button type="button" class="touch-btn touch-btn-interact" id="touch-btn-interact" aria-label="Interact">
            <span class="btn-main-label">INTERACT</span>
            <span class="btn-key-tag">[E]</span>
          </button>
        </div>
      </div>

      <!-- Top Quick Badges -->
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
    this.joyAreaEl = document.getElementById('touch-joystick-toucharea');
    this.cardinals = {
      n: document.getElementById('joy-n'),
      s: document.getElementById('joy-s'),
      w: document.getElementById('joy-w'),
      e: document.getElementById('joy-e'),
    };
  }

  bindEvents() {
    const joyArea = this.joyAreaEl;
    const lookZone = document.getElementById('touch-look-zone');
    const btnInteract = document.getElementById('touch-btn-interact');
    const btnSprint = document.getElementById('touch-btn-sprint');
    const btnUse = document.getElementById('touch-btn-eat');
    const toggleBadge = document.getElementById('touch-toggle-badge');
    const viewBadge = document.getElementById('touch-view-badge');

    // 1. Dynamic Floating Joystick Touch Tracking
    if (joyArea && this.baseEl) {
      joyArea.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const touch = e.changedTouches[0];
          this.joystickTouchId = touch.identifier;

          // Dynamically center joystick base at touch origin
          this.joystickBasePos = { x: touch.clientX, y: touch.clientY };
          this.baseEl.style.left = `${touch.clientX - 60}px`;
          this.baseEl.style.top = `${touch.clientY - 60}px`;
          this.baseEl.style.bottom = 'auto';
          this.baseEl.style.right = 'auto';
          this.baseEl.classList.remove('faint');
          this.baseEl.classList.add('engaged');

          if (navigator.vibrate) navigator.vibrate(10);
          this.updateJoystick(touch.clientX, touch.clientY);
        },
        { passive: false }
      );

      joyArea.addEventListener(
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

      joyArea.addEventListener('touchend', resetJoy, { passive: false });
      joyArea.addEventListener('touchcancel', resetJoy, { passive: false });
    }

    // 2. Camera Look & Pinch-to-Zoom Touch Tracking
    if (lookZone) {
      const getTouchesOnLookZone = (e) => {
        const touches = [];
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (t.identifier !== this.joystickTouchId) {
            touches.push(t);
          }
        }
        return touches;
      };

      lookZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          const activeTouches = getTouchesOnLookZone(e);

          if (activeTouches.length >= 2) {
            this.isPinching = true;
            this.lookTouchId = null;
            const t0 = activeTouches[0];
            const t1 = activeTouches[1];
            this.pinchLastDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
          } else if (activeTouches.length === 1 && !this.isPinching) {
            const touch = activeTouches[0];
            this.lookTouchId = touch.identifier;
            this.lookLastPos = { x: touch.clientX, y: touch.clientY };
          }
        },
        { passive: false }
      );

      lookZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          const activeTouches = getTouchesOnLookZone(e);

          if (activeTouches.length >= 2) {
            this.isPinching = true;
            this.lookTouchId = null;
            const t0 = activeTouches[0];
            const t1 = activeTouches[1];
            const currentDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

            if (this.pinchLastDist > 0) {
              const deltaDist = currentDist - this.pinchLastDist;
              const zoomScale = 0.04;
              this.input.zoomDelta -= deltaDist * zoomScale;
            }
            this.pinchLastDist = currentDist;
          } else if (activeTouches.length === 1 && !this.isPinching) {
            const touch = activeTouches[0];
            if (touch.identifier === this.lookTouchId) {
              const dx = (touch.clientX - this.lookLastPos.x) * this.lookSens;
              const dy = (touch.clientY - this.lookLastPos.y) * this.lookSens;
              this.lookLastPos = { x: touch.clientX, y: touch.clientY };

              this.input.mouseDeltaX += dx;
              this.input.mouseDeltaY += dy;
            }
          }
        },
        { passive: false }
      );

      const resetLookOrPinch = (e) => {
        const activeTouches = getTouchesOnLookZone(e);
        if (activeTouches.length >= 2) {
          const t0 = activeTouches[0];
          const t1 = activeTouches[1];
          this.pinchLastDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        } else if (activeTouches.length === 1) {
          this.isPinching = false;
          this.pinchLastDist = 0;
          const touch = activeTouches[0];
          this.lookTouchId = touch.identifier;
          this.lookLastPos = { x: touch.clientX, y: touch.clientY };
        } else {
          this.isPinching = false;
          this.pinchLastDist = 0;
          this.lookTouchId = null;
        }
      };

      lookZone.addEventListener('touchend', resetLookOrPinch, { passive: false });
      lookZone.addEventListener('touchcancel', resetLookOrPinch, { passive: false });
    }

    // 3. Primary Action Button: INTERACT [E]
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

    // 4. Movement Modifier: SPRINT Toggle
    if (btnSprint) {
      const toggleSprint = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sprintToggled = !this.sprintToggled;
        this.input.keys.sprint = this.sprintToggled;
        btnSprint.classList.toggle('active', this.sprintToggled);

        const label = document.getElementById('touch-sprint-label');
        if (label) {
          label.textContent = this.sprintToggled ? 'SPRINT [ON]' : 'SPRINT [OFF]';
        }
        if (navigator.vibrate) navigator.vibrate(20);
      };

      btnSprint.addEventListener('touchstart', toggleSprint, { passive: false });
      btnSprint.addEventListener('click', toggleSprint);
    }

    // 5. Consumable: EAT / USE [Q]
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

    // 6. Quick Control Toggles
    if (toggleBadge) {
      toggleBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setEnabled(!this.enabled);
      });
    }

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

  startStateObservers() {
    if (this.updateInterval) clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => {
      // 1. Check interaction prompt proximity to pulse the interact button
      const promptEl = document.getElementById('interaction-prompt');
      const btnInteract = document.getElementById('touch-btn-interact');
      if (btnInteract) {
        const isNear = promptEl && !promptEl.classList.contains('hidden');
        btnInteract.classList.toggle('pulse-ready', Boolean(isNear));
      }

      // 2. Sync food count on Eat button
      const foodCountEl = document.getElementById('touch-food-badge');
      const btnEat = document.getElementById('touch-btn-eat');
      const hudFoodEl = document.getElementById('ui-inventory-food');
      if (foodCountEl && hudFoodEl) {
        const countText = hudFoodEl.textContent.trim() || '0';
        foodCountEl.textContent = `(${countText})`;
        const count = parseInt(countText, 10);
        if (btnEat) {
          btnEat.classList.toggle('disabled', count === 0);
        }
      }
    }, 200);
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

    const deadzone = 12;
    const isN = dy < -deadzone;
    const isS = dy > deadzone;
    const isW = dx < -deadzone;
    const isE = dx > deadzone;

    this.input.keys.forward = isN;
    this.input.keys.backward = isS;
    this.input.keys.left = isW;
    this.input.keys.right = isE;

    // Highlight directional cardinal arrows
    if (this.cardinals.n) this.cardinals.n.classList.toggle('active', isN);
    if (this.cardinals.s) this.cardinals.s.classList.toggle('active', isS);
    if (this.cardinals.w) this.cardinals.w.classList.toggle('active', isW);
    if (this.cardinals.e) this.cardinals.e.classList.toggle('active', isE);
  }

  resetJoystick() {
    if (this.thumbEl) {
      this.thumbEl.style.transform = 'translate(0px, 0px)';
    }
    if (this.baseEl) {
      this.baseEl.classList.remove('engaged');
      this.baseEl.classList.add('faint');
      this.baseEl.style.left = '32px';
      this.baseEl.style.bottom = '32px';
      this.baseEl.style.top = 'auto';
      this.baseEl.style.right = 'auto';
    }

    this.input.keys.forward = false;
    this.input.keys.backward = false;
    this.input.keys.left = false;
    this.input.keys.right = false;

    if (this.cardinals.n) this.cardinals.n.classList.remove('active');
    if (this.cardinals.s) this.cardinals.s.classList.remove('active');
    if (this.cardinals.w) this.cardinals.w.classList.remove('active');
    if (this.cardinals.e) this.cardinals.e.classList.remove('active');
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
