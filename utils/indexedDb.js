const DB_NAME = "coffee-mvp-db";
const STORE_NAME = "zustand-store";
const DB_VERSION = 1;

let dbPromise;

const isBrowser = typeof window !== "undefined";

const openDatabase = () => {
  if (!isBrowser) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
};

const getStore = async (mode) => {
  const db = await openDatabase();
  if (!db) return null;
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
};

export const indexedDbStorage = {
  getItem: async (key) => {
    if (!isBrowser) return null;
    const store = await getStore("readonly");
    if (!store) return null;

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  },
  setItem: async (key, value) => {
    if (!isBrowser) return;
    const store = await getStore("readwrite");
    if (!store) return;

    await new Promise((resolve, reject) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  removeItem: async (key) => {
    if (!isBrowser) return;
    const store = await getStore("readwrite");
    if (!store) return;

    await new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};

export const resetIndexedDb = () => {
  if (!isBrowser) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      dbPromise = null;
      resolve();
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};
