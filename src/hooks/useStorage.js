const hasWindow = typeof window !== "undefined";
const inMemoryStorage = {};

export function safeParseJSON(value, fallback) {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function storageGet(key) {
  try {
    if (hasWindow && window.storage && typeof window.storage.get === "function") {
      const value = await window.storage.get(key);
      if (typeof value === "string") return value;
      if (value == null) return null;
      return JSON.stringify(value);
    }

    if (hasWindow && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // fall through to in-memory storage
  }

  return Object.prototype.hasOwnProperty.call(inMemoryStorage, key) ? inMemoryStorage[key] : null;
}

export async function storageSet(key, value) {
  try {
    if (hasWindow && window.storage && typeof window.storage.set === "function") {
      await window.storage.set(key, value);
      return true;
    }

    if (hasWindow && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {
    // fall through to in-memory storage
  }

  inMemoryStorage[key] = value;
  return false;
}

export async function storageDelete(key) {
  try {
    if (hasWindow && window.storage && typeof window.storage.delete === "function") {
      await window.storage.delete(key);
      return true;
    }

    if (hasWindow && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch {
    // fall through to in-memory storage
  }

  delete inMemoryStorage[key];
  return false;
}

export async function storageKeys(prefix = "") {
  try {
    if (hasWindow && window.storage && typeof window.storage.keys === "function") {
      const keys = await window.storage.keys();
      return Array.isArray(keys) ? keys.filter((key) => key.startsWith(prefix)) : [];
    }

    if (hasWindow && window.localStorage) {
      const keys = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    }
  } catch {
    // fall through to in-memory storage
  }

  return Object.keys(inMemoryStorage).filter((key) => key.startsWith(prefix));
}
