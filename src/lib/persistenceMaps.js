import { safeParseJSON, storageGet, storageKeys, storageSet } from "../hooks/useStorage";

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0));
}

async function migrateBooleanMap(prefix, legacyKey) {
  if (!legacyKey) return {};

  const legacyRaw = await storageGet(legacyKey);
  const legacyMap = safeParseJSON(legacyRaw, {});
  if (!legacyMap || typeof legacyMap !== "object") return {};

  const next = {};
  const writes = [];
  Object.entries(legacyMap).forEach(([key, value]) => {
    if (value) {
      next[key] = true;
      writes.push(storageSet(`${prefix}${key}`, "1"));
    }
  });
  await Promise.all(writes);
  return next;
}

async function migrateNumberMap(prefix, legacyKey) {
  if (!legacyKey) return {};

  const legacyRaw = await storageGet(legacyKey);
  const legacyMap = safeParseJSON(legacyRaw, {});
  if (!legacyMap || typeof legacyMap !== "object") return {};

  const next = {};
  const writes = [];
  Object.entries(legacyMap).forEach(([key, score]) => {
    const value = Number(score);
    if (Number.isFinite(value)) {
      next[key] = value;
      writes.push(storageSet(`${prefix}${key}`, JSON.stringify(value)));
    }
  });
  await Promise.all(writes);
  return next;
}

async function loadCurrentJsonCollection(prefix, normalize) {
  const keys = await storageKeys(prefix);
  if (keys.length === 0) return null;

  const loaded = await Promise.all(
    keys.map(async (key) => {
      const raw = await storageGet(key);
      const entry = safeParseJSON(raw, null);
      if (!entry || typeof entry !== "object") return null;
      return normalize({
        ...entry,
        id: entry.id || key.slice(prefix.length),
      });
    })
  );

  return sortByCreatedAtDesc(loaded.filter(Boolean));
}

async function migrateLegacyJsonCollection(prefix, legacyKeys, normalize) {
  const legacyRawValues = await Promise.all(legacyKeys.map((key) => storageGet(key)));
  const legacyRaw = legacyRawValues.find((value) => value);
  const legacyEntries = safeParseJSON(legacyRaw, []);
  if (!Array.isArray(legacyEntries)) return [];

  const next = legacyEntries.map((entry) => normalize(entry)).filter(Boolean);
  await Promise.all(next.map((entry) => storageSet(`${prefix}${entry.id}`, JSON.stringify(entry))));
  return sortByCreatedAtDesc(next);
}

export async function loadBooleanMap(prefix, legacyKey) {
  const keys = await storageKeys(prefix);
  if (keys.length > 0) {
    return keys.reduce((map, key) => {
      map[key.slice(prefix.length)] = true;
      return map;
    }, {});
  }

  return migrateBooleanMap(prefix, legacyKey);
}

export async function loadNumberMap(prefix, legacyKey) {
  const keys = await storageKeys(prefix);
  if (keys.length > 0) {
    const map = {};
    await Promise.all(
      keys.map(async (key) => {
        const raw = await storageGet(key);
        const value = Number(safeParseJSON(raw, raw));
        if (Number.isFinite(value)) {
          map[key.slice(prefix.length)] = value;
        }
      })
    );
    return map;
  }

  return migrateNumberMap(prefix, legacyKey);
}

export async function loadJsonCollection(prefix, normalize, legacyKeys = []) {
  const current = await loadCurrentJsonCollection(prefix, normalize);
  if (current) return current;
  return migrateLegacyJsonCollection(prefix, legacyKeys, normalize);
}
