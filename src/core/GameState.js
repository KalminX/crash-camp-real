import { storageService } from './StorageService.js';
import { sceneConfig } from '../scenes/sceneConfig.js';

/**
 * GameState — Centralized persistent game state surviving scene transitions.
 * Holds player vitals, inventory, story flags, and scene goals.
 * Continuously persists to LocalStorage and IndexedDB via StorageService.
 */
export class GameState {
  constructor() {
    this.listeners = new Map();
    this.state = this.getDefaultState();

    // Hydrate synchronously from storage if save data exists
    const saved = storageService.loadSync();
    if (saved) {
      this.hydrate(saved);
    }
  }

  getDefaultState() {
    return {
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
      goals: {
        'scene-01-the-crash': {},
        'scene-02-the-last-fire': {},
        'scene-03-morning-after': {},
      },
      story: {
        visitedScenes: {},
        beaconDiscovered: false,
        manifestFound: false,
        tracksFollowed: false,
      },
    };
  }

  hydrate(saved) {
    if (saved.player) Object.assign(this.state.player, saved.player);
    if (saved.inventory) Object.assign(this.state.inventory, saved.inventory);
    if (saved.goals) {
      this.state.goals = Object.assign({}, this.state.goals, saved.goals);
    }
    if (saved.story) Object.assign(this.state.story, saved.story);
  }

  persist() {
    storageService.save(this.state);
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

  get goals() {
    return this.state.goals;
  }

  // --- Inventory modifications ---
  addWood(amount = 1) {
    const inv = this.state.inventory;
    const added = Math.min(amount, inv.maxWood - inv.wood);
    inv.wood += added;
    this.persist();
    this.emit('inventoryChanged', inv);
    return added;
  }

  removeWood(amount = 1) {
    const inv = this.state.inventory;
    const removed = Math.min(amount, inv.wood);
    inv.wood -= removed;
    this.persist();
    this.emit('inventoryChanged', inv);
    return removed;
  }

  addFood(amount = 1) {
    const inv = this.state.inventory;
    const added = Math.min(amount, inv.maxFood - inv.food);
    inv.food += added;
    this.persist();
    this.emit('inventoryChanged', inv);
    return added;
  }

  removeFood(amount = 1) {
    const inv = this.state.inventory;
    const removed = Math.min(amount, inv.food);
    inv.food -= removed;
    this.persist();
    this.emit('inventoryChanged', inv);
    return removed;
  }

  // --- Player health ---
  damage(amount) {
    const p = this.state.player;
    p.health = Math.max(0, p.health - amount);
    this.persist();
    this.emit('playerChanged', p);
  }

  heal(amount) {
    const p = this.state.player;
    p.health = Math.min(p.maxHealth, p.health + amount);
    this.persist();
    this.emit('playerChanged', p);
  }

  // --- Story & scene tracking ---
  markSceneVisited(sceneId) {
    if (!this.state.story.visitedScenes[sceneId]) {
      this.state.story.visitedScenes[sceneId] = true;
      this.persist();
      this.emit('sceneVisited', sceneId);
    }
  }

  setStory(key, value) {
    this.state.story[key] = value;
    this.persist();
    this.emit('storyChanged', { key, value, story: this.state.story });
  }

  // --- Scene Goals & Objectives ---
  completeGoal(sceneId, goalId) {
    if (!this.state.goals[sceneId]) {
      this.state.goals[sceneId] = {};
    }

    if (this.state.goals[sceneId][goalId]) {
      return false; // Already completed
    }

    this.state.goals[sceneId][goalId] = true;
    this.persist();

    this.emit('goalChanged', { sceneId, goalId, completed: true });

    // Check if all goals for this scene are finished
    const cfg = sceneConfig.scenes[sceneId];
    const goalsList = cfg?.goals || [];

    const allFinished =
      goalsList.length > 0 &&
      goalsList.every((g) => this.state.goals[sceneId]?.[g.id] === true);

    if (allFinished) {
      const nextSceneId = cfg?.nextSceneId || null;
      this.emit('sceneGoalsCompleted', { sceneId, nextSceneId });
    }

    return true;
  }

  isGoalCompleted(sceneId, goalId) {
    return !!(this.state.goals[sceneId] && this.state.goals[sceneId][goalId]);
  }

  isSceneCompleted(sceneId) {
    const cfg = sceneConfig.scenes[sceneId];
    const goalsList = cfg?.goals || [];
    if (goalsList.length === 0) return false;
    return goalsList.every((g) => this.isGoalCompleted(sceneId, g.id));
  }

  getSceneGoalsProgress(sceneId) {
    const cfg = sceneConfig.scenes[sceneId];
    const goalsList = cfg?.goals || [];
    const completedCount = goalsList.filter((g) => this.isGoalCompleted(sceneId, g.id)).length;
    return {
      total: goalsList.length,
      completed: completedCount,
      goals: goalsList.map((g) => ({
        id: g.id,
        text: g.text,
        completed: this.isGoalCompleted(sceneId, g.id),
      })),
    };
  }

  // --- Reset Storage & State ---
  async wipeStorage() {
    await storageService.clear();
    this.state = this.getDefaultState();
    this.emit('inventoryChanged', this.state.inventory);
    this.emit('playerChanged', this.state.player);
    this.emit('goalChanged', { reset: true });
    this.emit('storyChanged', { reset: true, story: this.state.story });
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
