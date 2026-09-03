/**
 * Core ECS World implementation for Crash Camp.
 * Strictly separates component data from system behavior.
 */

export class World {
  constructor() {
    this.nextEntityId = 1;
    this.entities = new Set();
    // componentName -> Map(entityId -> componentData)
    this.components = new Map();
    this.systems = [];
    this.eventListeners = new Map();
  }

  createEntity() {
    const id = this.nextEntityId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(entityId) {
    if (!this.entities.has(entityId)) return;
    this.emit('entityDestroyed', entityId);
    for (const store of this.components.values()) {
      store.delete(entityId);
    }
    this.entities.delete(entityId);
  }

  addComponent(entityId, componentName, data = {}) {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map());
    }
    this.components.get(componentName).set(entityId, data);
    return data;
  }

  getComponent(entityId, componentName) {
    const store = this.components.get(componentName);
    return store ? store.get(entityId) : null;
  }

  hasComponent(entityId, componentName) {
    const store = this.components.get(componentName);
    return store ? store.has(entityId) : false;
  }

  removeComponent(entityId, componentName) {
    const store = this.components.get(componentName);
    if (store) {
      store.delete(entityId);
    }
  }

  /**
   * Returns array of entity IDs that possess ALL specified component names.
   */
  query(...componentNames) {
    if (componentNames.length === 0) return Array.from(this.entities);

    // Find the smallest store to optimize intersection
    let smallestStore = null;
    let smallestSize = Infinity;

    for (const name of componentNames) {
      const store = this.components.get(name);
      if (!store || store.size === 0) return [];
      if (store.size < smallestSize) {
        smallestSize = store.size;
        smallestStore = store;
      }
    }

    const matches = [];
    for (const entityId of smallestStore.keys()) {
      let hasAll = true;
      for (const name of componentNames) {
        const store = this.components.get(name);
        if (!store || !store.has(entityId)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) matches.push(entityId);
    }

    return matches;
  }

  addSystem(system) {
    this.systems.push(system);
    if (typeof system.init === 'function') {
      system.init(this);
    }
  }

  update(dt) {
    for (const system of this.systems) {
      if (typeof system.update === 'function') {
        system.update(this, dt);
      }
    }
  }

  // Event bus helper for decoupling systems
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        cb(data);
      }
    }
  }

  clear() {
    for (const id of Array.from(this.entities)) {
      this.destroyEntity(id);
    }
    this.entities.clear();
    this.components.clear();
    this.nextEntityId = 1;
  }
}
