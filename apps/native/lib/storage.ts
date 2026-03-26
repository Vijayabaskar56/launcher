import { createMMKV } from "react-native-mmkv";

import { DEFAULT_SETTINGS } from "@/types/settings";
import type { LauncherSettingsData } from "@/types/settings";

const SETTINGS_KEY = "launcher-settings";
const SCHEMA_VERSION_KEY = "settings-schema-version";
const CURRENT_SCHEMA_VERSION = 1;

export const storage = createMMKV({ id: "settings" });

const mergeWithDefaults = (
  partial: Partial<LauncherSettingsData>
): LauncherSettingsData => ({
  appearance: { ...DEFAULT_SETTINGS.appearance, ...partial.appearance },
  debug: { ...DEFAULT_SETTINGS.debug, ...partial.debug },
  gestures: { ...DEFAULT_SETTINGS.gestures, ...partial.gestures },
  homescreen: { ...DEFAULT_SETTINGS.homescreen, ...partial.homescreen },
  icons: { ...DEFAULT_SETTINGS.icons, ...partial.icons },
  integrations: {
    ...DEFAULT_SETTINGS.integrations,
    ...partial.integrations,
  },
  locale: { ...DEFAULT_SETTINGS.locale, ...partial.locale },
  search: { ...DEFAULT_SETTINGS.search, ...partial.search },
});

export const getSettings = (): LauncherSettingsData => {
  const raw = storage.getString(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LauncherSettingsData>;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const setSettings = (settings: LauncherSettingsData): void => {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
  storage.set(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
};

export const updateSettings = (
  updater: (current: LauncherSettingsData) => LauncherSettingsData
): LauncherSettingsData => {
  const current = getSettings();
  const next = updater(current);
  setSettings(next);
  return next;
};
