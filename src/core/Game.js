import * as THREE from 'three';
import { Time } from './Time.js';
import { Input } from './Input.js';
import { GameState } from './GameState.js';
import { GameLoop } from './GameLoop.js';
import { SceneManager } from '../scenes/SceneManager.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { SceneNavUI } from '../ui/SceneNavUI.js';
import { DialogueUI } from '../ui/DialogueUI.js';

/**
 * Game — Master Application Coordinator.
 * Holds central rendering infrastructure, persistent GameState, Input, and SceneManager.
 */
export class Game {
  constructor(containerId = 'game-container') {
    this.container = document.getElementById(containerId) || document.body;

    // 1. Quality Presets & Dynamic Resolution Scaling (DRS)
    this.qualityPreset = typeof localStorage !== 'undefined'
      ? localStorage.getItem('crashcamp_quality_preset') || 'auto'
      : 'auto';
    this._currentDpr = this.calculateTargetDpr();
    this._drsCheckTimer = 0;

    // Central WebGL Renderer (Optimized high-performance pipeline)
    this.renderer = new THREE.WebGLRenderer({
      antialias: (window.devicePixelRatio || 1) < 1.3, // Redundant MSAA overhead disabled on Retina
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this._currentDpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.40;
    this.container.appendChild(this.renderer.domElement);

    // 2. Core Systems
    this.time = new Time();
    this.gameState = new GameState();
    this.audio = new AudioSystem();
    this.input = new Input(this.renderer.domElement);

    // 3. Scene Management
    this.sceneManager = new SceneManager(this);

    // 4. UI Overlay & Dialogue
    this.dialogue = new DialogueUI(this);
    this.ui = new SceneNavUI(this);

    // 5. Game Loop
    this.loop = new GameLoop(
      this.time,
      (dt) => this.update(dt),
      () => this.render()
    );

    this.setupListeners();
  }

  calculateTargetDpr() {
    const maxNativeDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    if (this.qualityPreset === 'high') {
      return Math.min(maxNativeDpr, 1.75);
    }
    if (this.qualityPreset === 'balanced') {
      return Math.min(maxNativeDpr, 1.25);
    }
    if (this.qualityPreset === 'performance') {
      return 1.0;
    }
    // 'auto': balanced target that adapts under load
    return Math.min(maxNativeDpr, 1.35);
  }

  setQualityPreset(preset) {
    this.qualityPreset = preset;
    try {
      localStorage.setItem('crashcamp_quality_preset', preset);
    } catch (_) {}

    this._currentDpr = this.calculateTargetDpr();
    this.renderer.setPixelRatio(this._currentDpr);

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);

    const scene = this.sceneManager.getCurrentScene();
    if (scene && typeof scene.onResize === 'function') {
      scene.onResize(width, height);
    }

    if (this.ui) {
      this.ui.showToast(`Graphics Preset: ${preset.toUpperCase()} (${this._currentDpr.toFixed(2)}x DPR)`);
    }
  }

  getCurrentDpr() {
    return this._currentDpr || 1.0;
  }

  setupListeners() {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this._currentDpr = this.calculateTargetDpr();
      this.renderer.setPixelRatio(this._currentDpr);
      this.renderer.setSize(width, height);

      const scene = this.sceneManager.getCurrentScene();
      if (scene && typeof scene.onResize === 'function') {
        scene.onResize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });

    // Initialize audio on first canvas interaction (without capturing mouse)
    this.renderer.domElement.addEventListener('click', () => {
      this.audio.init();
      this.audio.resume();
    });

    // Listen for camera view toggle
    this.input.onToggleView = () => {
      this.toggleCameraMode();
    };
  }

  toggleCameraMode() {
    const scene = this.sceneManager.getCurrentScene();
    if (scene && scene.renderSystem) {
      const mode = scene.renderSystem.toggleCameraMode();
      this.updateViewUI(mode);
      if (this.ui) {
        this.ui.showToast(mode === 'birds-eye' ? "Camera: Bird's-Eye View (Overhead)" : "Camera: First-Person View");
      }
      return mode;
    }
    return null;
  }

  updateViewUI(mode) {
    const panelBtn = document.getElementById('panel-view-btn');
    if (panelBtn) {
      panelBtn.textContent = mode === 'birds-eye' ? 'BIRD VIEW' : 'FPV VIEW';
      panelBtn.classList.toggle('active', mode === 'birds-eye');
    }
    const touchBtn = document.getElementById('touch-view-badge');
    if (touchBtn) {
      touchBtn.textContent = mode === 'birds-eye' ? 'VIEW: BIRD' : 'VIEW: FPV';
      touchBtn.classList.toggle('active', mode === 'birds-eye');
    }
  }

  updateLoadingProgress(percent) {
    const bar = document.getElementById('loading-bar');
    const status = document.getElementById('loading-status');
    if (bar) {
      bar.style.width = `${percent}%`;
    }
    if (status) {
      status.textContent = `Loading survivor assets... ${percent}%`;
    }
  }

  hideLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
      screen.classList.add('fade-out');
      setTimeout(() => {
        screen.style.display = 'none';
      }, 500);
    }
  }

  async start() {
    this.updateLoadingProgress(15);
    this.loop.start();
    try {
      await this.sceneManager.start();
      this.updateLoadingProgress(100);
    } catch (err) {
      console.error('[Game] Error starting scene:', err);
    } finally {
      setTimeout(() => this.hideLoadingScreen(), 200);
    }
  }

  update(dt) {
    this.updateDrs(dt);
    this.sceneManager.update(dt);
    if (this.ui && typeof this.ui.update === 'function') {
      this.ui.update(dt);
    }
  }

  updateDrs(dt) {
    if (this.qualityPreset !== 'auto') return;

    this._drsCheckTimer = (this._drsCheckTimer || 0) + dt;
    if (this._drsCheckTimer < 0.6) return;
    this._drsCheckTimer = 0;

    const fps = this.time ? this.time.fps : 60;
    const maxNativeDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const maxDpr = Math.min(maxNativeDpr, 1.35);
    const minDpr = 1.0;

    if (fps < 50 && this._currentDpr > minDpr) {
      // Step down pixel ratio when framerate dips below target
      this._currentDpr = Math.max(minDpr, parseFloat((this._currentDpr - 0.10).toFixed(2)));
      this.renderer.setPixelRatio(this._currentDpr);
    } else if (fps >= 58 && this._currentDpr < maxDpr) {
      // Step up pixel ratio smoothly when GPU headroom exists
      this._currentDpr = Math.min(maxDpr, parseFloat((this._currentDpr + 0.05).toFixed(2)));
      this.renderer.setPixelRatio(this._currentDpr);
    }
  }

  render() {
    const scene = this.sceneManager.getCurrentScene();
    if (scene && scene.threeScene && scene.camera) {
      this.renderer.render(scene.threeScene, scene.camera);
    }
  }
}
