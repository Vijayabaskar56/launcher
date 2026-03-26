import { storage } from "./storage";

const ICON_CACHE_KEY = "icon-cache";

/**
 * MMKV-backed icon cache. Stores base64 URI strings keyed by packageName.
 * Each value is a ready-to-use `data:image/png;base64,...` URI.
 */

export const getIconCache = (): Record<string, string> => {
  const raw = storage.getString(ICON_CACHE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
};

export const setIconCache = (cache: Record<string, string>): void => {
  storage.set(ICON_CACHE_KEY, JSON.stringify(cache));
};

export const getCachedIcon = (packageName: string): string | null => {
  const cache = getIconCache();
  return cache[packageName] ?? null;
};

export const setCachedIcon = (packageName: string, base64Uri: string): void => {
  const cache = getIconCache();
  cache[packageName] = base64Uri;
  setIconCache(cache);
};

export const removeCachedIcons = (packageNames: string[]): void => {
  const cache = getIconCache();
  const toRemove = new Set(packageNames);
  const updated = Object.fromEntries(
    Object.entries(cache).filter(([key]) => !toRemove.has(key))
  );
  setIconCache(updated);
};

/**
 * Sync icon cache with current app list.
 * Adds new icons, removes uninstalled ones.
 * Returns the updated cache.
 */
export const syncIconCache = (
  apps: { packageName: string; icon: string | null }[]
): Record<string, string> => {
  const cache = getIconCache();
  const currentPackages = new Set(apps.map((a) => a.packageName));

  // Remove uninstalled apps
  const filtered = Object.fromEntries(
    Object.entries(cache).filter(([pkg]) => currentPackages.has(pkg))
  );

  // Add new icons
  for (const app of apps) {
    if (app.icon && !filtered[app.packageName]) {
      filtered[app.packageName] = app.icon;
    }
  }

  setIconCache(filtered);
  return filtered;
};
