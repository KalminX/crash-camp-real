/**
 * GameState — Centralized persistent game state surviving scene transitions.
 * Holds player stats, inventory, and story/progress flags.
 */
export class GameState {
  constructor() {
    this.state = {
      player: {
        health: 100,
        maxHealth: 100,
      },
      inventory: {
        wood: 0,
        maxWood: 5,
        food: 0,
        maxFood: 5,
      },
      story: {
        visitedScenes: {},
        beaconDiscovered: false,
        manifestFound: false,
      },
    };

    this.listeners = new Map();
  }

  get player() {
    return this.state.player;
  }

  get inventory() {
    return this.state.inventory;
  }

  get story() {
    return this.state.story;
  }

  // Inventory modifications
  addWood(amount = 1) {
    const inv = this.state.inventory;
    const added = Math.min(amount, inv.maxWood - inv.wood);
    inv.wood += added;
    this.emit('inventoryChanged', inv);
    return added;
  }

  removeWood(amount = 1) {
    const inv = this.state.inventory;
    const removed = Math.min(amount, inv.wood);
    inv.wood -= removed;
    this.emit('inventoryChanged', inv);
    return removed;
  }

  addFood(amount = 1) {
    const inv = this.state.inventory;
    const added = Math.min(amount, inv.maxFood - inv.food);
    inv.food += added;
    this.emit('inventoryChanged', inv);
    return added;
  }

  removeFood(amount = 1) {
    const inv = this.state.inventory;
    const removed = Math.min(amount, inv.food);
    inv.food -= removed;
    this.emit('inventoryChanged', inv);
    return removed;
  }

  // Player health
  damage(amount) {
    const p = this.state.player;
    p.health = Math.max(0, p.health - amount);
    this.emit('playerChanged', p);
  }

  heal(amount) {
    const p = this.state.player;
    p.health = Math.min(p.maxHealth, p.health + amount);
    this.emit('playerChanged', p);
  }

  // Story & scene tracking
  markSceneVisited(sceneId) {
    if (!this.state.story.visitedScenes[sceneId]) {
      this.state.story.visitedScenes[sceneId] = true;
      this.emit('sceneVisited', sceneId);
    }
  }

  setStory(key, value) {
    this.state.story[key] = value;
    this.emit('storyChanged', { key, value, story: this.state.story });
  }

  isSceneVisited(sceneId) {
    return !!this.state.story.visitedScenes[sceneId];
  }

  getVisitedSceneIds() {
    return Object.keys(this.state.story.visitedScenes);
  }

  // Reactive event observer
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}
