import { createMMKV } from "react-native-mmkv";

import { DEFAULT_SETTINGS } from "@/types/settings";
import type { LauncherSettingsData } from "@/types/settings";

const SETTINGS_KEY = "launcher-settings";
const SCHEMA_VERSION_KEY = "settings-schema-version";
const CURRENT_SCHEMA_VERSION = 2;
const LEGACY_GESTURE_DEFAULTS = {
  doubleTap: "lock-screen",
  longPress: "none",
  swipeDown: "notifications",
  swipeLeft: "none",
  swipeRight: "none",
  swipeUp: "app-drawer",
} as const;

export const storage = createMMKV({ id: "settings" });

export const setSettings = (settings: LauncherSettingsData): void => {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
  storage.set(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
};

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

const hasLegacyGestureDefaults = (
  gestures?: Partial<LauncherSettingsData["gestures"]>
): boolean => {
  if (!gestures) {
    return false;
  }

  return (
    gestures.doubleTap === LEGACY_GESTURE_DEFAULTS.doubleTap &&
    gestures.longPress === LEGACY_GESTURE_DEFAULTS.longPress &&
    gestures.swipeDown === LEGACY_GESTURE_DEFAULTS.swipeDown &&
    gestures.swipeLeft === LEGACY_GESTURE_DEFAULTS.swipeLeft &&
    gestures.swipeRight === LEGACY_GESTURE_DEFAULTS.swipeRight &&
    gestures.swipeUp === LEGACY_GESTURE_DEFAULTS.swipeUp &&
    Object.keys(gestures.launchAppBindings ?? {}).length === 0
  );
};

export const getSettings = (): LauncherSettingsData => {
  const raw = storage.getString(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const schemaVersion = storage.getNumber(SCHEMA_VERSION_KEY) ?? 0;
    const parsed = JSON.parse(raw) as Partial<LauncherSettingsData>;
    const merged = mergeWithDefaults(parsed);

    if (
      schemaVersion < CURRENT_SCHEMA_VERSION &&
      hasLegacyGestureDefaults(parsed.gestures)
    ) {
      const migrated = {
        ...merged,
        gestures: {
          ...merged.gestures,
          swipeDown: DEFAULT_SETTINGS.gestures.swipeDown,
          swipeLeft: DEFAULT_SETTINGS.gestures.swipeLeft,
          swipeRight: DEFAULT_SETTINGS.gestures.swipeRight,
          swipeUp: DEFAULT_SETTINGS.gestures.swipeUp,
        },
      };
      setSettings(migrated);
      return migrated;
    }

    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
};
