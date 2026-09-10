/**
 * Scene Registry.
 * Uses lazy dynamic import() to ensure each scene module and its co-located map
 * are code-split into independent chunks and loaded only when entered.
 */
export const sceneRegistry = {
  'scene-00-intro': () => import('./act-0-prologue/scene-00-intro/SceneIntroFlight.js'),
  'scene-01-the-crash': () => import('./act-1-the-crash/scene-01-the-crash/SceneTheCrash.js'),
  'scene-02-the-last-fire': () => import('./act-1-the-crash/scene-02-the-last-fire/SceneTheLastFire.js'),
  'scene-03-morning-after': () => import('./act-2-stranded/scene-03-morning-after/SceneMorningAfter.js'),

  // Backwards compatibility alias
  'scene-one': () => import('./act-1-the-crash/scene-01-the-crash/SceneTheCrash.js'),
};
