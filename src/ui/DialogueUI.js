/**
 * DialogueUI — Narrative dialogue and object inspection presentation system.
 * Designed following style_guide.txt: physical, restrained, anti-AI aesthetic.
 */

export class DialogueUI {
  constructor(game) {
    this.game = game;
    this.container = null;
    this.speakerEl = null;
    this.textEl = null;
    this.hintEl = null;

    this.active = false;
    this.currentCallback = null;

    this.init();
  }

  init() {
    if (document.getElementById('dialogue-box')) {
      this.container = document.getElementById('dialogue-box');
      this.speakerEl = document.getElementById('dialogue-speaker');
      this.textEl = document.getElementById('dialogue-text');
      this.hintEl = document.getElementById('dialogue-hint');
      return;
    }

    const box = document.createElement('div');
    box.id = 'dialogue-box';
    box.className = 'dialogue-box hidden';
    box.innerHTML = `
      <div class="dialogue-inner">
        <div class="dialogue-header">
          <span class="dialogue-tag" id="dialogue-speaker">OBJECT INSPECTION</span>
          <span class="dialogue-close" id="dialogue-close">✕</span>
        </div>
        <div class="dialogue-body" id="dialogue-text"></div>
        <div class="dialogue-footer" id="dialogue-hint">
          <span class="key-badge">E</span><span class="hint-text">Continue</span>
        </div>
      </div>
    `;

    document.body.appendChild(box);
    this.container = box;
    this.speakerEl = box.querySelector('#dialogue-speaker');
    this.textEl = box.querySelector('#dialogue-text');
    this.hintEl = box.querySelector('#dialogue-hint');

    // Dismiss click
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      this.advance();
    });

    box.querySelector('#dialogue-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.advance();
    });

    // Keyboard advance listener
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.advance();
      }
    });
  }

  /**
   * Display a dialogue or inspection message.
   *
   * @param {Object} options
   * @param {string} options.speaker - Name / Tag of speaker or object
   * @param {string} options.text - Narrative text
   * @param {Function} [options.onComplete] - Callback fired when dismissed
   */
  show({ speaker = 'SURVIVOR LOG', text = '', onComplete = null }) {
    if (!this.container) return;

    this.active = true;
    this.currentCallback = onComplete;

    if (this.speakerEl) this.speakerEl.textContent = speaker.toUpperCase();
    if (this.textEl) this.textEl.textContent = text;

    this.container.classList.remove('hidden');

    // Pause player movement while reading
    if (this.game && this.game.input && typeof this.game.input.reset === 'function') {
      this.game.input.reset();
    }
  }

  advance() {
    if (!this.active) return;

    const cb = this.currentCallback;
    this.hide();

    if (typeof cb === 'function') {
      try {
        cb();
      } catch (err) {
        console.warn('[DialogueUI] Error in onComplete callback:', err);
      }
    }
  }

  hide() {
    this.active = false;
    this.currentCallback = null;
    if (this.container) {
      this.container.classList.add('hidden');
    }
  }

  isOpen() {
    return this.active;
  }
}
