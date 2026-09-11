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

// Register PWA Service Worker for 100% offline gameplay
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] ServiceWorker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] ServiceWorker registration failed:', err);
      });
  });
}

