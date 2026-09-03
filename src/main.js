import { Game } from './core/Game.js';

/**
 * Crash Camp — Multi-Scene Architecture Entry Point.
 */
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game('game-container');
  game.start();

  // Expose on window for manual test verification in console
  window.__CRASH_CAMP__ = game;
});
