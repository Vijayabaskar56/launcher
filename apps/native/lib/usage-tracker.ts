import { storage } from "@/lib/storage";

const USAGE_KEY = "search-usage-counts";

export const getUsageCounts = (): Record<string, number> => {
  const raw = storage.getString(USAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const recordLaunch = (itemId: string): void => {
  const counts = getUsageCounts();
  counts[itemId] = (counts[itemId] ?? 0) + 1;
  storage.set(USAGE_KEY, JSON.stringify(counts));
};

export const getMaxUsage = (counts: Record<string, number>): number => {
  const values = Object.values(counts);
  if (values.length === 0) {
    return 0;
  }
  return Math.max(...values);
};
