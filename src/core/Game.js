import * as THREE from 'three';
import { Time } from './Time.js';
import { Input } from './Input.js';
import { GameState } from './GameState.js';
import { GameLoop } from './GameLoop.js';
import { SceneManager } from '../scenes/SceneManager.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { SceneNavUI } from '../ui/SceneNavUI.js';

/**
 * Game — Master Application Coordinator.
 * Holds central rendering infrastructure, persistent GameState, Input, and SceneManager.
 */
export class Game {
  constructor(containerId = 'game-container') {
    this.container = document.getElementById(containerId) || document.body;

    // 1. Central WebGL Renderer (Shared across all scenes)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    // 4. UI Overlay
    this.ui = new SceneNavUI(this);

    // 5. Game Loop
    this.loop = new GameLoop(
      this.time,
      (dt) => this.update(dt),
      () => this.render()
    );

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.renderer.setSize(width, height);

      const scene = this.sceneManager.getCurrentScene();
      if (scene && typeof scene.onResize === 'function') {
        scene.onResize(width, height);
      }
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
    this.sceneManager.update(dt);
  }

  render() {
    const scene = this.sceneManager.getCurrentScene();
    if (scene && scene.threeScene && scene.camera) {
      this.renderer.render(scene.threeScene, scene.camera);
    }
  }
}
