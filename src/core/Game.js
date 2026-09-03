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
    this.renderer.toneMappingExposure = 1.25;
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

    // Request pointer lock when canvas is clicked
    this.renderer.domElement.addEventListener('click', () => {
      this.audio.init();
      this.audio.resume();
      this.input.requestLock();
    });
  }

  start() {
    this.sceneManager.start();
    this.loop.start();
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
