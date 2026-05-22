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
