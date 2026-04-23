import { createContext, useCallback, useMemo, useState } from "react";

import { useThemeSync } from "@/hooks/use-theme-sync";
import { getSettings, setSettings } from "@/lib/storage";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type {
  DebugSettings,
  GestureSettings,
  HomescreenSettings,
  IconSettings,
  IntegrationSettings,
  LauncherSettingsData,
  LocaleSettings,
  SearchSettings,
  ThemeSettings,
} from "@/types/settings";

interface SettingsActions {
  updateAppearance: (updates: Partial<ThemeSettings>) => void;
  updateHomescreen: (updates: Partial<HomescreenSettings>) => void;
  updateIcons: (updates: Partial<IconSettings>) => void;
  updateSearch: (updates: Partial<SearchSettings>) => void;
  updateGestures: (updates: Partial<GestureSettings>) => void;
  updateIntegrations: (updates: Partial<IntegrationSettings>) => void;
  updateLocale: (updates: Partial<LocaleSettings>) => void;
  updateDebug: (updates: Partial<DebugSettings>) => void;
  resetAll: () => void;
  replaceAll: (settings: LauncherSettingsData) => void;
}

interface SettingsContextValue {
  state: LauncherSettingsData;
  actions: SettingsActions;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, setState] = useState<LauncherSettingsData>(() => getSettings());

  const persist = useCallback(
    (updater: (current: LauncherSettingsData) => LauncherSettingsData) => {
      setState((current) => {
        const next = updater(current);
        setSettings(next);
        return next;
      });
    },
    []
  );

  const updateAppearance = useCallback(
    (updates: Partial<ThemeSettings>) => {
      persist((current) => ({
        ...current,
        appearance: { ...current.appearance, ...updates },
      }));
    },
    [persist]
  );

  const updateHomescreen = useCallback(
    (updates: Partial<HomescreenSettings>) => {
      persist((current) => ({
        ...current,
        homescreen: { ...current.homescreen, ...updates },
      }));
    },
    [persist]
  );

  const updateIcons = useCallback(
    (updates: Partial<IconSettings>) => {
      persist((current) => ({
        ...current,
        icons: { ...current.icons, ...updates },
      }));
    },
    [persist]
  );

  const updateSearch = useCallback(
    (updates: Partial<SearchSettings>) => {
      persist((current) => ({
        ...current,
        search: { ...current.search, ...updates },
      }));
    },
    [persist]
  );

  const updateGestures = useCallback(
    (updates: Partial<GestureSettings>) => {
      persist((current) => ({
        ...current,
        gestures: { ...current.gestures, ...updates },
      }));
    },
    [persist]
  );

  const updateIntegrations = useCallback(
    (updates: Partial<IntegrationSettings>) => {
      persist((current) => ({
        ...current,
        integrations: { ...current.integrations, ...updates },
      }));
    },
    [persist]
  );

  const updateLocale = useCallback(
    (updates: Partial<LocaleSettings>) => {
      persist((current) => ({
        ...current,
        locale: { ...current.locale, ...updates },
      }));
    },
    [persist]
  );

  const updateDebug = useCallback(
    (updates: Partial<DebugSettings>) => {
      persist((current) => ({
        ...current,
        debug: { ...current.debug, ...updates },
      }));
    },
    [persist]
  );

  const resetAll = useCallback(() => {
    persist(() => DEFAULT_SETTINGS);
  }, [persist]);

  const replaceAll = useCallback(
    (settings: LauncherSettingsData) => {
      persist(() => settings);
    },
    [persist]
  );

  // Apply Uniwind theme whenever preset or color scheme changes
  useThemeSync(state.appearance.themePreset, state.appearance.colorScheme);

  const value = useMemo(
    () => ({
      actions: {
        replaceAll,
        resetAll,
        updateAppearance,
        updateDebug,
        updateGestures,
        updateHomescreen,
        updateIcons,
        updateIntegrations,
        updateLocale,
        updateSearch,
      },
      state,
    }),
    [
      state,
      updateAppearance,
      updateHomescreen,
      updateIcons,
      updateSearch,
      updateGestures,
      updateIntegrations,
      updateLocale,
      updateDebug,
      resetAll,
      replaceAll,
    ]
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
};
