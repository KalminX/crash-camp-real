/**
 * StorageService — Dual-layer persistence engine using LocalStorage and IndexedDB.
 *
 * Architecture:
 * - LocalStorage: Instant synchronous access on boot, preventing frame drops or async layout flash.
 * - IndexedDB: Durable asynchronous structured storage for long-term saves.
 */

const DB_NAME = 'CrashCampDB';
const DB_VERSION = 1;
const STORE_NAME = 'gameState';
const KEY_NAME = 'mainState';
const LS_KEY = 'crash_camp_save_v1';

export class StorageService {
  constructor() {
    this.db = null;
    this.dbPromise = this.initIndexedDB();
  }

  initIndexedDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (err) => {
          console.warn('[StorageService] IndexedDB open error, falling back to LocalStorage:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('[StorageService] IndexedDB exception:', err);
        resolve(null);
      }
    });
  }

  /**
   * Synchronously loads saved state from LocalStorage for instantaneous boot.
   */
  loadSync() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[StorageService] Error reading LocalStorage:', err);
    }
    return null;
  }

  /**
   * Saves game state to both LocalStorage (synchronous) and IndexedDB (asynchronous).
   */
  async save(state) {
    if (typeof window === 'undefined' || !state) return;

    // 1. Synchronous LocalStorage write
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[StorageService] Error writing LocalStorage:', err);
    }

    // 2. Asynchronous IndexedDB write
    try {
      const db = this.db || (await this.dbPromise);
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(state, KEY_NAME);
      }
    } catch (err) {
      console.warn('[StorageService] Error writing IndexedDB:', err);
    }
  }

  /**
   * Clears both LocalStorage and IndexedDB saves.
   */
  async clear() {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(LS_KEY);
    } catch (err) {
      console.warn('[StorageService] Error clearing LocalStorage:', err);
    }

    try {
      const db = this.db || (await this.dbPromise);
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
    } catch (err) {
      console.warn('[StorageService] Error clearing IndexedDB:', err);
    }
  }
}

export const storageService = new StorageService();
